import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ArrowUpRight, ClipboardList, MessageCircle, Sparkles, Target } from "lucide-react";
import { MoatMeters, type MoatRow } from "@/components/MoatMeters";
import { useServerFn } from "@tanstack/react-start";
import { generateMoatProfile } from "@/lib/moat-intelligence.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard · UNTRAP" },
    { name: "description", content: "Your UNTRAP dashboard — track your career clarity progress, roadmap, and next steps." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Dashboard,
});

interface State {
  name: string;
  topPath?: string;
  done: number;
  total: number;
  hasReport: boolean;
  nextTask?: { id: string; title: string; description: string };
}

function Dashboard() {
  const navigate = useNavigate();
  const [s, setS] = useState<State | null>(null);
  const [moat, setMoat] = useState<MoatRow | null>(null);
  const [generating, setGenerating] = useState(false);
  const genMoat = useServerFn(generateMoatProfile);

  const loadMoat = async (userId: string) => {
    const { data } = await supabase
      .from("student_moat_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setMoat((data as unknown as MoatRow) ?? null);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: report }, { data: tasks }] = await Promise.all([
        supabase.from("profiles").select("name,onboarded").eq("id", user.id).maybeSingle(),
        supabase.from("career_reports").select("career_paths").eq("user_id", user.id).maybeSingle(),
        supabase.from("roadmap_tasks").select("id,title,description,completed,task_order").eq("user_id", user.id).order("task_order"),
      ]);

      if (!profile?.onboarded) { navigate({ to: "/onboarding" }); return; }

      const list = tasks ?? [];
      const next = list.find((t) => !t.completed);
      const paths = (report?.career_paths ?? []) as { title: string }[];
      setS({
        name: profile?.name ?? "Friend",
        topPath: paths[0]?.title,
        done: list.filter((t) => t.completed).length,
        total: list.length,
        hasReport: !!report,
        nextTask: next ? { id: next.id, title: next.title, description: next.description } : undefined,
      });
      void loadMoat(user.id);
    })();
  }, [navigate]);

  const handleGenerateMoat = async () => {
    setGenerating(true);
    try {
      await genMoat();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await loadMoat(user.id);
      toast.success("Your invisible-forces map is ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not map invisible forces");
    } finally {
      setGenerating(false);
    }
  };

  if (!s) return <AppShell><div className="h-40 animate-pulse rounded-3xl bg-secondary" /></AppShell>;

  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  const greeting = greetingFor(new Date().getHours());

  return (
    <AppShell>
      <div className="space-y-6 animate-break-up">
        <header>
          <p className="text-sm font-semibold text-foreground/55">{greeting},</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {s.name}.
          </h1>
        </header>

        {/* Career identity card — Obsidian premium surface */}
        <div className="untrap-obsidian relative overflow-hidden rounded-[28px] p-6 text-background shadow-pop">
          <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-background/70 backdrop-blur">
            <Sparkles className="h-3 w-3 text-accent" /> Direction
          </div>
          {s.hasReport ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-background/55">Your current path</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-background">
                {s.topPath ?? "Multiple paths"}
              </h2>
              <p className="mt-3 font-serif text-base italic font-light text-background/70">
                "You are designing your future, one decision at a time."
              </p>
              <Link to="/report" className="mt-5 inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-xs font-semibold text-foreground hover:translate-y-[-1px] transition">
                View full report <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-2 max-w-xs text-2xl font-bold leading-tight text-background">
                Take the quiz to unlock your direction.
              </h2>
              <Link to="/assessment" className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground orange-glow hover:translate-y-[-1px] transition">
                Start 5-min quiz <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Progress */}
        <div className="rounded-[24px] border border-foreground/8 bg-card p-5 shadow-soft">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold">30-day progress</p>
            <span className="text-2xl font-extrabold tracking-tight text-foreground">{pct}<span className="text-sm font-bold text-foreground/40">%</span></span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-xs text-foreground/55">{s.done} of {s.total || "—"} tasks completed</p>
        </div>

        {/* Invisible Forces — UNTRAP moat */}
        <MoatMeters moat={moat} onGenerate={handleGenerateMoat} generating={generating} />


        {/* Today's mission */}
        <div className="rounded-[24px] border border-foreground/8 bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
            <Target className="h-4 w-4" /> Today's mission
          </div>
          {s.nextTask ? (
            <>
              <p className="mt-3 text-lg font-bold leading-snug">{s.nextTask.title}</p>
              <p className="mt-1 text-sm text-foreground/60">{s.nextTask.description}</p>
              <Link to="/roadmap" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                Open roadmap <ArrowUpRight className="h-4 w-4" />
              </Link>
            </>
          ) : s.total === 0 ? (
            <>
              <p className="mt-3 text-sm text-foreground/60">Build your 30-day plan from your career report.</p>
              <Link to="/roadmap" className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
                Build roadmap <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-foreground/60">🎉 All tasks done. Time to plan the next month.</p>
          )}
        </div>

        {/* Saarthi CTA */}
        <Link
          to="/chat"
          className="lift lift-hover group flex items-center gap-4 rounded-[24px] border border-foreground/8 bg-card p-5 shadow-soft"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold">Ask Saarthi AI</p>
            <p className="text-xs text-foreground/55">Stuck, confused, or just need to think out loud?</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-foreground/40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>

        <Link to="/assessment" className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-sm font-medium text-foreground/70 hover:text-foreground">
          <ClipboardList className="h-4 w-4 text-accent" />
          Retake the quiz anytime
        </Link>
      </div>
    </AppShell>
  );
}

function greetingFor(hour: number) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}
