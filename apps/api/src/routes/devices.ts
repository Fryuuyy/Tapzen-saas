import { Router, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../db";
import { authenticateToken, AuthRequest, requireRole } from "../auth";
const router = Router();
const destinationSchema = z.string().url().max(2048).refine(v => ["http:", "https:"].includes(new URL(v).protocol), "Only http/https destinations are allowed");
router.use(authenticateToken);

router.get("/", async (req: AuthRequest, res: Response) => {
  const devices = await prisma.device.findMany({ where: { organizationId: req.user!.organizationId }, include: { branch: true, profile: true }, orderBy: { createdAt: "desc" } });
  return res.json({ devices });
});
router.post("/", requireRole("SUPER_ADMIN", "OWNER", "MANAGER"), async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ label: z.string().trim().min(1).max(120), type: z.enum(["NFC","QR","LINK"]).default("NFC"), source: z.enum(["NFC","QR","DIRECT"]).optional(), branchId: z.string().uuid().nullable().optional(), profileId: z.string().uuid().nullable().optional(), destinationUrl: destinationSchema.nullable().optional() }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  const orgId = req.user!.organizationId;
  if (parsed.data.branchId && !(await prisma.branch.findFirst({ where: { id: parsed.data.branchId, organizationId: orgId } }))) return res.status(400).json({ error: "INVALID_BRANCH" });
  if (parsed.data.profileId && !(await prisma.profile.findFirst({ where: { id: parsed.data.profileId, organizationId: orgId } }))) return res.status(400).json({ error: "INVALID_PROFILE" });
  const token = crypto.randomBytes(32).toString("hex");
  const slug = `device-${crypto.randomBytes(16).toString("hex")}`;
  const device = await prisma.device.create({ data: { ...parsed.data, label: parsed.data.label, organizationId: orgId, token, slug, source: parsed.data.source || (parsed.data.type === "QR" ? "QR" : "NFC") } });
  const apiBase = (process.env.PUBLIC_API_URL || "https://tapzen-saas.onrender.com").replace(/\/+$/, "");
  return res.status(201).json({ device, redirectUrl: `${apiBase}/r/${token}` });
});
router.patch("/:id", requireRole("SUPER_ADMIN", "OWNER", "MANAGER"), async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ label: z.string().trim().min(1).max(120).optional(), type: z.enum(["NFC","QR","LINK"]).optional(), branchId: z.string().uuid().nullable().optional(), profileId: z.string().uuid().nullable().optional(), destinationUrl: destinationSchema.nullable().optional(), isActive: z.boolean().optional() }).strict().refine(value => Object.keys(value).length > 0, "At least one field is required").safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const orgId = req.user!.organizationId, id = req.params.id;
  const current = await prisma.device.findFirst({ where: { id, organizationId: orgId } });
  if (!current) return res.status(404).json({ error: "DEVICE_NOT_FOUND" });
  if (parsed.data.branchId && !(await prisma.branch.findFirst({ where: { id: parsed.data.branchId, organizationId: orgId } }))) return res.status(400).json({ error: "INVALID_BRANCH" });
  if (parsed.data.profileId && !(await prisma.profile.findFirst({ where: { id: parsed.data.profileId, organizationId: orgId } }))) return res.status(400).json({ error: "INVALID_PROFILE" });
  const device = await prisma.device.update({ where: { id }, data: parsed.data });
  return res.json({ device });
});
router.post("/:id/rotate-token", requireRole("SUPER_ADMIN","OWNER","MANAGER"), async (req: AuthRequest, res: Response) => {
  const device = await prisma.device.findFirst({ where: { id: req.params.id, organizationId: req.user!.organizationId } });
  if (!device) return res.status(404).json({ error: "DEVICE_NOT_FOUND" });
  const token = crypto.randomBytes(32).toString("hex");
  const updated = await prisma.device.update({ where: { id: device.id }, data: { token } });
  const apiBase = (process.env.PUBLIC_API_URL || "https://tapzen-saas.onrender.com").replace(/\/+$/, "");
  return res.json({ device: updated, redirectUrl: `${apiBase}/r/${token}` });
});
router.delete("/:id", requireRole("SUPER_ADMIN","OWNER"), async (req: AuthRequest, res: Response) => {
  const device = await prisma.device.findFirst({ where: { id: req.params.id, organizationId: req.user!.organizationId } });
  if (!device) return res.status(404).json({ error: "DEVICE_NOT_FOUND" });
  await prisma.device.delete({ where: { id: device.id } });
  return res.json({ success: true });
});
export default router;
