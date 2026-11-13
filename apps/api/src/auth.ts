import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { prisma } from "./db";
import { normalizePhone, sendPhoneCode, verifyPhoneCode, signPhoneProof, readPhoneProof } from "./phone-verification";

const router = require("express").Router();
const otpSendLimit = rateLimit({ windowMs: 10 * 60_000, limit: 3, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "OTP_RATE_LIMITED" } });
const otpCheckLimit = rateLimit({ windowMs: 10 * 60_000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "OTP_CHECK_RATE_LIMITED" } });

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
    if (error instanceof Error && error.message === "JWT_SECRET_NOT_CONFIGURED") return res.status(503).json({ error: "SERVER_AUTH_CONFIGURATION_ERROR" });
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}
export const requireRole = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "FORBIDDEN" });
  next();
};

router.post("/phone/send", otpSendLimit, async (req: Request, res: Response) => {
  const parsed = z.object({ phone: z.string().min(8).max(20) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_PHONE" });
  try {
    const phone = normalizePhone(parsed.data.phone);
    await sendPhoneCode(phone);
    return res.json({ success: true, message: "OTP_SENT" });
  } catch (error) {
    const code = error instanceof Error ? error.message : "SMS_SEND_FAILED";
    if (code === "INVALID_PHONE") return res.status(400).json({ error: code });
    if (code === "SMS_PROVIDER_NOT_CONFIGURED") return res.status(503).json({ error: code });
    console.error("Phone OTP send failed", code);
    return res.status(502).json({ error: "SMS_SEND_FAILED" });
  }
});

router.post("/phone/verify", otpCheckLimit, async (req: Request, res: Response) => {
  const parsed = z.object({ phone: z.string().min(8).max(20), code: z.string().regex(/^\d{4,10}$/) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_OTP_REQUEST" });
  try {
    const phone = normalizePhone(parsed.data.phone);
    const approved = await verifyPhoneCode(phone, parsed.data.code);
    if (!approved) return res.status(401).json({ error: "INVALID_OR_EXPIRED_CODE" });
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.json({ verified: true, registrationRequired: true, verificationToken: signPhoneProof(phone) });
    return res.json({
      verified: true,
      registrationRequired: false,
      token: signToken(user.id),
      user: { id: user.id, phone: user.phone, name: user.name }
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PHONE_VERIFICATION_FAILED";
    if (code === "INVALID_PHONE") return res.status(400).json({ error: code });
    if (code === "SMS_PROVIDER_NOT_CONFIGURED") return res.status(503).json({ error: code });
    if (code === "JWT_SECRET_NOT_CONFIGURED") return res.status(503).json({ error: "SERVER_AUTH_CONFIGURATION_ERROR" });
    console.error("Phone OTP verification failed", code);
    return res.status(502).json({ error: "PHONE_VERIFICATION_FAILED" });
  }
});

router.post("/phone/register", async (req: Request, res: Response) => {
  const parsed = z.object({
    verificationToken: z.string().min(20).max(2048),
    name: z.string().trim().min(2).max(100),
    organizationName: z.string().trim().min(2).max(120).optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const phone = readPhoneProof(parsed.data.verificationToken);
  if (!phone) return res.status(401).json({ error: "PHONE_VERIFICATION_EXPIRED" });
  try {
    secret();
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ error: "PHONE_ALREADY_REGISTERED" });
    const slugBase = (parsed.data.organizationName || parsed.data.name).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "business";
    const slug = `${slugBase}-${crypto.randomBytes(3).toString("hex")}`;
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { phone, name: parsed.data.name } });
      const organization = await tx.organization.create({ data: { name: parsed.data.organizationName || `${parsed.data.name} business`, slug } });
      await tx.membership.create({ data: { userId: user.id, organizationId: organization.id, role: "OWNER" } });
      return { user, organization };
    });
    return res.status(201).json({ token: signToken(result.user.id), user: { id: result.user.id, phone: result.user.phone, name: result.user.name }, organization: result.organization });
  } catch (error) {
    console.error("Phone registration failed", error);
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") return res.status(409).json({ error: "PHONE_OR_ORGANIZATION_ALREADY_EXISTS" });
    if (error instanceof Error && error.message.includes("JWT_SECRET")) return res.status(503).json({ error: "SERVER_AUTH_CONFIGURATION_ERROR" });
    return res.status(500).json({ error: "REGISTRATION_FAILED" });
  }
});

// Existing email/password users keep access and can attach a verified phone without losing their workspace.
router.post("/phone/link", authenticateToken, async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ verificationToken: z.string().min(20).max(2048) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const phone = readPhoneProof(parsed.data.verificationToken);
  if (!phone) return res.status(401).json({ error: "PHONE_VERIFICATION_EXPIRED" });
  try {
    const conflict = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (conflict && conflict.id !== req.userId) return res.status(409).json({ error: "PHONE_ALREADY_LINKED" });
    const user = await prisma.user.update({ where: { id: req.userId }, data: { phone }, select: { id: true, email: true, phone: true, name: true } });
    return res.json({ success: true, user });
  } catch (error) {
    console.error("Phone linking failed", error);
    return res.status(500).json({ error: "PHONE_LINK_FAILED" });
  }
});

// Legacy login remains available temporarily so existing customers can sign in and link a phone.
router.post("/login", async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  return res.json({ token: signToken(user.id), user: { id: user.id, email: user.email, phone: user.phone, name: user.name } });
});

router.post("/register", async (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email().max(254), name: z.string().trim().min(2).max(100), password: z.string().min(10).max(128), organizationName: z.string().trim().min(2).max(120).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try {
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
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") return res.status(409).json({ error: "EMAIL_OR_ORGANIZATION_ALREADY_EXISTS" });
    if (error instanceof Error && error.message.includes("JWT_SECRET")) return res.status(503).json({ error: "SERVER_AUTH_CONFIGURATION_ERROR" });
    return res.status(500).json({ error: "REGISTRATION_FAILED" });
  }
});

router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true, phone: true, name: true, locale: true, memberships: { include: { organization: true } } } });
  return res.json({ user });
});
export default router;
