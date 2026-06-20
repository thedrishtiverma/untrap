// UNTRAP Career Intelligence: matching engine, upgraded report, context-aware Saarthi,
// plus admin-only JSON seeding for the career_profiles database.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callLovableAI, callLovableAIJSON, type ChatMsg } from "./ai-gateway.server";

// ---------------- Types ----------------
interface MatchOut {
  career: string;
  match_score: number;
  why_it_matches: string[];
  skill_gap: string[];
  first_step: string;
}

// ---------------- Career Matching Engine ----------------
// Produces top 5 careers using weighted compatibility:
// Interest 30 / Strength 25 / Personality 20 / Reality 15 / Goals 10.
export const generateCareerMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: responses }, { data: careers }] = await Promise.all([
      context.supabase.from("student_profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("assessment_responses").select("question_id,response,score").eq("user_id", context.userId),
      context.supabase
        .from("career_profiles")
        .select(
          "id,career_name,category,short_description,career_identity,ideal_personality,interest_alignment,strength_alignment,who_should_consider,who_should_avoid,required_skills,financial_barriers,time_commitment,untrap_first_step",
        ),
    ]);

    if (!profile) throw new Error("Complete onboarding first.");
    if (!careers || careers.length === 0) throw new Error("Career database is empty. Seed career profiles first.");

    const system = `You are the UNTRAP Career Matching Engine. You score careers for one Indian student against the UNTRAP Career Intelligence Database.

Scoring rubric (compute internally, return final 0-100 integer):
- Interest match 30%
- Strength match 25%
- Personality match 20%
- Reality compatibility (financial + time + family) 15%
- Future goals 10%

Output ONLY valid JSON. Be honest — do NOT inflate scores.`;

    const prompt = `Student profile:
${JSON.stringify(profile)}

Assessment responses:
${JSON.stringify(responses ?? [])}

Career library (UNTRAP Career Intelligence Database):
${JSON.stringify(careers)}

Score every career, then return the TOP 5 only as:
{"matches":[{
  "career_id":"<uuid from library>",
  "career":"<career_name from library>",
  "match_score":<integer 0-100>,
  "why_it_matches":["3 short, student-specific reasons"],
  "skill_gap":["2-4 specific missing skills"],
  "first_step":"One concrete action they can do this week"
}]}

Be specific to THIS student (mention their actual interests, strengths, constraints). No generic advice.`;

    const out = await callLovableAIJSON<{
      matches: (MatchOut & { career_id?: string })[];
    }>({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const top = (out.matches ?? []).slice(0, 5);

    // Persist
    await context.supabase.from("career_matches").delete().eq("user_id", context.userId);
    if (top.length) {
      const rows = top.map((m) => ({
        user_id: context.userId,
        career_id: m.career_id ?? null,
        career_name: m.career,
        match_percentage: Math.min(100, Math.max(0, Math.round(m.match_score))),
        reasoning: (m.why_it_matches ?? []).join(" • "),
        why_it_matches: m.why_it_matches ?? [],
        skill_gap: m.skill_gap ?? [],
        first_step: m.first_step ?? null,
      }));
      const { error } = await context.supabase.from("career_matches").insert(rows);
      if (error) throw new Error(error.message);
    }

    await context.supabase.from("analytics_events").insert({
      user_id: context.userId,
      event_name: "career_matches_generated",
      properties: { count: top.length },
    });

    return { matches: top };
  });

// ---------------- Upgraded Career Report ----------------
interface UpgradedReport {
  career_identity: { title: string; explanation: string };
  top_matches: {
    career_name: string;
    match_percentage: number;
    why_it_fits: string;
    skills_needed: string[];
    challenges: string[];
  }[];
  current_trap: {
    family_pressure: string;
    financial_constraints: string;
    fear: string;
    confusion: string;
    skill_gaps: string;
  };
  escape_plan: {
    today: string[];
    thirty_days: string[];
    six_months: string[];
    one_year: string[];
  };
  selected_career: string;
}

export const generateCareerReportV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ selected_career: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const [{ data: profile }, { data: responses }, { data: matches }] = await Promise.all([
      context.supabase.from("student_profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("assessment_responses").select("question_id,response,score").eq("user_id", context.userId),
      context.supabase.from("career_matches").select("*").eq("user_id", context.userId).order("match_percentage", { ascending: false }),
    ]);

    if (!profile) throw new Error("Complete onboarding first.");
    if (!matches || matches.length === 0) throw new Error("Run career matching first.");

    const focusCareer = data.selected_career ?? matches[0].career_name;
    const matchNames = matches.map((m) => m.career_name);

    const { data: careerDocs } = await context.supabase
      .from("career_profiles")
      .select("*")
      .in("career_name", matchNames);

    const focusDoc = careerDocs?.find((c) => c.career_name === focusCareer);

    const system = `You are Saarthi, an empathetic Indian career counsellor. You write deeply personalised career clarity reports. Output ONLY valid JSON. Reference THIS student's profile and the provided career database — never give generic advice.`;

    const prompt = `Student profile: ${JSON.stringify(profile)}
Assessment responses: ${JSON.stringify(responses ?? [])}
Career matches: ${JSON.stringify(matches)}
Career database entries: ${JSON.stringify(careerDocs ?? [])}
Selected career for the escape plan: ${focusCareer}
Career database entry for selected career: ${JSON.stringify(focusDoc ?? null)}

Return JSON:
{
  "career_identity": {
    "title": "e.g. 'You are a Creative Builder'",
    "explanation": "2-3 sentences explaining WHY this identity, citing concrete strengths/interests from the student"
  },
  "top_matches": [
    {
      "career_name": "...",
      "match_percentage": 0-100,
      "why_it_fits": "personalised, 2 sentences",
      "skills_needed": ["3-4 specific skills"],
      "challenges": ["2-3 honest challenges for THIS student"]
    }
  ],
  "current_trap": {
    "family_pressure": "...",
    "financial_constraints": "...",
    "fear": "...",
    "confusion": "...",
    "skill_gaps": "..."
  },
  "escape_plan": {
    "today": ["1-2 actions"],
    "thirty_days": ["3-4 actions"],
    "six_months": ["3-4 milestones"],
    "one_year": ["2-3 milestones"]
  },
  "selected_career": "${focusCareer}"
}

Use the top 3 matches. The escape plan must be tailored to "${focusCareer}" using the database entry. No generic advice.`;

    const report = await callLovableAIJSON<UpgradedReport>({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    });

    // Persist into career_reports (existing schema)
    await context.supabase.from("career_reports").delete().eq("user_id", context.userId);
    const { data: saved } = await context.supabase
      .from("career_reports")
      .insert({
        user_id: context.userId,
        personality: `${report.career_identity.title} — ${report.career_identity.explanation}`,
        strengths: report.top_matches.flatMap((m) => m.skills_needed),
        career_paths: report.top_matches,
        obstacles: report.current_trap,
        next_steps: report.escape_plan,
      })
      .select()
      .single();

    await context.supabase.from("analytics_events").insert({
      user_id: context.userId,
      event_name: "career_report_v2_generated",
      properties: { selected_career: focusCareer },
    });

    return { report, saved };
  });

// ---------------- Context-Aware Saarthi ----------------
const SaarthiInput = z.object({
  message: z.string().min(1).max(2000),
  language: z.enum(["english", "hindi", "hinglish"]).optional(),
});

export const saarthiChatV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaarthiInput.parse(d))
  .handler(async ({ data, context }) => {
    const [
      { data: profile },
      { data: report },
      { data: matches },
      { data: roadmap },
      { data: tasks },
      { data: progress },
      { data: history },
      { data: memories },
    ] = await Promise.all([
      context.supabase.from("student_profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("career_reports").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("career_matches").select("career_name,match_percentage,why_it_matches,skill_gap,first_step").eq("user_id", context.userId).order("match_percentage", { ascending: false }).limit(5),
      context.supabase.from("user_roadmaps").select("goal,duration,status").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("daily_tasks").select("task_title,completed,day_number").eq("user_id", context.userId).order("day_number").limit(20),
      context.supabase.from("user_progress").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("ai_chat_history").select("user_message,ai_response").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(8),
      context.supabase.from("student_memories").select("memory_type,content,importance").eq("user_id", context.userId).order("importance", { ascending: false }).limit(10),
    ]);

    // Pull career-database context for the student's top 3 matches
    const topNames = (matches ?? []).slice(0, 3).map((m) => m.career_name).filter(Boolean);
    const { data: careerDocs } = topNames.length
      ? await context.supabase
          .from("career_profiles")
          .select("career_name,career_identity,required_skills,common_traps,untrap_first_step,salary_reality_india,financial_barriers,time_commitment")
          .in("career_name", topNames)
      : { data: [] };

    const lang = data.language ?? (profile?.language_preference as string | undefined) ?? "english";

    const system = `You are Saarthi — a warm, intelligent Indian career mentor for a student aged 15-24, especially Tier-2/3 cities.

You are NOT a chatbot. You are a human-feeling mentor.

Every response MUST follow this 3-beat structure:
1. Acknowledge — briefly validate what they feel ("I understand why this feels confusing.")
2. Personal insight — connect to THEIR profile, strengths, matches, or progress ("Based on your interest in X and your strength in Y...")
3. Practical next step — one concrete action they can take now.

Hard rules:
- Never give generic motivation or generic career advice.
- Acknowledge family pressure and financial reality when relevant.
- Reference the career database (skills, traps, first steps) when useful.
- Reply in ${lang === "hindi" ? "Hindi (Devanagari)" : lang === "hinglish" ? "Hinglish (Roman script, mix Hindi + English naturally)" : "simple English"}.
- Keep it short: 80-180 words. Use markdown sparingly.

Student context (use it; do not dump it back to the user):
PROFILE: ${JSON.stringify(profile)}
REPORT: ${JSON.stringify(report)}
TOP MATCHES: ${JSON.stringify(matches)}
CAREER DB SNAPSHOTS: ${JSON.stringify(careerDocs)}
ROADMAP: ${JSON.stringify(roadmap)}
RECENT TASKS: ${JSON.stringify(tasks)}
PROGRESS: ${JSON.stringify(progress)}
LONG-TERM MEMORIES: ${JSON.stringify(memories)}`;

    const msgs: ChatMsg[] = [{ role: "system", content: system }];
    // history is newest-first; reverse to chronological
    for (const m of (history ?? []).slice().reverse()) {
      if (m.user_message) msgs.push({ role: "user", content: m.user_message });
      if (m.ai_response) msgs.push({ role: "assistant", content: m.ai_response });
    }
    msgs.push({ role: "user", content: data.message });

    const reply = await callLovableAI({ messages: msgs, temperature: 0.7 });

    await context.supabase.from("ai_chat_history").insert({
      user_id: context.userId,
      message_role: "exchange",
      user_message: data.message,
      ai_response: reply,
      context_used: { profile, matches, careerDocs, roadmap, progress },
    });
    await context.supabase.from("analytics_events").insert({
      user_id: context.userId,
      event_name: "saarthi_v2_used",
      properties: { language: lang },
    });

    return { reply, language: lang };
  });

// ---------------- Admin: import career profiles from JSON ----------------
const ImportInput = z.object({
  profiles: z.array(z.record(z.string(), z.any())).min(1).max(500),
});

export const importCareerProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { data: count, error } = await context.supabase.rpc("import_career_profiles", {
      _payload: data.profiles as unknown as object,
    });
    if (error) throw new Error(error.message);
    return { imported: count ?? 0 };
  });

// ---------------- Read helpers ----------------
export const listCareerProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("career_profiles")
      .select("id,career_name,category,short_description,career_identity")
      .order("career_name");
    if (error) throw new Error(error.message);
    return { profiles: data ?? [] };
  });

export const getCareerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ career_name: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase
      .from("career_profiles")
      .select("*")
      .eq("career_name", data.career_name)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile };
  });
