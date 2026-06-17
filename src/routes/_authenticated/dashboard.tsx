import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, ClipboardList, MessageCircle, Sparkles, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · UNTRAP" }] }),
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
    })();
  }, [navigate]);

  if (!s) return <AppShell><div className="h-40 animate-pulse rounded-3xl bg-secondary" /></AppShell>;

  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Hi {s.name} 👋</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Let's untrap your future.</h1>
        </div>

        {/* Direction card */}
        <div className="untrap-gradient relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-pop">
          <Sparkles className="absolute right-5 top-5 h-5 w-5 opacity-60" />
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">Your direction</p>
          {s.hasReport ? (
            <>
              <h2 className="mt-2 text-2xl font-bold leading-tight">{s.topPath ?? "Exploring multiple paths"}</h2>
              <Link to="/report" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 text-xs font-semibold text-primary-foreground backdrop-blur hover:bg-primary-foreground/25">
                View full report <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-xl font-bold leading-tight">Take the quiz to unlock your direction</h2>
              <Link to="/assessment" className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90">
                Start 5-min quiz <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Progress */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">30-day progress</p>
            <span className="text-xs font-semibold text-primary">{pct}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full untrap-gradient transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{s.done} of {s.total || "—"} tasks completed</p>
        </div>

        {/* Next task */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Target className="h-4 w-4" /> Today's focus
          </div>
          {s.nextTask ? (
            <>
              <p className="mt-3 text-base font-bold">{s.nextTask.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.nextTask.description}</p>
              <Link to="/roadmap" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Open roadmap <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : s.total === 0 ? (
            <>
              <p className="mt-3 text-sm text-muted-foreground">Build your 30-day plan from your career report.</p>
              <Link to="/roadmap" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                Build roadmap <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">🎉 All tasks done. Time to plan the next month.</p>
          )}
        </div>

        {/* Saarthi CTA */}
        <Link to="/chat" className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-card transition hover:border-primary/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold">Chat with Saarthi</p>
            <p className="text-xs text-muted-foreground">Stuck, confused, or just need to think out loud?</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        {/* Retake */}
        <Link to="/assessment" className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-sm font-medium text-foreground">
          <ClipboardList className="h-4 w-4 text-primary" />
          Retake the quiz anytime
        </Link>
      </div>
    </AppShell>
  );
}
