import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Sparkles, Target, TrendingUp, Zap, MapPin, Compass, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({ meta: [{ title: "Your career report · UNTRAP" }] }),
  component: ReportPage,
});

interface Report {
  personality: string;
  strengths: string[];
  career_paths: { title: string; why_match: string }[];
  obstacles: string[];
  next_steps: string[];
  created_at: string;
}

function ReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("career_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).maybeSingle();
      setReport(data as Report | null);
      setLoading(false);
    })();
  }, []);

  if (loading) return <AppShell><Skeleton /></AppShell>;

  if (!report) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <Compass className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold">No report yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Take the 6-question quiz to unlock your AI career clarity report.</p>
          <Link to="/assessment" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop">
            Start the quiz <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="untrap-gradient rounded-3xl p-6 text-primary-foreground shadow-pop">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">
            <Sparkles className="h-3.5 w-3.5" /> Your career personality
          </div>
          <p className="mt-3 text-lg font-medium leading-relaxed">{report.personality}</p>
        </div>

        <Card title="Your strengths" icon={<Zap className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-2">
            {report.strengths.map((s) => (
              <span key={s} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{s}</span>
            ))}
          </div>
        </Card>

        <Card title="Career paths that match you" icon={<Target className="h-4 w-4" />}>
          <ul className="space-y-3">
            {report.career_paths.map((p, i) => (
              <li key={p.title} className="rounded-2xl border border-border bg-secondary/40 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">{i + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{p.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{p.why_match}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="What's holding you back" icon={<MapPin className="h-4 w-4" />}>
          <ul className="space-y-2">
            {report.obstacles.map((o) => (
              <li key={o} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{o}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="What to do next" icon={<TrendingUp className="h-4 w-4" />}>
          <ol className="space-y-2">
            {report.next_steps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-sm text-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </Card>

        <Link to="/roadmap" className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-sm font-semibold text-accent-foreground shadow-pop">
          Build my 30-day roadmap <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </AppShell>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">{icon}</span>
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-3xl bg-secondary" />
      <div className="h-32 animate-pulse rounded-3xl bg-secondary" />
      <div className="h-32 animate-pulse rounded-3xl bg-secondary" />
    </div>
  );
}
