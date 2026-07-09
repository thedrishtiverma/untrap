/**
 * Pure navigation helpers. Given the ordered question list, the current
 * answers, and any branch rules, decide the next/previous question. All
 * functions are deterministic and side-effect-free so they can be unit
 * tested and run identically on client and server.
 */
import type { Answer, BranchRule, Question } from "../types";
import { evaluateBranch } from "./branching";

export function getQuestionIndex(questions: Question[], questionId: string | null): number {
  if (!questionId) return -1;
  return questions.findIndex((q) => q.id === questionId);
}

export function getNextQuestion(
  questions: Question[],
  answers: Map<string, Answer>,
  rules: BranchRule[],
  currentQuestionId: string | null,
): Question | null {
  if (questions.length === 0) return null;
  const idx = getQuestionIndex(questions, currentQuestionId);

  // Apply first matching branch rule from the current question.
  if (idx >= 0) {
    const currentId = questions[idx].id;
    const applicable = rules
      .filter((r) => r.sourceQuestionId === currentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    for (const rule of applicable) {
      const outcome = evaluateBranch(rule, answers, questions);
      if (outcome) return outcome;
    }
  }

  const nextIdx = idx + 1;
  return questions[nextIdx] ?? null;
}

export function getPrevQuestion(
  questions: Question[],
  currentQuestionId: string | null,
): Question | null {
  const idx = getQuestionIndex(questions, currentQuestionId);
  if (idx <= 0) return null;
  return questions[idx - 1] ?? null;
}
