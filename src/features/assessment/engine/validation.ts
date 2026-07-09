/**
 * Client- and server-shared validation entry point. Dispatches to the
 * registered question-type module's `validate`. Server calls this too — it
 * is the single source of truth for whether an answer is acceptable.
 */
import type { Question, ValidationResult } from "../types";
import { getQuestionTypeModule } from "./registry";

export function validateAnswer(
  question: Question,
  value: unknown,
  required = question.required,
): ValidationResult {
  const mod = getQuestionTypeModule(question.type);
  if (!mod) {
    return { ok: false, errors: [`Unknown question type: ${question.type}`] };
  }
  return mod.validate(value as never, question.config as never, required);
}
