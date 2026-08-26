/**
 * Response → Evidence interpretation (Assessment Bible, Chapter 8.2).
 *
 * A response is transient; evidence persists. Every interpreted signal carries
 * a construct, a strength (0..1), a weight (relative influence) and a
 * confidence (reliability of the interpretation), and is traceable to the
 * question and answer that produced it. One response may produce evidence for
 * several constructs (primary + secondary).
 */
import type { Layer1Answer, Layer1Question, SignalSpec } from "../types/layer1";

export interface EvidenceObject extends SignalSpec {
  questionId: string;
  questionSlug: string;
  kind: "primary" | "secondary";
  source: string;
}

/** Interpretation reliability per interaction format. */
const SOURCE_CONFIDENCE: Record<string, number> = {
  single_choice: 0.8, // behavioural scenario / forced trade-off
  multiple_choice: 0.7, // recalled behaviour, self-selected
  priority_ranking: 0.78,
  slider: 0.6, // self-report — deliberately weaker than behaviour
  reflection: 0.0, // free text is never scored
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function parseSignals(raw: unknown): SignalSpec[] {
  if (!Array.isArray(raw)) return [];
  const out: SignalSpec[] = [];
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [construct, strength, weight] = entry as [string, number, number?];
    if (typeof construct !== "string" || typeof strength !== "number") continue;
    out.push({ construct, strength: clamp01(strength), weight: typeof weight === "number" ? weight : 1 });
  }
  return out;
}

/**
 * Derives evidence for a single answered interaction. Returns an empty list for
 * skipped answers, free-text reflections and unrecognised values.
 */
export function deriveEvidence(question: Layer1Question, answer: Layer1Answer): EvidenceObject[] {
  if (answer.skipped || answer.value == null) return [];
  const confidence = SOURCE_CONFIDENCE[question.type] ?? 0.5;
  if (confidence <= 0) return [];

  const emit = (signals: SignalSpec[], factor = 1): EvidenceObject[] =>
    signals.map((s, idx) => ({
      construct: s.construct,
      strength: clamp01(s.strength),
      weight: Math.max(0.05, s.weight * factor),
      confidence,
      questionId: question.id,
      questionSlug: question.slug,
      kind: idx === 0 ? "primary" : "secondary",
      source: question.type,
    }));

  switch (question.type) {
    case "single_choice": {
      const option = question.options.find((o) => o.value === answer.value);
      return option ? emit(option.signals) : [];
    }
    case "multiple_choice": {
      const chosen = Array.isArray(answer.value) ? answer.value : [];
      const selected = question.options.filter((o) => chosen.includes(o.value));
      if (selected.length === 0) return [];
      // Multi-select spreads influence: each selection contributes a share so
      // that picking everything does not inflate a construct.
      const factor = 1 / Math.sqrt(selected.length);
      return selected.flatMap((o) => emit(o.signals, factor));
    }
    case "slider": {
      const min = question.config.min ?? 0;
      const max = question.config.max ?? 100;
      const raw = typeof answer.value === "number" ? answer.value : min;
      const normalised = clamp01(max === min ? 0 : (raw - min) / (max - min));
      const specs = (question.config.signals ?? []).map(([construct, weight]) => ({
        construct,
        strength: normalised,
        weight: typeof weight === "number" ? weight : 1,
      }));
      return emit(specs);
    }
    case "priority_ranking": {
      const order = Array.isArray(answer.value) ? answer.value : [];
      const rankSignals = question.config.rankSignals ?? {};
      const n = order.length || 1;
      const out: EvidenceObject[] = [];
      order.forEach((value, index) => {
        const specs = parseSignals(rankSignals[value]);
        if (specs.length === 0) return;
        // Position factor: top of the ranking carries full weight, bottom the
        // least. Strength itself stays as authored; only influence scales.
        const positionFactor = (n - index) / n;
        out.push(...emit(specs, positionFactor));
      });
      return out;
    }
    default:
      return [];
  }
}

export function deriveAllEvidence(
  questions: Layer1Question[],
  answers: Layer1Answer[],
): EvidenceObject[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return answers.flatMap((a) => {
    const q = byId.get(a.questionId);
    return q ? deriveEvidence(q, a) : [];
  });
}
