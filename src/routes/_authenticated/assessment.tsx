import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateReport } from "@/lib/career.functions";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { ArrowRight, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assessment")({
  head: () => ({ meta: [
    { title: "Career quiz · UNTRAP" },
    { name: "description", content: "Take the UNTRAP career quiz — a short assessment to reveal your strengths and matching career paths." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Assessment,
});

type Step =
  | { kind: "multi"; id: string; title: string; sub: string; options: string[]; min?: number; max?: number }
  | { kind: "single"; id: string; title: string; sub: string; options: string[] }
  | { kind: "scale"; id: string; title: string; sub: string; left: string; right: string };

const steps: Step[] = [
  { kind: "multi", id: "interests", title: "What pulls you in?", sub: "Pick everything that excites you — at least 2.", options: ["Technology", "Design", "Business", "Science", "Creativity", "People & psychology", "Sports & fitness", "Writing & storytelling", "Numbers & finance"], min: 2 },
  { kind: "multi", id: "strengths", title: "Where do you naturally shine?", sub: "Be honest — pick your real superpowers.", options: ["Communication", "Creativity", "Logical thinking", "Leadership", "Patience & empathy", "Hands-on building", "Organising things"], min: 2 },
  { kind: "scale", id: "structure", title: "How do you work best?", sub: "Slide to where you feel most yourself.", left: "I love structure & plans", right: "I thrive with flexibility" },
  { kind: "scale", id: "collab", title: "Solo or squad?", sub: "Slide to your sweet spot.", left: "Independent & focused", right: "Collaborative & social" },
  { kind: "multi", id: "constraints", title: "What's getting in the way?", sub: "We get it. Pick anything that feels real.", options: ["Family pressure (specific career)", "Financial limitations", "No idea what suits me", "Fear of failure", "Comparison with peers", "Lack of mentors or guidance"] },
  { kind: "single", id: "dream", title: "If money & pressure didn't exist…", sub: "What would you happily do for the next 10 years?", options: ["Build something with my hands or code", "Create art / write / make videos", "Help & teach people", "Run my own business", "Research & solve hard problems", "I genuinely don't know yet"] },
];

function Assessment() {
  const navigate = useNavigate();
  const generate = useServerFn(generateReport);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  const step = steps[i];
  const progress = useMemo(() => Math.round(((i) / steps.length) * 100), [i]);
  const isLast = i === steps.length - 1;

  const value = answers[step.id];
  const canNext = (() => {
    if (step.kind === "multi") {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return arr.length >= (step.min ?? 1);
    }
    if (step.kind === "single") return typeof value === "string" && !!value;
    if (step.kind === "scale") return typeof value === "number";
    return false;
  })();

  function setAns(v: unknown) { setAnswers((a) => ({ ...a, [step.id]: v })); }

  async function submit() {
    setSubmitting(true);
    try {
      await generate({ data: { responses: answers } });
      toast.success("Your career report is ready!");
      navigate({ to: "/report" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Step {i + 1} of {steps.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full untrap-gradient transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-card animate-in fade-in-50 slide-in-from-bottom-2">
        <h2 className="text-2xl font-bold tracking-tight">{step.title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{step.sub}</p>

        <div className="mt-6">
          {step.kind === "multi" && (
            <div className="flex flex-wrap gap-2">
              {step.options.map((opt) => {
                const arr = Array.isArray(value) ? (value as string[]) : [];
                const on = arr.includes(opt);
                return (
                  <button key={opt} type="button"
                    onClick={() => setAns(on ? arr.filter((x) => x !== opt) : [...arr, opt])}
                    className={cn("rounded-full border px-4 py-2 text-sm font-medium transition",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40")}>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
          {step.kind === "single" && (
            <div className="space-y-2">
              {step.options.map((opt) => {
                const on = value === opt;
                return (
                  <button key={opt} type="button" onClick={() => setAns(opt)}
                    className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                      on ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card hover:border-primary/40")}>
                    <span>{opt}</span>
                    <span className={cn("h-4 w-4 rounded-full border-2", on ? "border-primary bg-primary" : "border-border")} />
                  </button>
                );
              })}
            </div>
          )}
          {step.kind === "scale" && (
            <div className="space-y-4">
              <input type="range" min={0} max={100} value={typeof value === "number" ? value : 50}
                onChange={(e) => setAns(Number(e.target.value))}
                className="w-full accent-[color:var(--color-primary)]" />
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>{step.left}</span><span>{step.right}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground disabled:opacity-40">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {!isLast ? (
          <button onClick={() => setI((n) => n + 1)} disabled={!canNext}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-50">
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={!canNext || submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-sm font-semibold text-accent-foreground shadow-pop disabled:opacity-50">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Building your report…</> : <><Sparkles className="h-4 w-4" /> Get my report</>}
          </button>
        )}
      </div>
    </AppShell>
  );
}
