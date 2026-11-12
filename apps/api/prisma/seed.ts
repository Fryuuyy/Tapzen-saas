import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
const prisma = new PrismaClient();
async function main() {
  const email = "demo@tapzen.kz";
  const passwordHash = await bcrypt.hash("TapzenDemo2026!", 12);
  const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email, name: "TAPZEN Demo", passwordHash, locale: "ru" } });
  const org = await prisma.organization.upsert({ where: { slug: "demo-business" }, update: {}, create: { name: "Demo Coffee", slug: "demo-business" } });
  await prisma.membership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: org.id } }, update: {}, create: { userId: user.id, organizationId: org.id, role: "OWNER" } });
  const branch = await prisma.branch.upsert({ where: { id: "demo-branch-kokshetau" }, update: {}, create: { id: "demo-branch-kokshetau", organizationId: org.id, name: "Кокшетау", address: "Кокшетау, Казахстан" } });
  const profile = await prisma.profile.upsert({ where: { slug: "demo-coffee" }, update: {}, create: { organizationId: org.id, branchId: branch.id, slug: "demo-coffee", title: "Demo Coffee", description: "Цифровая страница демонстрационного заведения", links: [{ label: "WhatsApp", url: "https://wa.me/77000000000" }, { label: "Instagram", url: "https://instagram.com/" }] } });
  await prisma.device.upsert({ where: { slug: "demo-nfc" }, update: {}, create: { organizationId: org.id, branchId: branch.id, profileId: profile.id, slug: "demo-nfc", token: crypto.randomBytes(16).toString("hex"), label: "Демонстрационная NFC-табличка", type: "NFC", source: "NFC" } });
  console.log("Seed complete. Login: demo@tapzen.kz / TapzenDemo2026!");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
