/**
 * Branch-rule DSL evaluator. Rules are stored as JSON in `ae_branch_rules`
 * and evaluated identically on client (for UX) and server (for truth).
 */
import type { Answer, BranchRule, Question } from "../types";

export function evaluateBranch(
  rule: BranchRule,
  answers: Map<string, Answer>,
  questions: Question[],
): Question | null {
  if (!matches(rule, answers)) return null;
  const t = rule.target;
  if (t.kind === "goto") {
    return questions.find((q) => q.id === t.questionId) ?? null;
  }
  if (t.kind === "skip") {
    const idx = questions.findIndex((q) => q.id === rule.sourceQuestionId);
    return questions[idx + 1 + Math.max(0, t.count)] ?? null;
  }
  if (t.kind === "showLayer") {
    return questions.find((q) => q.layerId === t.layerId) ?? null;
  }
  return null;
}

function matches(rule: BranchRule, answers: Map<string, Answer>): boolean {
  const { when } = rule;
  const answer = answers.get(when.questionId);
  const v = answer?.value ?? null;
  switch (when.op) {
    case "answered":
      return answer != null && !answer.skipped && v != null;
    case "skipped":
      return answer?.skipped === true;
    case "eq":
      return v === when.value;
    case "neq":
      return v !== when.value;
    case "in":
      return Array.isArray(when.value) && when.value.includes(v as never);
    case "not_in":
      return Array.isArray(when.value) && !when.value.includes(v as never);
    case "gte":
      return typeof v === "number" && typeof when.value === "number" && v >= when.value;
    case "lte":
      return typeof v === "number" && typeof when.value === "number" && v <= when.value;
    default:
      return false;
  }
}
