/**
 * UNTRAP Assessment Experience Engine — public type surface.
 *
 * These interfaces are the contract between the runtime (renderer, engine,
 * hooks), the server API, and future content authoring tools. They are
 * intentionally decoupled from the raw Supabase row shapes so that the
 * database schema can evolve without breaking the engine.
 */

// ---------- Locale-aware strings ----------
export type Locale = "en" | (string & {});
export type LocalizedText = Record<Locale, string>;

// ---------- Question types registry ----------
export const QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "likert",
  "priority_ranking",
  "drag_order",
  "slider",
  "timeline",
  "yes_no",
  "tag_selection",
  "scenario_cards",
  "reflection",
  "short_answer",
  "matrix",
  "image_choice",
  "voice_input",
  "file_upload",
] as const;
export type QuestionTypeId = (typeof QUESTION_TYPES)[number];

// ---------- Content ----------
export interface AssessmentDefinition {
  id: string;
  slug: string;
  title: string;
  description: string | null;
}

export interface AssessmentVersion {
  id: string;
  definitionId: string;
  version: number;
  isPublished: boolean;
  publishedAt: string | null;
}

export interface Layer {
  id: string;
  versionId: string;
  orderIndex: number;
  slug: string;
  title: string;
  purpose: string | null;
  estMinutes: number | null;
}

export interface Dimension {
  id: string;
  layerId: string;
  orderIndex: number;
  slug: string;
  title: string;
  description: string | null;
}

export interface QuestionOption {
  id: string;
  orderIndex: number;
  value: string;
  label: LocalizedText;
  meta: Record<string, unknown>;
}

export interface Question<TConfig = Record<string, unknown>> {
  id: string;
  versionId: string;
  layerId: string;
  dimensionId: string | null;
  orderIndex: number;
  slug: string;
  type: QuestionTypeId;
  prompt: LocalizedText;
  description: LocalizedText | null;
  helper: LocalizedText | null;
  required: boolean;
  config: TConfig;
  a11y: { role?: string; describe?: string };
  options: QuestionOption[];
}

// ---------- Branching DSL ----------
export type BranchOp = "eq" | "neq" | "in" | "not_in" | "gte" | "lte" | "answered" | "skipped";
export interface BranchCondition {
  questionId: string;
  op: BranchOp;
  value?: unknown;
}
export type BranchTarget =
  | { kind: "goto"; questionId: string }
  | { kind: "skip"; count: number }
  | { kind: "showLayer"; layerId: string };
export interface BranchRule {
  id: string;
  sourceQuestionId: string;
  when: BranchCondition;
  target: BranchTarget;
  orderIndex: number;
}

// ---------- Runtime ----------
export type SessionStatus = "in_progress" | "completed" | "abandoned";

export interface Session {
  id: string;
  userId: string;
  versionId: string;
  status: SessionStatus;
  currentLayerId: string | null;
  currentQuestionId: string | null;
  resumeToken: string;
  startedAt: string;
  completedAt: string | null;
  lastActivityAt: string;
}

export interface Answer<TValue = unknown> {
  id: string;
  sessionId: string;
  questionId: string;
  value: TValue | null;
  skipped: boolean;
  timeMs: number | null;
  clientUpdatedAt: string | null;
  serverUpdatedAt: string;
}

export interface Progress {
  sessionId: string;
  overallPct: number;
  answeredCount: number;
  remainingCount: number;
  confidenceScore: number | null;
  layerProgress: Record<string, { answered: number; total: number; pct: number }>;
}

// ---------- Validation ----------
export interface ValidationResult {
  ok: boolean;
  errors?: string[];
}

// ---------- Autosave ----------
export type AutosaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "retrying"; attempts: number }
  | { kind: "offline" }
  | { kind: "failed"; error: string }
  | { kind: "recovered" }
  | { kind: "synced" };

// ---------- Navigation ----------
export interface NavigationState {
  session: Session;
  currentQuestion: Question | null;
  currentLayer: Layer | null;
  hasPrev: boolean;
  hasNext: boolean;
}

// ---------- Question-type module contract ----------
import type { FC } from "react";

export interface QuestionRenderProps<TValue, TConfig> {
  question: Question<TConfig>;
  value: TValue | null;
  onChange: (value: TValue) => void;
  onCommit: () => void;
  disabled?: boolean;
}

export interface QuestionTypeModule<TValue = unknown, TConfig = Record<string, unknown>> {
  type: QuestionTypeId;
  Component: FC<QuestionRenderProps<TValue, TConfig>>;
  defaultValue: (cfg: TConfig) => TValue | null;
  validate: (value: TValue | null, cfg: TConfig, required: boolean) => ValidationResult;
  serialize: (value: TValue) => unknown;
  deserialize: (raw: unknown, cfg: TConfig) => TValue | null;
  a11y: { role: string; describe: (cfg: TConfig) => string };
}
