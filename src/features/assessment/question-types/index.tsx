/**
 * Question-type registry. The renderer resolves components through
 * `getQuestionComponent`; nothing in the UI knows about individual question
 * content. Adding a type for a future layer means adding a module here only.
 */
import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnswerValue, Layer1Question, Layer1QuestionType } from "../types/layer1";

export interface QuestionComponentProps {
  question: Layer1Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  /** Commit immediately (e.g. a discrete choice) rather than debounced. */
  onCommit: (value: AnswerValue) => void;
  disabled?: boolean;
}

const cardBase =
  "group relative flex w-full cursor-pointer items-start gap-3 rounded-2xl border-2 bg-card px-4 py-4 text-left transition-all duration-200 hover:border-foreground/25 motion-safe:hover:-translate-y-0.5";
const cardOff = "border-border";
const cardOn = "border-foreground bg-foreground/[0.04] shadow-card";
const focusRing =
  "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background";

function Marker({ on, shape }: { on: boolean; shape: "round" | "square" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 transition",
        shape === "round" ? "rounded-full" : "rounded-md",
        on ? "border-foreground bg-foreground text-background" : "border-border bg-background",
      )}
    >
      {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
}

const SingleChoice: FC<QuestionComponentProps> = ({ question, value, onCommit, disabled }) => (
  <div className="space-y-2.5" role="group" aria-labelledby={`q-${question.slug}-prompt`}>
    {question.options.map((opt) => {
      const on = value === opt.value;
      return (
        <label key={opt.id} className="block">
          <input
            type="radio"
            name={question.slug}
            value={opt.value}
            checked={on}
            disabled={disabled}
            onChange={() => onCommit(opt.value)}
            className="peer sr-only"
          />
          <span className={cn(cardBase, on ? cardOn : cardOff, focusRing, disabled && "opacity-60")}>
            <Marker on={on} shape="round" />
            <span className="text-[15px] font-medium leading-snug text-foreground">{opt.label}</span>
            {on ? <span className="sr-only">Selected</span> : null}
          </span>
        </label>
      );
    })}
  </div>
);

const MultipleChoice: FC<QuestionComponentProps> = ({ question, value, onChange, disabled }) => {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="space-y-2.5" role="group" aria-labelledby={`q-${question.slug}-prompt`}>
      {question.options.map((opt) => {
        const on = selected.includes(opt.value);
        return (
          <label key={opt.id} className="block">
            <input
              type="checkbox"
              checked={on}
              disabled={disabled}
              onChange={() =>
                onChange(on ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])
              }
              className="peer sr-only"
            />
            <span className={cn(cardBase, on ? cardOn : cardOff, focusRing, disabled && "opacity-60")}>
              <Marker on={on} shape="square" />
              <span className="text-[15px] font-medium leading-snug text-foreground">{opt.label}</span>
              {on ? <span className="sr-only">Selected</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
};

const Slider: FC<QuestionComponentProps> = ({ question, value, onChange, disabled }) => {
  const min = question.config.min ?? 0;
  const max = question.config.max ?? 100;
  const step = question.config.step ?? 1;
  const current = typeof value === "number" ? value : (question.config.default ?? Math.round((min + max) / 2));

  useEffect(() => {
    if (typeof value !== "number") onChange(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = max === min ? 0 : ((current - min) / (max - min)) * 100;

  return (
    <div className="space-y-5">
      <div className="relative pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled}
          aria-labelledby={`q-${question.slug}-prompt`}
          aria-valuetext={`${Math.round(pct)} percent towards "${question.config.rightLabel ?? "the right"}"`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 w-full cursor-pointer appearance-none bg-transparent accent-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        />
        <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between gap-6 text-[13px] font-medium text-muted-foreground">
        <span className="max-w-[45%]">{question.config.leftLabel}</span>
        <span className="max-w-[45%] text-right">{question.config.rightLabel}</span>
      </div>
    </div>
  );
};

const PriorityRanking: FC<QuestionComponentProps> = ({ question, value, onChange, disabled }) => {
  const initial = useMemo(() => question.options.map((o) => o.value), [question.options]);
  const order = Array.isArray(value) && value.length === initial.length ? value : initial;
  const labels = useMemo(
    () => new Map(question.options.map((o) => [o.value, o.label])),
    [question.options],
  );
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!Array.isArray(value) || value.length !== initial.length) onChange(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setAnnouncement(`${labels.get(next[target])} moved to position ${target + 1} of ${next.length}`);
  }

  return (
    <div className="space-y-2.5">
      <ol className="space-y-2.5">
        {order.map((v, index) => (
          <li
            key={v}
            className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
              {index + 1}
            </span>
            <span className="flex-1 text-[15px] font-medium leading-snug">{labels.get(v)}</span>
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
                aria-label={`Move ${labels.get(v)} up`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground/70 transition hover:bg-foreground/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={disabled || index === order.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`Move ${labels.get(v)} down`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground/70 transition hover:bg-foreground/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
};

const Reflection: FC<QuestionComponentProps> = ({ question, value, onChange, disabled }) => {
  const maxLength = question.config.maxLength ?? 500;
  const text = typeof value === "string" ? value : "";
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        value={text}
        rows={question.config.rows ?? 4}
        maxLength={maxLength}
        disabled={disabled}
        aria-labelledby={`q-${question.slug}-prompt`}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write as much or as little as you like…"
        className="w-full resize-y rounded-2xl border-2 border-border bg-card px-4 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <p className="text-right text-xs font-medium text-muted-foreground">
        {text.length}/{maxLength}
      </p>
    </div>
  );
};

const REGISTRY: Record<Layer1QuestionType, FC<QuestionComponentProps>> = {
  single_choice: SingleChoice,
  multiple_choice: MultipleChoice,
  slider: Slider,
  priority_ranking: PriorityRanking,
  reflection: Reflection,
};

export function getQuestionComponent(type: Layer1QuestionType): FC<QuestionComponentProps> | null {
  return REGISTRY[type] ?? null;
}

/** Types that should advance on their own once answered. */
export function autoAdvances(type: Layer1QuestionType): boolean {
  return type === "single_choice";
}
