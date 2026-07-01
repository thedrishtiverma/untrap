// Server-only helper to call Lovable AI Gateway via raw fetch.
// Keeps the bundle small (no AI SDK dep) and is sufficient for our use cases.

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

interface CallOpts {
  model?: string;
  messages: ChatMsg[];
  json?: boolean;
  temperature?: number;
}

export async function callLovableAI({
  model = "google/gemini-3-flash-preview",
  messages,
  json = false,
  temperature,
}: CallOpts): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const body: Record<string, unknown> = { model, messages };
  if (json) body.response_format = { type: "json_object" };
  if (temperature !== undefined) body.temperature = temperature;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in your workspace billing.");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[server] AI gateway error", res.status, txt.slice(0,500)); throw new Error("AI service is temporarily unavailable. Please try again.");
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function callLovableAIJSON<T>(opts: CallOpts): Promise<T> {
  const raw = await callLovableAI({ ...opts, json: true });
  // Tolerate the rare case where the model wraps JSON in ```json fences
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as T;
}
