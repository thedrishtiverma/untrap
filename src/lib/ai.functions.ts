// UNTRAP AI server functions — Matching, Report, Trap Detection, Roadmap, Saarthi, Memory.
// All prompts are loaded from the `ai_prompts` table (versioned, editable in DB).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callLovableAI, callLovableAIJSON, type ChatMsg } from "./ai-gateway.server";
import { loadPrompt, renderTemplate, runPrompt, getRelevantMemories, saveMemories } from "./ai-service.server";

// ===================== 1. Career Matching =====================
interface MatchOut {
  matches: {
    career_name: string;
    match_score: number;
    why_it_matches: string[];
    skills_required: string[];
    potential_challenges: string[];
    reasoning: string;
  }[];
}

export const matchCareers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const uid = context.userId;
    const [{ data: profile }, { data: responses }, { data: careers }, memories] = await Promise.all([
      sb.from("student_profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("assessment_responses").select("question_id,response,score").eq("user_id", uid),
      sb.from("careers").select("career_name,category,ideal_personality,required_interests,required_strengths,salary_range,growth_outlook").limit(50),
      getRelevantMemories(sb, uid),
    ]);

    const out = await runPrompt<MatchOut>(sb, "career_matching", {
      profile, responses, careers, memories,
    });

    await sb.from("career_matches").delete().eq("user_id", uid);
    if (out.matches?.length) {
      await sb.from("career_matches").insert(out.matches.slice(0, 5).map((m) => ({
        user_id: uid,
        career_name: m.career_name,
        match_percentage: Math.min(100, Math.max(0, m.match_score)),
        reasoning: m.reasoning,
        why_it_matches: m.why_it_matches,
        skills_required: m.skills_required,
        potential_challenges: m.potential_challenges,
      })));
    }
    await sb.from("analytics_events").insert({ user_id: uid, event_name: "careers_matched", properties: { count: out.matches?.length ?? 0 } });
    return out;
  });

// ===================== 2. Career Report =====================
interface ReportOut {
  career_personality: string;
  strength_analysis: { strength: string; evidence: string }[];
  recommended_careers: { career_name: string; match_percentage: number; reasoning: string }[];
  career_explanation: string;
  identified_traps: { trap_name: string; severity: "low" | "medium" | "high"; explanation: string; solution: string }[];
  action_plan: string[];
  next_steps: string[];
}

export const generateCareerReportV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const uid = context.userId;
    const [{ data: profile }, { data: responses }, { data: matches }, memories] = await Promise.all([
      sb.from("student_profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("assessment_responses").select("question_id,response,score").eq("user_id", uid),
      sb.from("career_matches").select("*").eq("user_id", uid),
      getRelevantMemories(sb, uid),
    ]);

    const report = await runPrompt<ReportOut>(sb, "career_report", {
      profile, responses, matches, memories,
    }, "You are Saarthi, an empathetic Indian career counsellor. Output ONLY valid JSON.");

    await sb.from("career_reports").delete().eq("user_id", uid);
    const { data: saved } = await sb.from("career_reports").insert({
      user_id: uid,
      personality: report.career_personality,
      strengths: report.strength_analysis,
      career_paths: report.recommended_careers,
      obstacles: report.identified_traps,
      next_steps: report.next_steps,
    }).select().single();

    await sb.from("user_traps").delete().eq("user_id", uid);
    if (report.identified_traps?.length) {
      await sb.from("user_traps").insert(report.identified_traps.map((t) => ({
        user_id: uid, trap_name: t.trap_name, severity: t.severity,
        explanation: t.explanation, recommended_solution: t.solution,
      })));
    }

    await sb.from("analytics_events").insert({ user_id: uid, event_name: "report_generated", properties: {} });
    return { report, saved };
  });

// ===================== 3. Trap Detection =====================
interface TrapOut { traps: { trap_name: string; category: string; severity: string; reason: string; solution: string }[] }

export const detectStudentTraps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const uid = context.userId;
    const [{ data: profile }, { data: responses }, { data: catalog }, memories] = await Promise.all([
      sb.from("student_profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("assessment_responses").select("response,score").eq("user_id", uid),
      sb.from("career_traps").select("trap_name,category,description,solutions"),
      getRelevantMemories(sb, uid),
    ]);

    const out = await runPrompt<TrapOut>(sb, "trap_detection", { profile, responses, catalog, memories });

    await sb.from("user_traps").delete().eq("user_id", uid);
    if (out.traps?.length) {
      await sb.from("user_traps").insert(out.traps.map((t) => ({
        user_id: uid, trap_name: t.trap_name, severity: t.severity,
        explanation: t.reason, recommended_solution: t.solution,
      })));
    }
    return out;
  });

// ===================== 4. 30-Day Roadmap =====================
const RoadmapInput = z.object({
  career_name: z.string().min(1),
  duration_days: z.number().int().min(7).max(90).default(30),
  daily_minutes: z.number().int().min(15).max(240).default(45),
});

interface PlanOut {
  goal: string;
  weeks: { week: number; theme: string; tasks: { day: number; title: string; description: string; estimated_time: string; difficulty: string; resource?: string }[] }[];
}

export const generate30DayRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RoadmapInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const uid = context.userId;
    const [{ data: profile }, { data: report }] = await Promise.all([
      sb.from("student_profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("career_reports").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    const constraints = {
      financial: (profile as any)?.financial_situation ?? null,
      family: (profile as any)?.family_pressure ?? null,
      stage: (profile as any)?.education_stage ?? null,
    };

    const plan = await runPrompt<PlanOut>(sb, "roadmap_30day", {
      career: data.career_name, minutes: data.daily_minutes, days: data.duration_days,
      report, constraints,
    });

    const { data: career } = await sb.from("careers").select("id").eq("career_name", data.career_name).maybeSingle();
    await sb.from("user_roadmaps").delete().eq("user_id", uid);
    const { data: roadmap, error } = await sb.from("user_roadmaps").insert({
      user_id: uid, career_id: career?.id ?? null, goal: plan.goal,
      duration: `${data.duration_days} days`,
      generated_plan: JSON.parse(JSON.stringify(plan)), status: "active",
    }).select().single();
    if (error) throw new Error(error.message);

    const tasks = plan.weeks.flatMap((w) => w.tasks.map((t) => ({
      roadmap_id: roadmap.id, user_id: uid,
      day_number: t.day, task_title: t.title, description: t.description,
      estimated_time: t.estimated_time, difficulty: t.difficulty,
    })));
    if (tasks.length) await sb.from("daily_tasks").insert(tasks);
    await sb.from("analytics_events").insert({ user_id: uid, event_name: "roadmap_started", properties: { career: data.career_name } });
    return { roadmap_id: roadmap.id, task_count: tasks.length };
  });

// ===================== 5. Saarthi Mentor =====================
const ChatInput = z.object({ message: z.string().min(1).max(2000) });

export const saarthiChatV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const uid = context.userId;
    const [{ data: profile }, { data: report }, { data: roadmap }, { data: progress }, { data: history }, memories] = await Promise.all([
      sb.from("student_profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("career_reports").select("personality,career_paths,obstacles").eq("user_id", uid).maybeSingle(),
      sb.from("user_roadmaps").select("goal,duration,status").eq("user_id", uid).maybeSingle(),
      sb.from("user_progress").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("ai_chat_history").select("user_message,ai_response").eq("user_id", uid).order("created_at", { ascending: false }).limit(8),
      getRelevantMemories(sb, uid),
    ]);

    const prompt = await loadPrompt(sb, "saarthi_mentor");
    const system = renderTemplate(prompt.prompt_template, {
      profile, report, roadmap, progress, memories,
    });

    const msgs: ChatMsg[] = [{ role: "system", content: system }];
    for (const m of (history ?? []).slice().reverse()) {
      if (m.user_message) msgs.push({ role: "user", content: m.user_message });
      if (m.ai_response) msgs.push({ role: "assistant", content: m.ai_response });
    }
    msgs.push({ role: "user", content: data.message });

    const reply = await callLovableAI({
      model: prompt.model, messages: msgs, temperature: prompt.temperature ?? 0.7,
    });

    await sb.from("ai_chat_history").insert({
      user_id: uid, message_role: "exchange",
      user_message: data.message, ai_response: reply,
      context_used: { memory_count: memories.length },
    });
    await sb.from("analytics_events").insert({ user_id: uid, event_name: "mentor_used", properties: {} });

    // ----- 6. Memory extraction (fire and forget, but await for consistency) -----
    try {
      const extracted = await runPrompt<{ memories: { memory_type: string; content: string; importance: number }[] }>(
        sb, "memory_extraction", { user_message: data.message, ai_response: reply },
      );
      await saveMemories(sb, uid, extracted.memories ?? [], "chat");
    } catch {
      // Non-fatal — memory extraction failures shouldn't break chat.
    }

    return { reply };
  });

// ===================== Memory CRUD helpers =====================
export const listMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("student_memories")
      .select("id,memory_type,content,importance,source,created_at")
      .eq("user_id", context.userId)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const MemDelete = z.object({ id: z.string().uuid() });
export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MemDelete.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("student_memories").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });
