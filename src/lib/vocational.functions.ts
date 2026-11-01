import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callLovableAIJSON } from "./ai-gateway.server";

/**
 * Neutral AI facilitation for a family concern (Family Decision Room).
 * Grounding rule: Saarthi may only explain using verified facts supplied from
 * the database below; it must state uncertainty where evidence is missing and
 * never invent outcomes, wages, placement figures or reassurance.
 */
const FacilitateInput = z.object({
  decisionId: z.string().uuid(),
  concernId: z.string().uuid(),
  language: z.enum(["en", "hi"]).default("en"),
});

interface FacilitationShape {
  understanding: string;
  evidence: string[];
  alternatives: string[];
  uncertainty: string;
}

export const facilitateConcern = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FacilitateInput.parse(d))
  .handler(async ({ data, context }) => {
    // RLS on vocational_concerns / decisions guarantees the caller is a
    // member of this decision room; non-members get zero rows.
    const { data: concern, error: cErr } = await context.supabase
      .from("vocational_concerns")
      .select("id, concern_category, concern_text")
      .eq("id", data.concernId)
      .maybeSingle();
    if (cErr) { console.error("[vocational] concern read failed", cErr.message); throw new Error("Something went wrong. Please try again."); }
    if (!concern) throw new Error("You do not have access to this decision room.");

    // Verified evidence for the trade in question (RLS filters unverified).
    const { data: decision } = await context.supabase
      .from("vocational_decisions")
      .select("id, shortlisted_trade_ids")
      .eq("id", data.decisionId)
      .maybeSingle();
    if (!decision) throw new Error("You do not have access to this decision room.");

    let tradeContext = "No specific trade shortlisted yet.";
    const tradeId = decision.shortlisted_trade_ids?.[0];
    if (tradeId) {
      const [{ data: trade }, { data: metrics }, { data: progression }] = await Promise.all([
        context.supabase.from("vocational_trades").select("name, description, training_duration, safety_information, work_environment").eq("id", tradeId).maybeSingle(),
        context.supabase.from("vocational_outcome_metrics").select("label, value_text, metric_type, last_updated").eq("trade_id", tradeId).eq("verification_status", "verified"),
        context.supabase.from("vocational_progression_pathways").select("stage, explanation, order_index").eq("trade_id", tradeId).order("order_index"),
      ]);
      if (trade) {
        tradeContext = [
          `Trade: ${trade.name}`,
          `What it involves: ${trade.description}`,
          `Training: ${trade.training_duration}`,
          `Safety: ${trade.safety_information ?? "not recorded"}`,
          `Work settings: ${trade.work_environment ?? "not recorded"}`,
          `Verified outcome metrics: ${metrics?.length ? metrics.map((m) => `${m.label}: ${m.value_text} (updated ${m.last_updated})`).join("; ") : "NONE AVAILABLE"}`,
          `Progression stages: ${progression?.map((p) => p.stage).join(" → ") || "not recorded"}`,
        ].join("\n");
      }
    }

    const langLine = data.language === "hi"
      ? "Reply in simple Hindi using Devanagari script."
      : "Reply in simple English, avoid jargon.";

    const system = `You are Saarthi, a NEUTRAL family decision facilitator for vocational career choices in India. You help learners and parents understand each other — you never push a side, never claim a trade is good or bad, and never fabricate facts.
HARD RULE: use ONLY the verified facts provided. If evidence is missing, say so plainly and suggest what to verify or a counsellor conversation. Do not invent wages, placements, demand or reassurance. Output ONLY valid JSON. ${langLine}`;

    const prompt = `A family member raised this concern in the decision room.
Concern category: ${concern.concern_category}
Concern: ${concern.concern_text}

Verified data layer:
${tradeContext}

Return JSON with this exact shape:
{
  "understanding": "2-3 sentences acknowledging the concern neutrally, for BOTH learner and parent",
  "evidence": ["only what the verified data above supports, 1-3 items; if none, one item saying verified data is unavailable and what could be checked instead"],
  "alternatives": ["1-3 neutral alternative pathways or next information steps"],
  "uncertainty": "one honest sentence about what is not known yet"
}`;

    const result = await callLovableAIJSON<FacilitationShape>({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const payload = {
      understanding: result.understanding,
      evidence: result.evidence,
      alternatives: result.alternatives,
      uncertainty: result.uncertainty,
      generated_at: new Date().toISOString(),
    };

    const { error: upErr } = await context.supabase
      .from("vocational_concerns")
      .update({ ai_response: payload })
      .eq("id", data.concernId);
    if (upErr) { console.error("[vocational] facilitation persist failed", upErr.message); throw new Error("Something went wrong. Please try again."); }

    return payload;
  });
