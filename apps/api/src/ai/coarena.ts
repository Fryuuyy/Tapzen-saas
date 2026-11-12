import { z } from "zod";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
const responseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.union([z.string(), z.array(z.any())]) })
  })).min(1),
  model: z.string().optional()
});

export async function coarenaChat(messages: ChatMessage[]) {
  if (process.env.COARENA_TERMS_ACCEPTED_BY_OWNER !== "true") throw new Error("COARENA_TERMS_NOT_ACCEPTED");
  const apiKey = process.env.COARENA_API_KEY;
  if (!apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const baseUrl = (process.env.COARENA_BASE_URL || "https://coarena.ai/api/v1").replace(/\/$/, "");
  const model = process.env.COARENA_MODEL || "gemini-4-argon";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, max_tokens: 4096 }),
      signal: controller.signal
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) {
      const code = raw?.error?.code || raw?.error?.type || "COARENA_REQUEST_FAILED";
      const err = new Error(String(code));
      (err as Error & { status?: number; detail?: string }).status = response.status;
      (err as Error & { status?: number; detail?: string }).detail = String(raw?.error?.message || "Provider request failed").slice(0, 500);
      throw err;
    }
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) throw new Error("COARENA_INVALID_RESPONSE");
    const content = parsed.data.choices[0].message.content;
    const answer = typeof content === "string" ? content : content.map((x:any) => x.text || "").join("\n");
    return { answer, model: parsed.data.model || model };
  } finally {
    clearTimeout(timeout);
  }
}
