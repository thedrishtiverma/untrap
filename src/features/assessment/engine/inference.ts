/**
 * Evidence → latent construct estimates (Assessment Bible, Chapters 8.1–8.2).
 *
 * UNTRAP does not score students; it scores its own understanding. Each
 * construct therefore carries an `estimate` (weighted evidence position, 0..1)
 * and a `confidence` (how much reliable, consistent evidence supports it).
 * These are internal latent values — user-facing copy is generated as
 * evidence-aware natural language in `insights.ts`.
 *
 * Aggregation (documented implementation of the Bible's evidence weighting):
 *   effectiveWeight_i = weight_i * confidence_i
 *   estimate          = Σ(strength_i * effectiveWeight_i) / Σ effectiveWeight_i
 *   confidence        = coverage * consistency
 *     coverage    = min(1, Σ effectiveWeight_i / TARGET_WEIGHT)
 *     consistency = 1 - min(0.45, weighted variance * 2)
 */
import {
  CALIBRATION_SIGNALS,
  LAYER1_CONSTRUCTS,
  type CalibrationLabel,
  type ConstructEstimate,
  type Layer1Construct,
} from "../types/layer1";
import type { EvidenceObject } from "./evidence";

/** Effective weight at which a construct is considered well covered. */
const TARGET_WEIGHT = 2.2;
const MIN_CONFIDENCE = 0.25;
const MAX_CONFIDENCE = 0.93;

function aggregate(evidence: EvidenceObject[]): ConstructEstimate | null {
  if (evidence.length === 0) return null;
  let sumW = 0;
  let sumSW = 0;
  for (const e of evidence) {
    const w = e.weight * e.confidence;
    sumW += w;
    sumSW += e.strength * w;
  }
  if (sumW <= 0) return null;
  const estimate = sumSW / sumW;

  let variance = 0;
  for (const e of evidence) {
    const w = e.weight * e.confidence;
    variance += w * (e.strength - estimate) ** 2;
  }
  variance = variance / sumW;

  const coverage = Math.min(1, sumW / TARGET_WEIGHT);
  const consistency = 1 - Math.min(0.45, variance * 2);
  const confidence = Math.min(
    MAX_CONFIDENCE,
    Math.max(MIN_CONFIDENCE, coverage * consistency),
  );

  return {
    estimate: round(estimate),
    confidence: round(confidence),
    evidenceCount: evidence.length,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface InferenceResult {
  constructs: Partial<Record<Layer1Construct, ConstructEstimate>>;
  calibration: { label: CalibrationLabel; confidence: number } | null;
  overallConfidence: number;
  dimensionsMeasured: number;
  evidenceCount: number;
}

export function inferLayer1(evidence: EvidenceObject[]): InferenceResult {
  const grouped = new Map<string, EvidenceObject[]>();
  for (const e of evidence) {
    const bucket = grouped.get(e.construct);
    if (bucket) bucket.push(e);
    else grouped.set(e.construct, [e]);
  }

  const constructs: Partial<Record<Layer1Construct, ConstructEstimate>> = {};
  for (const construct of LAYER1_CONSTRUCTS) {
    const agg = aggregate(grouped.get(construct) ?? []);
    if (agg) constructs[construct] = agg;
  }

  const aux: Partial<Record<string, ConstructEstimate>> = {};
  for (const signal of CALIBRATION_SIGNALS) {
    const agg = aggregate(grouped.get(signal) ?? []);
    if (agg) aux[signal] = agg;
  }

  const calibration = inferCalibration(constructs, aux);

  const measured = Object.values(constructs);
  const overallConfidence = measured.length
    ? round(measured.reduce((s, c) => s + c.confidence, 0) / measured.length)
    : 0;

  return {
    constructs,
    calibration,
    overallConfidence,
    dimensionsMeasured: measured.length + (calibration ? 1 : 0),
    evidenceCount: evidence.length,
  };
}

/**
 * Confidence calibration (Bible 4.1, dimension 10): compares stated confidence
 * against behavioural evidence — follow-through, persistence and self-efficacy
 * observed in scenarios — instead of measuring confidence alone.
 */
function inferCalibration(
  constructs: Partial<Record<Layer1Construct, ConstructEstimate>>,
  aux: Partial<Record<string, ConstructEstimate>>,
): { label: CalibrationLabel; confidence: number } | null {
  const stated = aux["self_reported_confidence"];
  if (!stated) return null;

  const behavioural: ConstructEstimate[] = [
    aux["behavioural_followthrough"],
    constructs.persistence,
    constructs.self_efficacy,
  ].filter((x): x is ConstructEstimate => !!x);

  if (behavioural.length === 0) return null;

  let sumW = 0;
  let sumSW = 0;
  for (const b of behavioural) {
    sumW += b.confidence;
    sumSW += b.estimate * b.confidence;
  }
  const observed = sumSW / sumW;
  const delta = stated.estimate - observed;

  const label: CalibrationLabel =
    delta > 0.18 ? "overconfident" : delta < -0.18 ? "underconfident" : "calibrated";

  const confidence = round(
    Math.min(MAX_CONFIDENCE, stated.confidence * (sumW / behavioural.length)),
  );
  return { label, confidence };
}
