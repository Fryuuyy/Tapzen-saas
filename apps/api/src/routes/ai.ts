import { Router, Response } from "express";
import multer from "multer";
import pdf from "pdf-parse";
import { z } from "zod";
import { authenticateToken, AuthRequest } from "../auth";
import { openaiChat, ChatMessage } from "../ai/openai";
import { prisma } from "../db";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf" || !file.originalname.toLowerCase().endsWith(".pdf")) return cb(new Error("PDF_ONLY"));
    cb(null, true);
  }
});
router.use(authenticateToken);

const systemPrompt = `Ты — TAPZEN AI, интеллектуальный помощник для владельцев и сотрудников бизнеса в Казахстане.
Отвечай на языке пользователя (қазақша, русский или English). Давай практичные, точные ответы.
Не выдумывай данные компании, цены, аналитику или факты. Если информации недостаточно — скажи об этом.
Не запрашивай пароли, API-ключи, банковские данные или государственные идентификаторы.
Для юридических, финансовых и медицинских вопросов указывай, что ответ не заменяет консультацию профильного специалиста.`;

router.post("/chat", async (req: AuthRequest, res: Response) => {
  const parsed = z.object({
    messages: z.array(z.object({ role: z.enum(["user","assistant"]), content: z.string().trim().min(1).max(12000) })).min(1).max(30)
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  const total = parsed.data.messages.reduce((n,m)=>n+m.content.length,0);
  if (total > 30000) return res.status(413).json({ error: "CONVERSATION_TOO_LONG" });
  try {
    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...parsed.data.messages];
    const result = await openaiChat(messages);
    return res.json({ answer: result.answer, model: result.model });
  } catch (error) {
    const e = error as Error & { status?: number; detail?: string };
    console.error("TAPZEN AI chat failed:", e.message);
    if (e.message === "OPENAI_TERMS_NOT_ACCEPTED") return res.status(403).json({ error: "OPENAI_TERMS_NOT_ACCEPTED", message: "Владелец аккаунта должен лично принять текущие условия OpenAI API и затем включить OPENAI_TERMS_ACCEPTED_BY_OWNER=true." });
    if (e.message === "AI_PROVIDER_NOT_CONFIGURED") return res.status(503).json({ error: "AI_NOT_CONFIGURED", message: "Добавьте OPENAI_API_KEY в серверный .env" });
    if (e.status === 429) return res.status(429).json({ error: "AI_RATE_LIMIT", message: "Лимит OpenAI API достигнут. Попробуйте позже." });
    if (e.status === 401 || e.status === 403) return res.status(502).json({ error: "AI_PROVIDER_AUTH_ERROR", message: "OpenAI отклонил API-ключ или доступ к модели. Проверьте настройки проекта и API-ключ." });
    if (e.name === "AbortError") return res.status(504).json({ error: "AI_TIMEOUT" });
    return res.status(502).json({ error: "AI_PROVIDER_ERROR", message: "Не удалось получить ответ от AI-провайдера." });
  }
});

/**
 * Only aggregate, tenant-scoped operational metrics are sent to OpenAI.
 * No customer names, contacts, free-text feedback, raw IPs or device identifiers leave TAPZEN.
 */
router.post("/business-insights", async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ period: z.enum(["day","week","month"]).default("week") }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const orgId = req.user!.organizationId;
  const start = new Date();
  if (parsed.data.period === "day") start.setHours(0,0,0,0);
  else if (parsed.data.period === "month") start.setDate(1), start.setHours(0,0,0,0);
  else start.setDate(start.getDate()-6), start.setHours(0,0,0,0);
  try {
    const devices = await prisma.device.findMany({ where: { organizationId: orgId }, select: { id: true, isActive: true, type: true } });
    const ids = devices.map(d => d.id);
    const scans = ids.length ? await prisma.scanEvent.findMany({ where: { deviceId: { in: ids }, createdAt: { gte: start } }, select: { source: true, createdAt: true } }) : [];
    const feedback = await prisma.feedback.groupBy({ by: ["status"], where: { organizationId: orgId, createdAt: { gte: start } }, _count: { _all: true } });
    const dayCounts: Record<string,number> = {};
    for (const scan of scans) {
      const day = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Almaty",year:"numeric",month:"2-digit",day:"2-digit"}).format(scan.createdAt);
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    const uniqueDays = Object.keys(dayCounts).length;
    const payload = {
      period: parsed.data.period,
      from: start.toISOString(),
      to: new Date().toISOString(),
      devices: { total: devices.length, active: devices.filter(d=>d.isActive).length, inactive: devices.filter(d=>!d.isActive).length, byType: { nfc: devices.filter(d=>d.type==="NFC").length, qr: devices.filter(d=>d.type==="QR").length, link: devices.filter(d=>d.type==="LINK").length } },
      scans: { total: scans.length, averagePerActiveDay: uniqueDays ? Number((scans.length/uniqueDays).toFixed(2)) : 0, bySource: { nfc: scans.filter(s=>s.source==="NFC").length, qr: scans.filter(s=>s.source==="QR").length, direct: scans.filter(s=>s.source==="DIRECT").length }, byDay: dayCounts },
      feedback: feedback.reduce((a,row)=>({ ...a, [row.status.toLowerCase()]: row._count._all }),{} as Record<string,number>)
    };
    const result = await openaiChat([
      { role: "system", content: systemPrompt + "\nТы аналитик малого бизнеса. Используй только переданные агрегаты. Не делай причинных выводов без данных. Отделяй наблюдения от гипотез. Дай: 1) краткий вывод, 2) 3-5 наблюдений с цифрами, 3) до 5 конкретных действий на следующую неделю, 4) какие данные ещё нужны. Если данных мало — честно скажи." },
      { role: "user", content: `Проанализируй агрегированную статистику TAPZEN за период. Это обезличенные показатели, без клиентских персональных данных:\n${JSON.stringify(payload)}` }
    ]);
    return res.json({ answer: result.answer, model: result.model, period: parsed.data.period, metrics: payload });
  } catch (error) {
    const e = error as Error & { status?: number };
    console.error("TAPZEN business insights failed:", e.message);
    if (e.message === "OPENAI_TERMS_NOT_ACCEPTED") return res.status(403).json({ error: "OPENAI_TERMS_NOT_ACCEPTED", message: "Владелец аккаунта должен лично принять текущие условия OpenAI API и затем включить OPENAI_TERMS_ACCEPTED_BY_OWNER=true." });
    if (e.message === "AI_PROVIDER_NOT_CONFIGURED") return res.status(503).json({ error: "AI_NOT_CONFIGURED" });
    if (e.status === 429) return res.status(429).json({ error: "AI_RATE_LIMIT" });
    return res.status(502).json({ error: "AI_INSIGHTS_FAILED" });
  }
});

router.post("/pdf/analyze", upload.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "PDF_REQUIRED" });
  try {
    const parsedPdf = await pdf(req.file.buffer);
    const extracted = String(parsedPdf.text || "").replace(/\u0000/g, "").trim();
    if (!extracted) return res.status(422).json({ error: "PDF_TEXT_NOT_FOUND", message: "В PDF нет извлекаемого текста. Возможно, это скан." });
    if (extracted.length > 50000) return res.status(413).json({ error: "PDF_TEXT_TOO_LONG", message: "Пока поддерживаются PDF до 50 000 символов текста." });
    const prompt = `Проанализируй документ ниже. Сначала дай краткое резюме, затем ключевые факты, даты и суммы (если есть), задачи/сроки, риски и вопросы, требующие уточнения. Не добавляй сведения, которых нет в документе.\n\nДОКУМЕНТ:\n${extracted}`;
    const result = await openaiChat([{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]);
    return res.json({ answer: result.answer, model: result.model, fileName: req.file.originalname, pages: parsedPdf.numpages, extractedCharacters: extracted.length });
  } catch (error) {
    const e = error as Error & { status?: number };
    console.error("TAPZEN PDF analysis failed:", e.message);
    if (e.message === "OPENAI_TERMS_NOT_ACCEPTED") return res.status(403).json({ error: "OPENAI_TERMS_NOT_ACCEPTED", message: "Владелец аккаунта должен лично принять текущие условия OpenAI API и затем включить OPENAI_TERMS_ACCEPTED_BY_OWNER=true." });
    if (e.message === "AI_PROVIDER_NOT_CONFIGURED") return res.status(503).json({ error: "AI_NOT_CONFIGURED" });
    if (e.status === 429) return res.status(429).json({ error: "AI_RATE_LIMIT" });
    return res.status(502).json({ error: "PDF_ANALYSIS_FAILED", message: "Не удалось обработать документ." });
  }
});
export default router;
