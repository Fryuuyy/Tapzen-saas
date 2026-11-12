import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authenticateToken, AuthRequest, requireRole } from "../auth";
const router = Router();
router.get("/public/:slug", async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { slug: req.params.slug }, select: {
    id: true, slug: true, title: true, description: true, locale: true, links: true, isActive: true, isPublished: true,
    whatsapp: true, instagram: true, telegram: true, twogis: true, menuUrl: true,
    organization: { select: { name: true } }, branch: { select: { name: true, address: true } }
  }});
  if (!profile || !profile.isActive || !profile.isPublished) return res.status(404).json({ error: "PROFILE_NOT_FOUND" });
  const { isActive, isPublished, ...publicProfile } = profile;
  return res.json({ profile: publicProfile });
});
router.use(authenticateToken);
router.get("/", async (req: AuthRequest, res: Response) => {
  const profiles = await prisma.profile.findMany({ where: { organizationId: req.user!.organizationId }, include: { branch: true }, orderBy: { createdAt: "desc" } });
  return res.json({ profiles });
});
router.post("/", requireRole("SUPER_ADMIN","OWNER","MANAGER"), async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ title: z.string().trim().min(1).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80), description: z.string().max(1000).optional(), branchId: z.string().uuid().nullable().optional(), whatsapp: z.string().max(100).optional(), instagram: z.string().max(200).optional(), telegram: z.string().max(200).optional(), twogis: z.string().max(500).optional(), menuUrl: z.string().url().optional(), links: z.array(z.object({ label: z.string().max(60), url: z.string().url().max(2048) })).max(20).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  const organizationId = req.user!.organizationId;
  if (parsed.data.branchId && !(await prisma.branch.findFirst({ where: { id: parsed.data.branchId, organizationId } }))) return res.status(400).json({ error: "INVALID_BRANCH" });
  try {
    const profile = await prisma.profile.create({ data: { ...parsed.data, organizationId, branchId: parsed.data.branchId || null } });
    return res.status(201).json({ profile });
  } catch { return res.status(409).json({ error: "PROFILE_SLUG_TAKEN" }); }
});
router.patch("/:id", requireRole("SUPER_ADMIN","OWNER","MANAGER"), async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ title: z.string().trim().min(1).max(120).optional(), description: z.string().max(1000).nullable().optional(), isActive: z.boolean().optional(), isPublished: z.boolean().optional(), whatsapp: z.string().max(100).nullable().optional(), instagram: z.string().max(200).nullable().optional(), telegram: z.string().max(200).nullable().optional(), twogis: z.string().max(500).nullable().optional(), menuUrl: z.string().url().nullable().optional(), links: z.array(z.object({ label: z.string().max(60), url: z.string().url() })).max(20).optional() }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const existing = await prisma.profile.findFirst({ where: { id: req.params.id, organizationId: req.user!.organizationId } });
  if (!existing) return res.status(404).json({ error: "PROFILE_NOT_FOUND" });
  const profile = await prisma.profile.update({ where: { id: existing.id }, data: parsed.data });
  return res.json({ profile });
});
export default router;
