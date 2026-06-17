// UNTRAP V1 backend server functions (new schema).
// These run on the server, authenticate via Supabase, and use Lovable AI.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callLovableAI, callLovableAIJSON, type ChatMsg } from "./ai-gateway.server";

// ---------------- Analytics ----------------
const EventInput = z.object({
  event_name: z.string().min(1).max(80),
  properties: z.record(z.string(), z.any()).optional(),
});
export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EventInput.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("analytics_events").insert({
      user_id: context.userId,
      event_name: data.event_name,
      properties: data.properties ?? {},
    });
    return { ok: true };
  });

// ---------------- Career report (new schema) ----------------
interface ReportShape {
  career_personality: string;
  strength_analysis: { strength: string; evidence: string }[];
  recommended_careers: { career_name: string; match_percentage: number; reasoning: string }[];
  identified_traps: { trap_name: string; severity: "low" | "medium" | "high"; explanation: string; solution: string }[];
  escape_plan: string[];
  next_steps: string[];
}

export const generateCareerReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: responses }, { data: careers }] = await Promise.all([
      context.supabase.from("student_profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("assessment_responses").select("question_id,response,score").eq("user_id", context.userId),
      context.supabase.from("careers").select("career_name,category,ideal_personality,required_interests,required_strengths").limit(40),
    ]);

    const system = `You are Saarthi, an empathetic Indian career counsellor. Output ONLY valid JSON.`;
    const prompt = `Student profile: ${JSON.stringify(profile)}
Assessment responses: ${JSON.stringify(responses)}
Career library: ${JSON.stringify(careers)}

Return JSON:
{
 "career_personality":"2-3 sentence warm description",
 "strength_analysis":[{"strength":"...","evidence":"..."}],
 "recommended_careers":[{"career_name":"...","match_percentage":0-100,"reasoning":"..."}],
 "identified_traps":[{"trap_name":"...","severity":"low|medium|high","explanation":"...","solution":"..."}],
 "escape_plan":["..."],
 "next_steps":["..."]
}
Suggest 4 careers, 3-4 traps. Be realistic for Indian Tier-2/3 students.`;

    const report = await callLovableAIJSON<ReportShape>({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });

    // Persist into new schema
    await context.supabase.from("career_reports").delete().eq("user_id", context.userId);
    const { data: saved } = await context.supabase.from("career_reports").insert({
      user_id: context.userId,
      personality: report.career_personality,
      strengths: report.strength_analysis,
      career_paths: report.recommended_careers,
      obstacles: report.identified_traps,
      next_steps: report.next_steps,
    }).select().single();

    // Persist matches
    await context.supabase.from("career_matches").delete().eq("user_id", context.userId);
    if (report.recommended_careers?.length) {
      await context.supabase.from("career_matches").insert(
        report.recommended_careers.map((c) => ({
          user_id: context.userId,
          career_name: c.career_name,
          match_percentage: Math.min(100, Math.max(0, c.match_percentage)),
          reasoning: c.reasoning,
        }))
      );
    }

    // Persist traps
    await context.supabase.from("user_traps").delete().eq("user_id", context.userId);
    if (report.identified_traps?.length) {
      await context.supabase.from("user_traps").insert(
        report.identified_traps.map((t) => ({
          user_id: context.userId,
          trap_name: t.trap_name,
          severity: t.severity,
          explanation: t.explanation,
          recommended_solution: t.solution,
        }))
      );
    }

    await context.supabase.from("analytics_events").insert({
      user_id: context.userId, event_name: "report_generated", properties: {},
    });

    return { report, saved };
  });

// ---------------- Detect career traps (standalone) ----------------
export const detectCareerTraps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: responses }, { data: catalog }] = await Promise.all([
      context.supabase.from("student_profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("assessment_responses").select("response,score").eq("user_id", context.userId),
      context.supabase.from("career_traps").select("trap_name,category,description,solutions"),
    ]);

    const out = await callLovableAIJSON<{ traps: { trap_name: string; severity: string; explanation: string; solution: string }[] }>({
      messages: [
        { role: "system", content: "You detect career-blockers for Indian students. Output JSON only." },
        { role: "user", content: `Profile: ${JSON.stringify(profile)}\nResponses: ${JSON.stringify(responses)}\nKnown trap catalogue: ${JSON.stringify(catalog)}\n\nReturn JSON {"traps":[{"trap_name":"...","severity":"low|medium|high","explanation":"...","solution":"..."}]} with top 3-4 blockers.` },
      ],
    });

    await context.supabase.from("user_traps").delete().eq("user_id", context.userId);
    if (out.traps?.length) {
      await context.supabase.from("user_traps").insert(out.traps.map((t) => ({
        user_id: context.userId, trap_name: t.trap_name, severity: t.severity,
        explanation: t.explanation, recommended_solution: t.solution,
      })));
    }
    return out;
  });

// ---------------- Generate roadmap (new schema with daily tasks) ----------------
const RoadmapInput = z.object({
  career_name: z.string().min(1),
  duration_days: z.number().int().min(7).max(90).default(30),
  daily_minutes: z.number().int().min(15).max(240).default(45),
});

interface PlanShape {
  goal: string;
  weeks: { week: number; theme: string; tasks: { day: number; title: string; description: string; estimated_time: string; difficulty: string }[] }[];
}

export const generateRoadmapV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RoadmapInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: report } = await context.supabase
      .from("career_reports").select("*").eq("user_id", context.userId).maybeSingle();

    const plan = await callLovableAIJSON<PlanShape>({
      messages: [
        { role: "system", content: "You design realistic, free/low-cost learning roadmaps for Indian students. JSON only." },
        { role: "user", content: `Career: ${data.career_name}
Available daily time: ${data.daily_minutes} minutes
Duration: ${data.duration_days} days
Student career report: ${JSON.stringify(report)}

Return JSON:
{"goal":"...","weeks":[{"week":1,"theme":"...","tasks":[{"day":1,"title":"...","description":"...","estimated_time":"30m","difficulty":"easy|medium|hard"}]}]}
Total tasks ≈ duration_days. Tasks must be specific and doable.` },
      ],
    });

    // Find career_id if exists
    const { data: career } = await context.supabase.from("careers").select("id").eq("career_name", data.career_name).maybeSingle();

    await context.supabase.from("user_roadmaps").delete().eq("user_id", context.userId);
    const { data: roadmap, error: rErr } = await context.supabase.from("user_roadmaps").insert({
      user_id: context.userId,
      career_id: career?.id ?? null,
      goal: plan.goal,
      duration: `${data.duration_days} days`,
      generated_plan: plan,
      status: "active",
    }).select().single();
    if (rErr) throw new Error(rErr.message);

    const taskRows = plan.weeks.flatMap((w) => w.tasks.map((t) => ({
      roadmap_id: roadmap.id,
      user_id: context.userId,
      day_number: t.day,
      task_title: t.title,
      description: t.description,
      estimated_time: t.estimated_time,
      difficulty: t.difficulty,
    })));
    if (taskRows.length) await context.supabase.from("daily_tasks").insert(taskRows);

    await context.supabase.from("analytics_events").insert({
      user_id: context.userId, event_name: "roadmap_started",
      properties: { career: data.career_name, days: data.duration_days },
    });

    return { roadmap_id: roadmap.id, task_count: taskRows.length };
  });

// ---------------- Complete a daily task ----------------
const TaskInput = z.object({ task_id: z.string().uuid(), completed: z.boolean() });
export const setTaskCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TaskInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("daily_tasks")
      .update({ completed: data.completed, completion_date: data.completed ? new Date().toISOString() : null })
      .eq("id", data.task_id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    if (data.completed) {
      const { data: prog } = await context.supabase.from("user_progress")
        .select("*").eq("user_id", context.userId).maybeSingle();
      await context.supabase.from("user_progress").upsert({
        user_id: context.userId,
        tasks_completed: (prog?.tasks_completed ?? 0) + 1,
        current_streak: (prog?.current_streak ?? 0) + 1,
        career_clarity_score: prog?.career_clarity_score ?? 0,
        confidence_score: prog?.confidence_score ?? 0,
        skill_progress: prog?.skill_progress ?? {},
      }, { onConflict: "user_id" });
      await context.supabase.from("analytics_events").insert({
        user_id: context.userId, event_name: "task_completed", properties: { task_id: data.task_id },
      });
    }
    return { ok: true };
  });

// ---------------- Saarthi chat (context-rich) ----------------
const ChatInput = z.object({ message: z.string().min(1).max(2000) });
export const saarthiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: profile }, { data: report }, { data: roadmap }, { data: progress }, { data: history }] = await Promise.all([
      context.supabase.from("student_profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("career_reports").select("personality,career_paths,obstacles").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_roadmaps").select("goal,duration,status").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_progress").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("ai_chat_history").select("message_role,user_message,ai_response").eq("user_id", context.userId).order("created_at").limit(10),
    ]);

    const contextPayload = { profile, report, roadmap, progress };
    const system = `You are Saarthi AI, a warm Indian career mentor for students 15-24, especially Tier-2/3 cities. Be specific, never preachy, acknowledge family + financial reality.

Student context: ${JSON.stringify(contextPayload)}`;

    const msgs: ChatMsg[] = [{ role: "system", content: system }];
    for (const m of history ?? []) {
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
      context_used: contextPayload,
    });
    await context.supabase.from("analytics_events").insert({
      user_id: context.userId, event_name: "mentor_used", properties: {},
    });

    return { reply };
  });

// ---------------- Weekly reflection ----------------
const ReflectionInput = z.object({
  week_number: z.number().int().min(1).max(52),
  what_learned: z.string().optional(),
  what_was_difficult: z.string().optional(),
  confidence_rating: z.number().int().min(1).max(10),
  feedback: z.string().optional(),
});
export const submitWeeklyReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReflectionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("weekly_reflections").insert({
      user_id: context.userId, ...data,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("analytics_events").insert({
      user_id: context.userId, event_name: "weekly_reflection_completed",
      properties: { week: data.week_number, confidence: data.confidence_rating },
    });
    return { ok: true };
  });
