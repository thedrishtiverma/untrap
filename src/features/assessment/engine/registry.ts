/**
 * Question type registry. Phase 0 ships the registry contract only; each
 * type module registers itself in Phase 1. The engine reads only through
 * `getQuestionTypeModule` — routes and renderers never import type modules
 * directly.
 */
import type { QuestionTypeId, QuestionTypeModule } from "../types";

const registry = new Map<QuestionTypeId, QuestionTypeModule>();

export function registerQuestionType(mod: QuestionTypeModule): void {
  registry.set(mod.type, mod);
}

export function getQuestionTypeModule(type: QuestionTypeId): QuestionTypeModule | undefined {
  return registry.get(type);
}

export function listRegisteredTypes(): QuestionTypeId[] {
  return Array.from(registry.keys());
}
