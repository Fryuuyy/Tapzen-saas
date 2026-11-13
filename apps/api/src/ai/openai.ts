import { z } from "zod";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const responseSchema = z.object({
  output: z.array(z.object({
    type: z.string().optional(),
    content: z.array(z.object({
      type: z.string().optional(),
      text: z.string().optional()
    })).optional()
  })).min(1),
  model: z.string().optional(),
  output_text: z.string().optional()
});

/**
 * Server-side OpenAI Responses API client.
 * OPENAI_API_KEY must only exist in the API service environment.
 */
export async function openaiChat(messages: ChatMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-6-luna";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: messages.map(({ role, content }) => ({ role, content })),
        max_output_tokens: 4096,
        store: false
      }),
      signal: controller.signal
    });

    const raw: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const errorBody = raw as {
        error?: { code?: string; type?: string; message?: string };
      } | null;
      const err = new Error(
        String(errorBody?.error?.code || errorBody?.error?.type || "OPENAI_REQUEST_FAILED")
      ) as Error & { status?: number; detail?: string };
      err.status = response.status;
      err.detail = String(errorBody?.error?.message || "OpenAI request failed").slice(0, 500);
      throw err;
    }

    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) throw new Error("OPENAI_INVALID_RESPONSE");

    const answer = parsed.data.output_text ??
      parsed.data.output
        .filter((item) => item.type === "message" || item.type === undefined)
        .flatMap((item) => item.content ?? [])
        .filter((part) => part.type === "output_text" || part.type === undefined)
        .map((part) => part.text ?? "")
        .join("\n")
        .trim();

    if (!answer) throw new Error("OPENAI_EMPTY_RESPONSE");
    return { answer, model: parsed.data.model || model };
  } finally {
    clearTimeout(timeout);
  }
}
