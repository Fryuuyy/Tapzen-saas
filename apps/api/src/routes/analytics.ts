import { Router, Response } from "express";
import { prisma } from "../db";
import { authenticateToken, AuthRequest } from "../auth";
const router = Router();
router.use(authenticateToken);
router.get(["/","/summary"], async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const deviceId = typeof req.query.deviceId === "string" ? req.query.deviceId : undefined;
    const period = String(req.query.period || "week");
    const now = new Date();
    const start = new Date(now);
    if (period === "day") start.setHours(0,0,0,0);
    else if (period === "month") start.setDate(1), start.setHours(0,0,0,0);
    else if (period === "all") start.setTime(0);
    else start.setDate(start.getDate()-6), start.setHours(0,0,0,0);
    const deviceWhere = { organizationId, ...(branchId ? { branchId } : {}), ...(deviceId ? { id: deviceId } : {}) };
    const devices = await prisma.device.findMany({ where: deviceWhere, select: { id: true, label: true } });
    const ids = devices.map(d => d.id);
    const scans = ids.length ? await prisma.scanEvent.findMany({ where: { deviceId: { in: ids }, createdAt: { gte: start } }, orderBy: { createdAt: "asc" } }) : [];
    const totalScans = scans.length;
    const uniqueVisitors = new Set(scans.filter(s => s.ipHash).map(s => s.ipHash)).size;
    const counts: Record<string, number> = {};
    for (const scan of scans) {
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).format(scan.createdAt);
      counts[date] = (counts[date] || 0) + 1;
    }
    const feedbackCount = await prisma.feedback.count({ where: { organizationId, createdAt: { gte: start } } });
    const recentEvents = ids.length ? await prisma.scanEvent.findMany({ where: { deviceId: { in: ids } }, include: { device: { select: { label: true, source: true } } }, orderBy: { createdAt: "desc" }, take: 10 }) : [];
    const nfcCount = scans.filter(s => s.source === "NFC").length;
    const qrCount = scans.filter(s => s.source === "QR").length;
    const directCount = scans.filter(s => s.source === "DIRECT").length;
    return res.json({
      summary: { scans: totalScans, totalScans, uniqueVisitors, repeatScans: Math.max(0,totalScans-uniqueVisitors), devicesCount: devices.length, feedbackCount, nfcCount, qrCount, directCount },
      totalScans, uniqueVisitors, repeatScans: Math.max(0,totalScans-uniqueVisitors), nfcCount, qrCount, directCount,
      scansByDate: Object.entries(counts).map(([date,count]) => ({ date,count })),
      recent: recentEvents, recentEvents
    });
  } catch (error) { console.error("Analytics failed", error); return res.status(500).json({ error: "ANALYTICS_FAILED" }); }
});
export default router;
