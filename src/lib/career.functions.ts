import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callLovableAIJSON, callLovableAI, type ChatMsg } from "./ai-gateway.server";

// ---------- Generate AI career report ----------
const GenerateReportInput = z.object({
  responses: z.record(z.string(), z.any()),
});

interface ReportShape {
  personality: string;
  strengths: string[];
  career_paths: { title: string; why_match: string }[];
  obstacles: string[];
  next_steps: string[];
}

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateReportInput.parse(d))
  .handler(async ({ data, context }) => {
    const system = `You are Saarthi, an empathetic Indian career counsellor for students aged 15-24, especially from Tier-2 and Tier-3 cities. You understand family pressure, financial constraints, and cultural realities. Output ONLY valid JSON.`;

    const prompt = `A confused student completed a career self-assessment. Their responses:
${JSON.stringify(data.responses, null, 2)}

Generate a personalised career clarity report as JSON with this exact shape:
{
  "personality": "2-3 sentence warm description of their career personality",
  "strengths": ["5 specific strengths"],
  "career_paths": [
    {"title":"Career name","why_match":"1-2 sentences explaining the fit, mentioning realistic Indian context"}
  ],
  "obstacles": ["3-4 specific current obstacles like family pressure or confusion"],
  "next_steps": ["4-5 concrete next steps they can take this week"]
}

Suggest 4 career paths. Be warm, specific, and realistic. Avoid generic advice.`;

    const report = await callLovableAIJSON<ReportShape>({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });

    // Persist assessment + report
    await context.supabase.from("assessments").insert({ user_id: context.userId, responses: data.responses });

    // Replace any existing report for this user
    await context.supabase.from("career_reports").delete().eq("user_id", context.userId);
    const { data: inserted, error } = await context.supabase
      .from("career_reports")
      .insert({
        user_id: context.userId,
        personality: report.personality,
        strengths: report.strengths,
        career_paths: report.career_paths,
        obstacles: report.obstacles,
        next_steps: report.next_steps,
      })
      .select()
      .single();
    if (error) { console.error("[server] db error", error?.message); throw new Error("Something went wrong. Please try again."); }
    return inserted;
  });

// ---------- Generate 30-day roadmap ----------
interface RoadmapItem { week: number; title: string; description: string }
interface RoadmapShape { tasks: RoadmapItem[] }

export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: report } = await context.supabase
      .from("career_reports").select("*").eq("user_id", context.userId).maybeSingle();
    if (!report) throw new Error("Generate your career report first.");

    const system = `You are Saarthi, an Indian career coach. Output ONLY valid JSON. Tasks must be small, doable in 20-60 minutes, free or near-free, and culturally relevant for Indian students.`;

    const prompt = `Based on this student's career report, design a 30-day roadmap with exactly 12 tasks (3 per week, weeks 1-4).
Career personality: ${report.personality}
Top career paths: ${JSON.stringify(report.career_paths)}
Obstacles: ${JSON.stringify(report.obstacles)}

Return JSON: {"tasks":[{"week":1,"title":"...","description":"1-2 sentences, action-oriented"}, ...]}
Week 1 = clarity & self-research. Week 2 = skill exploration. Week 3 = build something small. Week 4 = connect, share, plan ahead.`;

    const plan = await callLovableAIJSON<RoadmapShape>({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });

    await context.supabase.from("roadmap_tasks").delete().eq("user_id", context.userId);
    const rows = plan.tasks.slice(0, 12).map((t, i) => ({
      user_id: context.userId,
      week: t.week,
      task_order: i,
      title: t.title,
      description: t.description,
    }));
    const { error } = await context.supabase.from("roadmap_tasks").insert(rows);
    if (error) { console.error("[server] db error", error?.message); throw new Error("Something went wrong. Please try again."); }
    return { count: rows.length };
  });

// ---------- Chat with Saarthi ----------
const ChatInput = z.object({ message: z.string().min(1).max(2000) });

export const chatWithSaarthi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    // Load profile + report for context
    const [{ data: profile }, { data: report }, { data: history }] = await Promise.all([
      context.supabase.from("profiles").select("name,age,city,education_level,language").eq("id", context.userId).maybeSingle(),
      context.supabase.from("career_reports").select("personality,career_paths,obstacles").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("chat_messages").select("role,content").eq("user_id", context.userId).order("created_at", { ascending: true }).limit(20),
    ]);

    const system = `You are Saarthi AI, a warm, intelligent career mentor for Indian students aged 15-24, especially from Tier-2/Tier-3 cities. Speak simply. Be supportive, never preachy. Acknowledge family pressure and financial reality. Give specific, doable next steps. Use the student's preferred language when natural. Use markdown sparingly.

Student context:
${profile ? `Name: ${profile.name ?? "Friend"}, Age: ${profile.age ?? "?"}, City: ${profile.city ?? "?"}, Education: ${profile.education_level ?? "?"}, Preferred language: ${profile.language ?? "English"}` : "No profile yet."}
${report ? `Career direction: ${JSON.stringify(report.career_paths)}\nKnown obstacles: ${JSON.stringify(report.obstacles)}` : "No career report yet — gently encourage them to complete the assessment if relevant."}`;

    const msgs: ChatMsg[] = [
      { role: "system", content: system },
      ...((history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))),
      { role: "user", content: data.message },
    ];

    const reply = await callLovableAI({ messages: msgs, temperature: 0.7 });

    await context.supabase.from("chat_messages").insert([
      { user_id: context.userId, role: "user", content: data.message },
      { user_id: context.userId, role: "assistant", content: reply },
    ]);

    return { reply };
  });
