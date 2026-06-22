// UNTRAP Moat Intelligence — Student Intelligence Graph scoring engine.
// Infers 15 "invisible force" signals from a student's existing data:
// onboarding profile, assessment responses, Saarthi chats, memories, matches.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callLovableAIJSON, callLovableAI } from "./ai-gateway.server";

// Decision style enum mirrors the DB type.
const DecisionStyle = z.enum(["explorer", "analyzer", "executor", "avoider"]);

const MoatProfileSchema = z.object({
  family_dynamics_score: z.number().int().min(0).max(100),
  family_value_orientation: z.string(),
  family_insight: z.string(),
  friend_circle_score: z.number().int().min(0).max(100),
  ambition_density: z.enum(["low", "medium", "high"]),
  friend_circle_insight: z.string(),
  exposure_score: z.number().int().min(0).max(100),
  exposure_insight: z.string(),
  childhood_pattern_tags: z.array(z.string()).max(8),
  energy_profile: z.object({
    energizers: z.array(z.string()).max(6),
    drainers: z.array(z.string()).max(6),
  }),
  decision_style: DecisionStyle,
  fear_profile: z
    .array(
      z.object({
        fear: z.string(),
        intensity: z.number().int().min(1).max(5),
        evidence: z.string(),
      }),
    )
    .max(6),
  primary_fear: z.string(),
  identity_gap_score: z.number().int().min(0).max(100),
  current_identity: z.string(),
  desired_identity: z.string(),
  identity_bridge: z.string(),
  reality_constraints: z.object({
    financial: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    education: z.string().optional().nullable(),
    language: z.string().optional().nullable(),
    family: z.string().optional().nullable(),
    time: z.string().optional().nullable(),
  }),
  life_story_summary: z.string(),
  environment_upgrade_actions: z
    .array(z.object({ area: z.string(), action: z.string() }))
    .max(6),
  confidence_score: z.number().int().min(0).max(100),
  signal_gaps: z
    .array(
      z.object({
        moat: z.string(),
        why: z.string(),
        follow_up_question: z.string(),
      }),
    )
    .max(6),
});

export type MoatProfile = z.infer<typeof MoatProfileSchema>;

export const generateMoatProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: responses }, { data: matches }, { data: history }, { data: memories }] =
      await Promise.all([
        context.supabase.from("student_profiles").select("*").eq("user_id", context.userId).maybeSingle(),
        context.supabase.from("assessment_responses").select("question_id,response,score").eq("user_id", context.userId),
        context.supabase.from("career_matches").select("career_name,match_percentage,why_it_matches,skill_gap").eq("user_id", context.userId),
        context.supabase
          .from("ai_chat_history")
          .select("user_message,ai_response,created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(20),
        context.supabase
          .from("student_memories")
          .select("memory_type,content,importance")
          .eq("user_id", context.userId)
          .order("importance", { ascending: false })
          .limit(20),
      ]);

    if (!profile) throw new Error("Complete onboarding before generating moat profile.");

    const system = `You are the UNTRAP Student Intelligence Graph engine. You analyze the human system behind an Indian student's career decisions and infer 15 "invisible force" signals.

You DO NOT give career advice here. You only infer signals from evidence the student already provided. Be honest about uncertainty — set confidence_score lower and add signal_gaps for moats with weak evidence (so Saarthi can ask follow-up questions later).

Tier 2/3 Indian context matters: family security pressure, exposure gaps, financial constraints are real, not flaws.

Output ONLY valid JSON matching the requested schema. No prose.`;

    const prompt = `Student onboarding profile:
${JSON.stringify(profile)}

Assessment responses:
${JSON.stringify(responses ?? [])}

Top career matches so far:
${JSON.stringify(matches ?? [])}

Recent Saarthi chat exchanges (newest first, may be empty):
${JSON.stringify(history ?? [])}

Long-term memories about the student:
${JSON.stringify(memories ?? [])}

Infer the student's moat profile. Return EXACTLY this JSON shape:
{
  "family_dynamics_score": 0-100,                 // higher = more aligned with student's dream
  "family_value_orientation": "security|status|money|freedom|respect|mixed",
  "family_insight": "1-2 sentences, framed as understanding (not blame)",
  "friend_circle_score": 0-100,                   // higher = more ambitious/exposed circle
  "ambition_density": "low|medium|high",
  "friend_circle_insight": "1-2 sentences",
  "exposure_score": 0-100,                        // higher = more career awareness
  "exposure_insight": "1-2 sentences naming the gap",
  "childhood_pattern_tags": ["builder","explainer","organizer","creator","experimenter","explorer", ...],
  "energy_profile": { "energizers": ["..."], "drainers": ["..."] },
  "decision_style": "explorer|analyzer|executor|avoider",
  "fear_profile": [{"fear":"failure|judgment|money_loss|disappointing_parents|being_average|starting_late|...","intensity":1-5,"evidence":"why you inferred this"}],
  "primary_fear": "single dominant fear in plain words",
  "identity_gap_score": 0-100,                    // higher = bigger gap between current and desired self
  "current_identity": "e.g. 'Safe Follower'",
  "desired_identity": "e.g. 'Independent Creator'",
  "identity_bridge": "1 sentence on what bridges the gap",
  "reality_constraints": {
    "financial": "or null", "location": "or null", "education": "or null",
    "language": "or null", "family": "or null", "time": "or null"
  },
  "life_story_summary": "3-4 sentences narrative of who this student is becoming",
  "environment_upgrade_actions": [{"area":"friends|exposure|family|learning","action":"specific, realistic"}],
  "confidence_score": 0-100,                      // your overall confidence in this profile
  "signal_gaps": [{"moat":"family|friends|exposure|childhood|energy|decision|fear|identity|reality|story","why":"what's missing","follow_up_question":"a single warm question Saarthi can ask"}]
}

Rules:
- Never blame family or friends. Reframe constraints as systems, not flaws.
- If evidence is thin for a moat, lower its score's certainty by listing it in signal_gaps with a follow_up_question.
- Use Indian context (Tier 2/3 reality) for reality_constraints.
- Keep insights short, specific, no motivational fluff.`;

    const inferred = await callLovableAIJSON<unknown>({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const parsed = MoatProfileSchema.parse(inferred);

    // Upsert
    const row = {
      user_id: context.userId,
      family_dynamics_score: parsed.family_dynamics_score,
      family_value_orientation: parsed.family_value_orientation,
      family_insight: parsed.family_insight,
      friend_circle_score: parsed.friend_circle_score,
      ambition_density: parsed.ambition_density,
      friend_circle_insight: parsed.friend_circle_insight,
      exposure_score: parsed.exposure_score,
      exposure_insight: parsed.exposure_insight,
      childhood_pattern_tags: parsed.childhood_pattern_tags,
      energy_profile: parsed.energy_profile,
      decision_style: parsed.decision_style,
      fear_profile: parsed.fear_profile,
      primary_fear: parsed.primary_fear,
      identity_gap_score: parsed.identity_gap_score,
      current_identity: parsed.current_identity,
      desired_identity: parsed.desired_identity,
      identity_bridge: parsed.identity_bridge,
      reality_constraints: parsed.reality_constraints,
      life_story_summary: parsed.life_story_summary,
      environment_upgrade_actions: parsed.environment_upgrade_actions,
      confidence_score: parsed.confidence_score,
      signal_gaps: parsed.signal_gaps,
      last_inferred_at: new Date().toISOString(),
    };

    const { error } = await context.supabase
      .from("student_moat_profile")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);

    await context.supabase.from("analytics_events").insert({
      user_id: context.userId,
      event_name: "moat_profile_generated",
      properties: { confidence: parsed.confidence_score, gaps: parsed.signal_gaps.length },
    });

    return { profile: parsed };
  });

// Saarthi-side helper: when the student answers a signal_gap follow-up, store the
// answer as a memory and clear that gap. The next moat regen will fold it in.
export const answerMoatGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ moat: z.string(), question: z.string(), answer: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Save as a high-importance memory.
    await context.supabase.from("student_memories").insert({
      user_id: context.userId,
      memory_type: `moat_${data.moat}`,
      content: `Q: ${data.question}\nA: ${data.answer}`,
      importance: 5,
      source: "moat_followup",
    });

    // Drop the gap from the profile.
    const { data: existing } = await context.supabase
      .from("student_moat_profile")
      .select("signal_gaps")
      .eq("user_id", context.userId)
      .maybeSingle();
    const gaps = ((existing?.signal_gaps as Array<{ moat: string }> | null) ?? []).filter(
      (g) => g.moat !== data.moat,
    );
    await context.supabase
      .from("student_moat_profile")
      .update({ signal_gaps: gaps })
      .eq("user_id", context.userId);

    return { ok: true, remaining_gaps: gaps.length };
  });

// Quick sanity helper used by Saarthi to summarize the moat for an LLM prompt.
export function moatToSaarthiContext(p: Record<string, unknown> | null): string {
  if (!p) return "MOAT: not yet generated";
  return [
    `family: ${p.family_dynamics_score}/100 (${p.family_value_orientation}) — ${p.family_insight}`,
    `friends: ${p.friend_circle_score}/100 (${p.ambition_density} ambition) — ${p.friend_circle_insight}`,
    `exposure: ${p.exposure_score}/100 — ${p.exposure_insight}`,
    `decision_style: ${p.decision_style}`,
    `primary_fear: ${p.primary_fear}`,
    `identity_gap: ${p.identity_gap_score}/100 (${p.current_identity} → ${p.desired_identity})`,
    `reality: ${JSON.stringify(p.reality_constraints)}`,
  ].join("\n");
}

// Suppress unused warning — exported for future use.
void callLovableAI;
