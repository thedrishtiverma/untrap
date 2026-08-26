/**
 * Adaptive engine (Layer 1).
 *
 * The only adaptive mechanism used by Layer 1 is conditional disclosure of
 * follow-up interactions, declared as `config.showIf` on the question row in
 * the database. No branching rule is invented in code: if the rule is not in
 * the content, the question is always shown.
 */
import type { AnswerValue, Layer1Answer, Layer1Question, ShowIfRule } from "../types/layer1";

export function answerMap(answers: Layer1Answer[]): Map<string, Layer1Answer> {
  return new Map(answers.map((a) => [a.questionSlug, a]));
}

function ruleMatches(rule: ShowIfRule, answers: Map<string, Layer1Answer>): boolean {
  const answer = answers.get(rule.questionSlug);
  if (!answer || answer.skipped) return false;
  const v: AnswerValue = answer.value;
  switch (rule.op) {
    case "answered":
      return v != null;
    case "eq":
      return v === rule.value;
    case "in": {
      const set = Array.isArray(rule.value) ? (rule.value as unknown[]) : [];
      if (Array.isArray(v)) return v.some((x) => set.includes(x));
      return set.includes(v);
    }
    case "lte":
      return typeof v === "number" && typeof rule.value === "number" && v <= rule.value;
    case "gte":
      return typeof v === "number" && typeof rule.value === "number" && v >= rule.value;
    default:
      return false;
  }
}

export function isVisible(question: Layer1Question, answers: Map<string, Layer1Answer>): boolean {
  const rule = question.config?.showIf;
  if (!rule) return true;
  return ruleMatches(rule, answers);
}

/** Ordered list of questions currently in play, given the answers so far. */
export function visibleQuestions(
  questions: Layer1Question[],
  answers: Layer1Answer[],
): Layer1Question[] {
  const map = answerMap(answers);
  return questions.filter((q) => isVisible(q, map));
}

/** True when every required, currently-visible question has a usable answer. */
export function isLayerComplete(questions: Layer1Question[], answers: Layer1Answer[]): boolean {
  const map = answerMap(answers);
  return visibleQuestions(questions, answers).every((q) => {
    if (!q.required) return true;
    const a = map.get(q.slug);
    return !!a && !a.skipped && hasValue(a.value);
  });
}

export function hasValue(v: AnswerValue): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

/** Validation shared by client and server — the server is the source of truth. */
export function validateAnswerValue(
  question: Layer1Question,
  value: AnswerValue,
): { ok: true } | { ok: false; error: string } {
  if (!hasValue(value)) {
    return question.required
      ? { ok: false, error: "Please choose an answer to continue." }
      : { ok: true };
  }
  switch (question.type) {
    case "single_choice":
      return typeof value === "string" && question.options.some((o) => o.value === value)
        ? { ok: true }
        : { ok: false, error: "That option is not available." };
    case "multiple_choice": {
      if (!Array.isArray(value)) return { ok: false, error: "Please select your options again." };
      const allowed = new Set(question.options.map((o) => o.value));
      return value.every((v) => allowed.has(v))
        ? { ok: true }
        : { ok: false, error: "One of those options is not available." };
    }
    case "slider": {
      const min = question.config.min ?? 0;
      const max = question.config.max ?? 100;
      return typeof value === "number" && value >= min && value <= max
        ? { ok: true }
        : { ok: false, error: "Please move the slider to a valid position." };
    }
    case "priority_ranking": {
      if (!Array.isArray(value)) return { ok: false, error: "Please order the options again." };
      const allowed = new Set(question.options.map((o) => o.value));
      const unique = new Set(value);
      return value.length === allowed.size &&
        unique.size === value.length &&
        value.every((v) => allowed.has(v))
        ? { ok: true }
        : { ok: false, error: "Please include every option exactly once." };
    }
    case "reflection": {
      if (typeof value !== "string") return { ok: false, error: "Please write your answer as text." };
      const maxLength = question.config.maxLength ?? 500;
      return value.length <= maxLength
        ? { ok: true }
        : { ok: false, error: `Please keep this under ${maxLength} characters.` };
    }
    default:
      return { ok: false, error: "This question could not be loaded. Please refresh." };
  }
}
