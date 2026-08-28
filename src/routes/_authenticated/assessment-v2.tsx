import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useLayer1Assessment } from "@/features/assessment/hooks/useLayer1Assessment";
import {
  ProgressRail,
  QuestionCard,
  SaveIndicator,
} from "@/features/assessment/components/AssessmentChrome";
import { autoAdvances } from "@/features/assessment/question-types";

export const Route = createFileRoute("/_authenticated/assessment-v2")({
  head: () => ({
    meta: [
      { title: "Student Intelligence Assessment · UNTRAP" },
      {
        name: "description",
        content:
          "Layer 1 of the UNTRAP Student Intelligence Assessment — a reflective, adaptive conversation about how you think and decide.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentV2,
});

function AssessmentV2() {
  const a = useLayer1Assessment();

  if (a.stage === "loading") {
    return (
      <AppShell>
        <h1 className="sr-only">Student Intelligence Assessment</h1>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium">Preparing your assessment…</p>
        </div>
      </AppShell>
    );
  }

  if (a.stage === "error" || !a.content) {
    return (
      <AppShell>
        <h1 className="text-2xl font-bold tracking-tight">We hit a snag</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {a.error ?? "The assessment could not be loaded right now."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-foreground px-5 py-3 text-sm font-semibold text-background"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </AppShell>
    );
  }

  if (a.stage === "welcome") {
    return (
      <AppShell>
        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Layer 1 of your journey
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
            {a.content.layer.title}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {a.content.layer.purpose ??
              "This isn't a test and there are no right answers. We're learning how you think, decide and keep going — so the guidance you get later actually fits you."}
          </p>
          <ul className="mt-8 space-y-3 text-[15px]">
            {[
              `About ${a.content.layer.estMinutes ?? 10} minutes — you can pause anytime`,
              "Every answer saves itself, so you can come back later",
              "No scores or labels. Only patterns, in your own words",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                <span className="leading-snug text-foreground/85">{t}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={a.beginQuestions}
            className="mt-9 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-[15px] font-semibold text-background shadow-pop transition motion-safe:hover:-translate-y-0.5 sm:w-auto"
          >
            Begin <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </AppShell>
    );
  }

  if (a.stage === "completing") {
    return (
      <AppShell>
        <h1 className="sr-only">Building your intelligence profile</h1>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/70" />
          <p className="text-[15px] font-semibold">Reading your patterns…</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            We're turning your answers into evidence, not a score.
          </p>
        </div>
      </AppShell>
    );
  }

  if (a.stage === "done") {
    return (
      <AppShell>
        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Layer 1 complete
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold leading-[1.1] tracking-tight">
            Here's what we noticed about how you work
          </h1>
          {a.profile?.insights?.length ? (
            <ul className="mt-7 space-y-3">
              {a.profile.insights.map((insight) => (
                <li
                  key={insight}
                  className="rounded-2xl border-2 border-border bg-card px-5 py-4 text-[15px] leading-relaxed"
                >
                  {insight}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Your responses are saved. Your profile will keep sharpening as more layers open up.
            </p>
          )}
          {a.profile ? (
            <p className="mt-5 text-[13px] text-muted-foreground">
              Based on {a.profile.evidenceCount} signals across {a.profile.dimensionsMeasured}{" "}
              dimensions. This is a working picture, not a verdict.
            </p>
          ) : null}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-[15px] font-semibold text-background shadow-pop"
            >
              <Sparkles className="h-4 w-4" /> Go to my dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const q = a.current;
  if (!q) {
    return (
      <AppShell>
        <h1 className="text-2xl font-bold tracking-tight">You've answered everything</h1>
        <button
          type="button"
          onClick={a.submit}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-sm font-semibold text-background"
        >
          <Sparkles className="h-4 w-4" /> See what we found
        </button>
      </AppShell>
    );
  }

  const answer = a.answerFor(q.slug);
  const showFinish = a.isLastVisible;

  return (
    <AppShell>
      <h1 className="sr-only">Student Intelligence Assessment — {a.content.layer.title}</h1>
      <div className="mx-auto max-w-2xl">
        <ProgressRail index={a.index} total={a.visibleCount} layerTitle={a.content.layer.title} />

        <div className="mt-8 rounded-3xl border border-border bg-card/60 p-5 shadow-card sm:p-7">
          <QuestionCard
            question={q}
            value={answer?.skipped ? null : (answer?.value ?? null)}
            error={a.fieldError}
            onChange={(v) => a.onChange(q, v)}
            onCommit={(v) => {
              a.onCommit(q, v);
              if (autoAdvances(q.type)) window.setTimeout(() => void a.goNext(), 260);
            }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <SaveIndicator state={a.saveState} />
          {!q.required ? (
            <button
              type="button"
              onClick={() => void a.goNext()}
              className="rounded-full px-3 py-2 text-[13px] font-semibold text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
            >
              Skip this one
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={a.goPrev}
            disabled={a.index === 0}
            aria-label="Previous question"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-border text-foreground/70 transition hover:bg-foreground/5 disabled:opacity-35"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {showFinish ? (
            <button
              type="button"
              onClick={() => void a.submit()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-[15px] font-semibold text-background shadow-pop transition motion-safe:hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" /> Finish Layer 1
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void a.goNext()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-[15px] font-semibold text-background shadow-pop transition motion-safe:hover:-translate-y-0.5"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
