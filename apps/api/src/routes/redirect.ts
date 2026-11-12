import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db";
const router = Router();
const validExternal = (value: string | null): value is string => {
  if (!value) return false;
  try { const u = new URL(value); return ["http:", "https:", "tel:", "mailto:"].includes(u.protocol); } catch { return false; }
};
function getSource(req: Request): "NFC" | "QR" | "DIRECT" {
  const raw = req.query.source;
  if (typeof raw === "string" && ["NFC","QR","DIRECT"].includes(raw.toUpperCase())) return raw.toUpperCase() as "NFC"|"QR"|"DIRECT";
  // Do not infer QR vs NFC from User-Agent: browser headers cannot reliably distinguish them.
  return "DIRECT";
}
function hashVisitor(req: Request) {
  const forwarded = req.ip || req.socket.remoteAddress || "unknown";
  const ua = String(req.headers["user-agent"] || "unknown").slice(0, 255);
  const salt = process.env.ANALYTICS_HASH_SECRET || process.env.JWT_SECRET || "development-only-change-me";
  return crypto.createHmac("sha256", salt).update(`${forwarded}|${ua}`).digest("hex");
}
router.get("/:token", async (req: Request, res: Response) => {
  try {
    if (!/^[a-f0-9]{32,128}$/i.test(req.params.token)) return res.status(404).send("TAPZEN device not found or inactive");
    const device = await prisma.device.findUnique({ where: { token: req.params.token }, include: { profile: { select: { slug: true, isActive: true, isPublished: true } } } });
    if (!device || !device.isActive) return res.status(404).send("TAPZEN device not found or inactive");
    const source = getSource(req);
    const ipHash = hashVisitor(req);
    void prisma.scanEvent.create({ data: { deviceId: device.id, source, ipHash, userAgent: String(req.headers["user-agent"] || "").slice(0,255), referer: String(req.headers.referer || "").slice(0,2048) } }).catch(e => console.error("Scan event write failed", e));
    if (device.profile?.isActive && device.profile.isPublished) return res.redirect(302, `${(process.env.WEB_ORIGIN || "http://localhost:3000").split(",")[0]}/p/${encodeURIComponent(device.profile.slug)}`);
    if (validExternal(device.destinationUrl)) return res.redirect(302, device.destinationUrl);
    return res.status(404).send("TAPZEN destination is not configured");
  } catch (error) { console.error("Redirect failed", error); return res.status(500).send("Internal server error"); }
});
export default router;
