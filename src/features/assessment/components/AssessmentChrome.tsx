/**
 * Presentational chrome for the assessment: progress rail, save indicator,
 * and the question card shell. No content knowledge, no engine logic.
 */
import { Check, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Layer1Question, SaveState } from "../types/layer1";
import { getQuestionComponent, type QuestionComponentProps } from "../question-types";

export function ProgressRail({
  index,
  total,
  layerTitle,
}: {
  index: number;
  total: number;
  layerTitle: string;
}) {
  const pct = total === 0 ? 0 : Math.round(((index + 1) / total) * 100);
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {layerTitle}
        </p>
        <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">
          {index + 1} / {total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Assessment progress"
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SaveIndicator({ state }: { state: SaveState }) {
  const map: Record<SaveState["kind"], { icon: React.ReactNode; text: string; tone: string }> = {
    idle: { icon: null, text: "", tone: "" },
    saving: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      text: "Saving…",
      tone: "text-muted-foreground",
    },
    saved: { icon: <Check className="h-3.5 w-3.5" />, text: "Saved", tone: "text-muted-foreground" },
    retrying: {
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
      text: "Reconnecting…",
      tone: "text-muted-foreground",
    },
    failed: {
      icon: <CloudOff className="h-3.5 w-3.5" />,
      text: "Not saved — we'll retry",
      tone: "text-destructive",
    },
  };
  const s = map[state.kind];
  return (
    <p
      aria-live="polite"
      className={cn(
        "flex h-5 items-center gap-1.5 text-[12px] font-medium transition-opacity duration-300",
        s.tone,
        state.kind === "idle" && "opacity-0",
      )}
    >
      {s.icon}
      {s.text}
    </p>
  );
}

export function QuestionCard({
  question,
  ...rest
}: QuestionComponentProps & { error?: string | null }) {
  const Component = getQuestionComponent(question.type);
  return (
    <section
      key={question.slug}
      aria-labelledby={`q-${question.slug}-prompt`}
      className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-400"
    >
      <h2
        id={`q-${question.slug}-prompt`}
        className="text-balance text-[22px] font-bold leading-tight tracking-tight sm:text-2xl"
      >
        {question.prompt}
      </h2>
      {question.description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{question.description}</p>
      ) : null}

      <div className="mt-6">
        {Component ? (
          <Component question={question} {...rest} />
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            This question can't be shown right now. You can continue to the next one.
          </p>
        )}
      </div>

      {rest.error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-destructive">
          {rest.error}
        </p>
      ) : null}
    </section>
  );
}
