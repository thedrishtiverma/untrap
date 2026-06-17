import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateRoadmap } from "@/lib/career.functions";
import { AppShell } from "@/components/AppShell";
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({ meta: [{ title: "30-day roadmap · UNTRAP" }] }),
  component: RoadmapPage,
});

interface Task { id: string; week: number; title: string; description: string; completed: boolean; task_order: number }

function RoadmapPage() {
  const generate = useServerFn(generateRoadmap);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("roadmap_tasks").select("*").eq("user_id", user.id).order("week").order("task_order");
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function build() {
    setGenerating(true);
    try {
      await generate({});
      toast.success("Your 30-day plan is ready");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build roadmap");
    } finally {
      setGenerating(false);
    }
  }

  async function toggle(t: Task) {
    setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, completed: !x.completed } : x));
    await supabase.from("roadmap_tasks").update({ completed: !t.completed }).eq("id", t.id);
  }

  const grouped = [1, 2, 3, 4].map((w) => ({ week: w, items: tasks.filter((t) => t.week === w) }));
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (loading) return <AppShell><div className="h-40 animate-pulse rounded-3xl bg-secondary" /></AppShell>;

  if (tasks.length === 0) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-accent" />
          <h2 className="mt-4 text-xl font-bold">Your 30-day roadmap</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tiny, doable weekly tasks built around your AI career report.</p>
          <button onClick={build} disabled={generating}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60">
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Building…</> : <>Build my plan</>}
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your 30-day roadmap</h1>
            <p className="text-sm text-muted-foreground">{done} of {total} tasks done</p>
          </div>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <svg className="absolute inset-0" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-border" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-primary" strokeWidth="3"
                strokeDasharray={`${pct} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
            </svg>
            <span className="text-xs font-bold">{pct}%</span>
          </div>
        </div>
        <button onClick={build} disabled={generating}
          className="mt-4 w-full rounded-2xl border border-border bg-secondary/50 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50">
          {generating ? "Regenerating…" : "Regenerate plan"}
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {grouped.map(({ week, items }) => (
          <section key={week}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
              Week {week}
              <span className="h-px flex-1 bg-border" />
            </h2>
            <ul className="space-y-2">
              {items.map((t) => (
                <li key={t.id}>
                  <button onClick={() => toggle(t)}
                    className={cn("flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
                      t.completed ? "border-success/40 bg-success/10" : "border-border bg-card hover:border-primary/40")}>
                    {t.completed
                      ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-foreground/80" />
                      : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
                    <div className="flex-1">
                      <p className={cn("text-sm font-semibold", t.completed && "line-through opacity-70")}>{t.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
