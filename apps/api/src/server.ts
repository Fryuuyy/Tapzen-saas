import express from "express";
import crypto from "crypto";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import authRoutes, { authenticateToken, AuthRequest, requireRole } from "./auth";
import redirectRoutes from "./routes/redirect";
import deviceRoutes from "./routes/devices";
import analyticsRoutes from "./routes/analytics";
import profileRoutes from "./routes/profiles";
import aiRoutes from "./routes/ai";
import { prisma } from "./db";
import { z } from "zod";
dotenv.config();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(helmet());
const allowedOrigins = (process.env.WEB_ORIGIN || "").split(",").map(value => value.trim().replace(/\/$/, "")).filter(Boolean);
const isAllowedOrigin = (origin: string) => {
  if (allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" &&
      (url.hostname === "tapzen-saas.vercel.app" ||
       /^tapzen-saas-[a-z0-9-]+\.vercel\.app$/.test(url.hostname));
  } catch {
    return false;
  }
};
app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error("CORS_ORIGIN_DENIED"));
  },
  credentials: false,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Organization-Id"],
  maxAge: 600
}));
app.use(express.json({ limit: "100kb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api/devices", deviceRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/ai", rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false }), aiRoutes);
app.use("/r", redirectRoutes);

app.get("/api/organizations", authenticateToken, async (req: AuthRequest, res) => {
  const memberships = await prisma.membership.findMany({ where: { userId: req.userId }, include: { organization: true } });
  return res.json({ organizations: memberships.map(m => ({ ...m.organization, role: m.role })) });
});
app.post("/api/organizations", authenticateToken, requireRole("OWNER", "MANAGER", "SUPER_ADMIN"), async (req: AuthRequest, res) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const slugBase = parsed.data.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "business";
  const slug = parsed.data.slug || `${slugBase.slice(0, 45)}-${crypto.randomBytes(4).toString("hex")}`;
  try {
    const org = await prisma.organization.create({ data: { name: parsed.data.name, slug } });
    await prisma.membership.create({ data: { userId: req.userId!, organizationId: org.id, role: "OWNER" } });
    return res.status(201).json({ organization: org });
  } catch { return res.status(409).json({ error: "ORGANIZATION_SLUG_TAKEN" }); }
});
app.get("/api/branches", authenticateToken, async (req: AuthRequest, res) => {
  const branches = await prisma.branch.findMany({ where: { organizationId: req.user!.organizationId }, orderBy: { createdAt: "desc" } });
  return res.json({ branches });
});
app.post("/api/branches", authenticateToken, requireRole("OWNER", "MANAGER", "SUPER_ADMIN"), async (req: AuthRequest, res) => {
  const parsed = z.object({ name: z.string().trim().min(1).max(120), address: z.string().max(300).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const branch = await prisma.branch.create({ data: { ...parsed.data, organizationId: req.user!.organizationId } });
  return res.status(201).json({ branch });
});
app.post("/api/feedback", async (req, res) => {
  const parsed = z.object({ organizationId: z.string().uuid(), branchId: z.string().uuid().optional(), name: z.string().max(100).optional(), contact: z.string().max(200).optional(), message: z.string().trim().min(2).max(3000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
  if (!org) return res.status(404).json({ error: "ORGANIZATION_NOT_FOUND" });
  if (parsed.data.branchId && !(await prisma.branch.findFirst({ where: { id: parsed.data.branchId, organizationId: org.id } }))) return res.status(400).json({ error: "INVALID_BRANCH" });
  const feedback = await prisma.feedback.create({ data: { ...parsed.data, branchId: parsed.data.branchId || null } });
  return res.status(201).json({ success: true, id: feedback.id });
});
app.get("/api/feedback", authenticateToken, async (req: AuthRequest, res) => {
  const feedback = await prisma.feedback.findMany({ where: { organizationId: req.user!.organizationId }, orderBy: { createdAt: "desc" }, take: 100 });
  return res.json({ feedback });
});
// Founder-only platform overview. Every endpoint is protected by the SUPER_ADMIN membership.
const requireFounder = [authenticateToken, requireRole("SUPER_ADMIN")];
app.get("/api/admin/overview", ...requireFounder, async (_req: AuthRequest, res) => {
  const [users, organizations, branches, profiles, devices, scans, feedback, recentUsers, recentScans] = await Promise.all([
    prisma.user.count(), prisma.organization.count(), prisma.branch.count(), prisma.profile.count(),
    prisma.device.count(), prisma.scanEvent.count(), prisma.feedback.count(),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, email: true, name: true, createdAt: true, memberships: { select: { role: true, organization: { select: { name: true } } } } } }),
    prisma.scanEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { device: { select: { label: true, organization: { select: { name: true } } } } } })
  ]);
  return res.json({ totals: { users, organizations, branches, profiles, devices, scans, feedback }, recentUsers, recentScans });
});
app.get("/api/admin/users", ...requireFounder, async (_req: AuthRequest, res) => {
  const rows = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, email: true, phone: true, name: true, locale: true, createdAt: true, memberships: { select: { role: true, organization: { select: { id: true, name: true, slug: true } } } } } });
  return res.json({ users: rows });
});
app.get("/api/admin/organizations", ...requireFounder, async (_req: AuthRequest, res) => {
  const rows = await prisma.organization.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { _count: { select: { memberships: true, branches: true, profiles: true, devices: true, feedback: true } } } });
  return res.json({ organizations: rows });
});
app.get("/api/admin/devices", ...requireFounder, async (_req: AuthRequest, res) => {
  const rows = await prisma.device.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, label: true, slug: true, type: true, source: true, isActive: true, createdAt: true, organization: { select: { name: true } }, branch: { select: { name: true } } } });
  return res.json({ devices: rows });
});
app.get("/health", (_req, res) => res.json({ status: "ok", service: "TAPZEN API", timestamp: new Date().toISOString() }));
app.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Database health check failed", error);
    return res.status(503).json({ status: "error", database: "unavailable" });
  }
});
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error", err);
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});
if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => console.log(`TAPZEN API listening on ${port}`));
}
export default app;
