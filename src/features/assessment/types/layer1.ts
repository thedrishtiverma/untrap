/**
 * Layer 1 — Psychological Intelligence runtime contracts.
 *
 * Content lives in the database (`ae_layers` / `ae_dimensions` / `ae_questions`
 * / `ae_question_options`) and is resolved to these plain, locale-flattened
 * shapes by the server functions in `../api/layer1.functions.ts`. The UI never
 * hardcodes questions and never sees raw row shapes.
 */

export const LAYER1_SLUG = "psychological-intelligence";
export const LAYER1_VERSION = "v1.0";

/** Constructs measured by Layer 1 (Assessment Bible, Chapter 4.1). */
export const LAYER1_CONSTRUCTS = [
  "self_efficacy",
  "curiosity",
  "intrinsic_motivation",
  "persistence",
  "adaptability",
  "reflection",
  "future_orientation",
  "uncertainty_tolerance",
  "achievement_orientation",
] as const;
export type Layer1Construct = (typeof LAYER1_CONSTRUCTS)[number];

/** Auxiliary signals used only to derive confidence calibration. */
export const CALIBRATION_SIGNALS = ["self_reported_confidence", "behavioural_followthrough"] as const;

export type Layer1QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "slider"
  | "priority_ranking"
  | "reflection";

export interface SignalSpec {
  construct: string;
  strength: number; // 0..1 evidence strength implied by this choice
  weight: number; // relative influence of this signal
}

export interface Layer1Option {
  id: string;
  value: string;
  label: string;
  signals: SignalSpec[];
}

export interface ShowIfRule {
  questionSlug: string;
  op: "eq" | "in" | "lte" | "gte" | "answered";
  value?: unknown;
}

export interface Layer1QuestionConfig {
  showIf?: ShowIfRule;
  min?: number;
  max?: number;
  step?: number;
  default?: number;
  leftLabel?: string;
  rightLabel?: string;
  /** slider: [construct, weight, "linear"][] */
  signals?: [string, number, string][];
  /** priority_ranking: option value -> [construct, strength, weight][] */
  rankSignals?: Record<string, [string, number, number][]>;
  maxLength?: number;
  rows?: number;
}

export interface Layer1Question {
  id: string;
  slug: string;
  type: Layer1QuestionType;
  orderIndex: number;
  required: boolean;
  prompt: string;
  description: string | null;
  dimensionSlug: string | null;
  config: Layer1QuestionConfig;
  options: Layer1Option[];
}

export interface Layer1Content {
  versionId: string;
  assessmentVersion: number;
  layer: { id: string; slug: string; title: string; purpose: string | null; estMinutes: number | null };
  dimensions: { slug: string; title: string; description: string | null }[];
  questions: Layer1Question[];
}

/** Answer value shapes per question type. */
export type AnswerValue = string | string[] | number | null;

export interface Layer1Answer {
  questionId: string;
  questionSlug: string;
  value: AnswerValue;
  skipped: boolean;
}

export interface Layer1SessionState {
  sessionId: string;
  status: "in_progress" | "completed" | "abandoned";
  currentQuestionSlug: string | null;
  answers: Layer1Answer[];
  startedAt: string;
  completedAt: string | null;
}

export interface ConstructEstimate {
  estimate: number; // latent 0..1 — internal, never shown as a score
  confidence: number; // 0..1 certainty of our own understanding
  evidenceCount: number;
}

export type CalibrationLabel = "underconfident" | "calibrated" | "overconfident";

export interface Layer1Profile {
  layerSlug: string;
  layerVersion: string;
  constructs: Partial<Record<Layer1Construct, ConstructEstimate>>;
  calibration: { label: CalibrationLabel; confidence: number } | null;
  insights: string[];
  overallConfidence: number;
  dimensionsMeasured: number;
  evidenceCount: number;
  completedAt: string | null;
}

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "retrying"; attempt: number }
  | { kind: "failed" };
