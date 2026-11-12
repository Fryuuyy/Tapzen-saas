import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db";

const router = require("express").Router();
const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
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
    const user = await prisma.user.findUnique({ where: { id: String(payload.sub) }, select: { id: true } });
    if (!user) return res.status(401).json({ error: "INVALID_TOKEN" });
    req.userId = user.id;

    const requestedOrg = String(req.headers["x-organization-id"] || req.query.organizationId || req.body?.organizationId || "");
    const membership = requestedOrg
      ? await prisma.membership.findFirst({ where: { userId: user.id, organizationId: requestedOrg } })
      : await prisma.membership.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    if (!membership) return res.status(403).json({ error: "ORGANIZATION_ACCESS_DENIED" });
    req.user = { id: user.id, organizationId: membership.organizationId, role: membership.role };
    next();
  } catch (error) {
    if (error instanceof Error && error.message.includes("JWT_SECRET")) return res.status(500).json({ error: "SERVER_AUTH_CONFIGURATION_ERROR" });
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}
export const requireRole = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "FORBIDDEN" });
  next();
};

router.post("/register", async (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email().max(254), name: z.string().trim().min(2).max(100), password: z.string().min(10).max(128), organizationName: z.string().trim().min(2).max(120).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try {
    // Validate auth configuration before writing anything to the database.
    // Otherwise a missing/short JWT_SECRET could create the account and then fail
    // while signing the response token, leaving the user unable to retry signup.
    secret();
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "EMAIL_ALREADY_REGISTERED" });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const slug = `${(parsed.data.organizationName || parsed.data.name).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "business"}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { email, name: parsed.data.name, passwordHash } });
      const organization = await tx.organization.create({ data: { name: parsed.data.organizationName || `${parsed.data.name} business`, slug } });
      await tx.membership.create({ data: { userId: user.id, organizationId: organization.id, role: "OWNER" } });
      return { user, organization };
    });
    return res.status(201).json({ token: signToken(result.user.id), user: { id: result.user.id, email: result.user.email, name: result.user.name }, organization: result.organization });
  } catch (error) {
    console.error("Registration failed", error);
    // A concurrent signup can win the unique-email or unique-slug race.
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return res.status(409).json({ error: "EMAIL_OR_ORGANIZATION_ALREADY_EXISTS" });
    }
    if (error instanceof Error && error.message.includes("JWT_SECRET")) {
      return res.status(500).json({ error: "SERVER_AUTH_CONFIGURATION_ERROR" });
    }
    return res.status(500).json({ error: "REGISTRATION_FAILED" });
  }
});
router.post("/login", async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  return res.json({ token: signToken(user.id), user: { id: user.id, email: user.email, name: user.name } });
});
router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true, name: true, locale: true, memberships: { include: { organization: true } } } });
  return res.json({ user });
});
export default router;
