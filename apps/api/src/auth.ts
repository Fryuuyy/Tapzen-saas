import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db";

const router = require("express").Router();
const secret = () => {
  const value = process.env.JWT_SECRET?.trim();
  if (!value || Buffer.byteLength(value, "utf8") < 32) throw new Error("JWT_SECRET_NOT_CONFIGURED");
  return value;
};
export type AuthUser = { id: string; organizationId: string; role: string };
export type AuthRequest = Request & { userId?: string; user?: AuthUser };
export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: "7d", issuer: "tapzen-api", audience: "tapzen-web" });
}
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "UNAUTHORIZED" });
    const payload = jwt.verify(header.slice(7), secret(), { issuer: "tapzen-api", audience: "tapzen-web" }) as jwt.JwtPayload;
    if (!payload.sub) return res.status(401).json({ error: "INVALID_TOKEN" });
    const user = await prisma.user.findUnique({ where: { id: String(payload.sub) }, select: { id: true, email: true } });
    if (!user) return res.status(401).json({ error: "INVALID_TOKEN" });
    req.userId = user.id;

    const requestedOrg = String(req.headers["x-organization-id"] || req.query.organizationId || req.body?.organizationId || "");
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { email, name: parsed.data.name, passwordHash } });
      const organization = await tx.organization.create({ data: { name: parsed.data.organizationName || `${parsed.data.name} business`, slug } });
      await tx.membership.create({ data: { userId: user.id, organizationId: organization.id, role: "OWNER" } });
      return { user, organization };
    });
    return res.status(201).json({
      token: signToken(result.user.id),
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      organization: result.organization
    });
  } catch (error) {
    console.error("Registration failed", error);
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return res.status(409).json({ error: "EMAIL_OR_ORGANIZATION_ALREADY_EXISTS" });
    }
    if (error instanceof Error && error.message.includes("JWT_SECRET")) return res.status(503).json({ error: "SERVER_AUTH_CONFIGURATION_ERROR" });
    return res.status(500).json({ error: "REGISTRATION_FAILED" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    return res.json({
      token: signToken(user.id),
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "JWT_SECRET_NOT_CONFIGURED") {
      return res.status(503).json({ error: "SERVER_AUTH_CONFIGURATION_ERROR" });
    }
    console.error("Login failed", error);
    return res.status(500).json({ error: "LOGIN_FAILED" });
  }
});

router.post("/founder-bootstrap", authenticateToken, async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ setupKey: z.string().min(32).max(256) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const configuredEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  const configuredKey = process.env.FOUNDER_SETUP_KEY;
  if (!configuredEmail || !configuredKey) return res.status(503).json({ error: "FOUNDER_SETUP_NOT_CONFIGURED" });
  const current = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true } });
  if (!current || current.email?.toLowerCase() !== configuredEmail) return res.status(403).json({ error: "FOUNDER_EMAIL_MISMATCH" });
  if (parsed.data.setupKey !== configuredKey) return res.status(403).json({ error: "INVALID_FOUNDER_SETUP_KEY" });
  try {
    await prisma.$transaction(async tx => {
      const existing = await tx.membership.findFirst({ where: { role: "SUPER_ADMIN", NOT: { userId: current.id } } });
      if (existing) throw new Error("FOUNDER_ALREADY_CLAIMED");
      const organization = await tx.organization.upsert({ where: { slug: "tapzen-platform" }, update: {}, create: { name: "TAPZEN Platform", slug: "tapzen-platform" } });
      await tx.membership.upsert({
        where: { userId_organizationId: { userId: current.id, organizationId: organization.id } },
        update: { role: "SUPER_ADMIN" },
        create: { userId: current.id, organizationId: organization.id, role: "SUPER_ADMIN" }
      });
    });
    return res.json({ success: true, role: "SUPER_ADMIN" });
  } catch (error) {
    if (error instanceof Error && error.message === "FOUNDER_ALREADY_CLAIMED") return res.status(409).json({ error: error.message });
    console.error("Founder bootstrap failed", error);
    return res.status(500).json({ error: "FOUNDER_SETUP_FAILED" });
  }
});

router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, locale: true, memberships: { include: { organization: true } } }
  });
  return res.json({ user });
});

export default router;
