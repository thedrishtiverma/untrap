// UNTRAP AI Service Layer (server-only).
// Loads versioned prompts from DB, renders templates, calls Lovable AI.
import { callLovableAI, callLovableAIJSON, type ChatMsg } from "./ai-gateway.server";
import type { SupabaseClient } from "@supabase/supabase-js";

type SB = SupabaseClient<any, any, any>;

export interface PromptRow {
  name: string;
  prompt_template: string;
  model: string;
  temperature: number | null;
  response_format: "text" | "json_object";
}

// --- prompt loader (memoized per request via tiny cache) ---
const cache = new Map<string, { row: PromptRow; at: number }>();
const TTL_MS = 60_000;

export async function loadPrompt(supabase: SB, name: string): Promise<PromptRow> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.row;
  const { data, error } = await supabase
    .from("ai_prompts")
    .select("name,prompt_template,model,temperature,response_format")
    .eq("name", name).eq("active", true)
    .order("version", { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw new Error(`Prompt load failed (${name}): ${error.message}`);
  if (!data) throw new Error(`Prompt not found: ${name}`);
  const row = data as PromptRow;
  cache.set(name, { row, at: Date.now() });
  return row;
}

export function renderTemplate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    if (v === undefined || v === null) return "null";
    return typeof v === "string" ? v : JSON.stringify(v);
  });
}

export async function runPrompt<T = unknown>(
  supabase: SB,
  name: string,
  vars: Record<string, unknown>,
  systemOverride?: string,
): Promise<T> {
  const prompt = await loadPrompt(supabase, name);
  const rendered = renderTemplate(prompt.prompt_template, vars);
  const messages: ChatMsg[] = [
    { role: "system", content: systemOverride ?? "You are a precise assistant." },
    { role: "user", content: rendered },
  ];
  const opts = {
    model: prompt.model,
    messages,
    temperature: prompt.temperature ?? undefined,
  };
  if (prompt.response_format === "json_object") {
    return (await callLovableAIJSON<T>(opts)) as T;
  }
  return (await callLovableAI(opts)) as unknown as T;
}

// --- memory retrieval ---
export async function getRelevantMemories(supabase: SB, userId: string, limit = 12) {
  const { data } = await supabase
    .from("student_memories")
    .select("memory_type,content,importance,created_at")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function saveMemories(
  supabase: SB,
  userId: string,
  items: { memory_type: string; content: string; importance: number }[],
  source: string,
) {
  if (!items?.length) return;
  await supabase.from("student_memories").insert(
    items
      .filter((m) => m.content?.trim())
      .map((m) => ({
        user_id: userId,
        memory_type: m.memory_type,
        content: m.content.trim(),
        importance: Math.min(5, Math.max(1, m.importance ?? 3)),
        source,
      })),
  );
}
