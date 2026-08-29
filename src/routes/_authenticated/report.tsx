import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Sparkles, Target, TrendingUp, Zap, MapPin, Compass, ArrowRight, Eye, Heart, Users, Brain } from "lucide-react";
import type { MoatRow } from "@/components/MoatMeters";
import { useServerFn } from "@tanstack/react-start";
import { getLayer1Profile } from "@/features/assessment/api/layer1.functions";
import { Layer1ProfileCard } from "@/features/assessment/components/Layer1ProfileCard";
import type { Layer1Profile } from "@/features/assessment/types/layer1";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({ meta: [
    { title: "Your career report · UNTRAP" },
    { name: "description", content: "Your personalized AI career clarity report — strengths, matched paths, and next steps." },
    { name: "robots", content: "noindex" },
  ] }),
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
  const [moat, setMoat] = useState<MoatRow | null>(null);
  const [layer1Profile, setLayer1Profile] = useState<Layer1Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadLayer1Profile = useServerFn(getLayer1Profile);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: rpt }, { data: m }, profile] = await Promise.all([
        supabase.from("career_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).maybeSingle(),
        supabase.from("student_moat_profile").select("*").eq("user_id", user.id).maybeSingle(),
        loadLayer1Profile().catch(() => null),
      ]);
      setReport(rpt as Report | null);
      setMoat((m as unknown as MoatRow) ?? null);
      setLayer1Profile(profile);
      setLoading(false);
    })();
  }, [loadLayer1Profile]);

  if (loading) return <AppShell><Skeleton /></AppShell>;

  if (!report && !layer1Profile) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <Compass className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold">No report yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Take the 6-question quiz to unlock your AI career clarity report.</p>
           <Link to="/assessment-v2" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop">
            Start the quiz <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="sr-only">Your Career Clarity Report</h1>
        {layer1Profile ? <Layer1ProfileCard profile={layer1Profile} /> : null}
        {!report ? (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your Layer 1 patterns are ready. Complete the career assessment to connect them to practical career directions.
            </p>
            <Link to="/assessment-v2" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop">
              Continue the journey <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
        {report ? (
        <>
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

        {moat && <InvisibleForces moat={moat} />}

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
        </>
        ) : null}
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

function InvisibleForces({ moat }: { moat: MoatRow }) {
  const forces = [
    { icon: <Heart className="h-4 w-4" />, label: "Family", score: moat.family_dynamics_score, sub: moat.family_value_orientation, insight: moat.family_insight },
    { icon: <Users className="h-4 w-4" />, label: "Friend circle", score: moat.friend_circle_score, sub: moat.ambition_density, insight: moat.friend_circle_insight },
    { icon: <Eye className="h-4 w-4" />, label: "Exposure", score: moat.exposure_score, sub: "awareness", insight: moat.exposure_insight },
  ].filter((f) => typeof f.score === "number");

  return (
    <Card title="Invisible forces shaping you" icon={<Sparkles className="h-4 w-4" />}>
      <p className="-mt-1 mb-4 text-xs text-muted-foreground">
        Your career isn't just interest. Family, friends, exposure, fears, and identity quietly steer every decision. Here's what UNTRAP sees.
      </p>
      <div className="space-y-4">
        {forces.map((f) => (
          <div key={f.label}>
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {f.icon} {f.label}
                {f.sub && <span className="text-[10px] font-medium text-muted-foreground">· {f.sub}</span>}
              </div>
              <span className="text-sm font-extrabold">{f.score}<span className="text-[10px] text-muted-foreground">/100</span></span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${f.score}%` }} />
            </div>
            {f.insight && <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.insight}</p>}
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {moat.decision_style && (
          <div className="rounded-2xl bg-secondary/60 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Brain className="h-3 w-3" /> Decision style
            </div>
            <p className="mt-1 text-sm font-bold capitalize">{moat.decision_style}</p>
          </div>
        )}
        {moat.primary_fear && (
          <div className="rounded-2xl bg-secondary/60 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Invisible barrier</div>
            <p className="mt-1 text-sm font-bold capitalize">{moat.primary_fear.replace(/_/g, " ")}</p>
          </div>
        )}
      </div>

      {moat.current_identity && moat.desired_identity && (
        <div className="mt-4 rounded-2xl border border-border p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Compass className="h-3 w-3" /> Identity gap · {moat.identity_gap_score ?? 0}/100
          </div>
          <p className="mt-1.5 text-sm">
            <span className="text-muted-foreground">{moat.current_identity}</span>
            <span className="mx-2 text-muted-foreground/50">→</span>
            <span className="font-bold">{moat.desired_identity}</span>
          </p>
          {moat.identity_bridge && <p className="mt-1 text-xs text-muted-foreground">{moat.identity_bridge}</p>}
        </div>
      )}
    </Card>
  );
}
