/**
 * Latent estimates → evidence-aware, non-clinical language.
 *
 * Bible 4.1 engineering note: latent values are never shown as scores. Copy
 * must be tentative ("your responses suggest…"), never deterministic, and must
 * never label the student. Only constructs with enough confidence speak.
 */
import type { CalibrationLabel, ConstructEstimate, Layer1Construct } from "../types/layer1";

const MIN_CONFIDENCE_TO_SPEAK = 0.4;
const HIGH = 0.66;
const LOW = 0.38;

const COPY: Record<Layer1Construct, { high: string; low: string; mid: string }> = {
  self_efficacy: {
    high: "Your responses suggest you tend to back yourself in unfamiliar situations, even without a guaranteed path.",
    low: "Your responses suggest you may prefer some reassurance or guidance before starting something unfamiliar.",
    mid: "Your responses suggest your willingness to start something unfamiliar depends a lot on the situation.",
  },
  curiosity: {
    high: "You appear to explore ideas well beyond what is required of you.",
    low: "Right now, most of your learning seems to happen inside what is required, rather than outside it.",
    mid: "You seem to explore new ideas selectively, when something genuinely catches your attention.",
  },
  intrinsic_motivation: {
    high: "Interest and mastery seem to pull you more than certificates or visible proof.",
    low: "Visible outcomes — marks, certificates, recognition — appear to matter to you at this stage.",
    mid: "You seem to weigh genuine interest against visible outcomes fairly evenly.",
  },
  persistence: {
    high: "You appear to stay with difficult work longer than most people do.",
    low: "Your responses suggest difficult work can lose your attention before it is finished.",
    mid: "You seem to persist when the work still feels worth it, and step away when it does not.",
  },
  adaptability: {
    high: "You seem comfortable changing your approach when better information appears.",
    low: "Once you commit to a plan, changing it mid-way appears to feel costly to you.",
    mid: "You appear willing to change plans, but you like to verify the change is worth it first.",
  },
  reflection: {
    high: "You appear to examine what went wrong before moving on, which is a genuine advantage.",
    low: "Your responses suggest you move forward quickly, without always pausing to review what happened.",
    mid: "You seem to reflect on setbacks sometimes, particularly when they matter to you.",
  },
  future_orientation: {
    high: "You appear willing to invest now for outcomes that arrive much later.",
    low: "Nearer-term needs appear to weigh more heavily on your choices at the moment.",
    mid: "You seem to balance immediate needs against longer-term investment.",
  },
  uncertainty_tolerance: {
    high: "Not having the full picture yet does not appear to unsettle you much.",
    low: "Not knowing the path yet appears to weigh on you — that is common, and it is workable.",
    mid: "You seem to tolerate uncertainty up to a point, especially when a first step is visible.",
  },
  achievement_orientation: {
    high: "You appear drawn to work that stretches you, even at the cost of a comfortable result.",
    low: "You appear to prefer work where the outcome feels reliable and achievable.",
    mid: "You seem to take on harder work when the support around you feels sufficient.",
  },
};

const CALIBRATION_COPY: Record<CalibrationLabel, string> = {
  underconfident:
    "Your behaviour suggests you are more capable than you currently give yourself credit for.",
  overconfident:
    "Your confidence currently runs ahead of your follow-through — closing that gap will be your biggest lever.",
  calibrated: "Your confidence appears to line up well with how you actually follow through.",
};

export function buildInsights(
  constructs: Partial<Record<Layer1Construct, ConstructEstimate>>,
  calibration: { label: CalibrationLabel; confidence: number } | null,
  limit = 4,
): string[] {
  const scored = (Object.entries(constructs) as [Layer1Construct, ConstructEstimate][])
    .filter(([, c]) => c.confidence >= MIN_CONFIDENCE_TO_SPEAK)
    // Speak first about what we understand best, and where the signal is clearest.
    .sort(
      (a, b) =>
        b[1].confidence * Math.abs(b[1].estimate - 0.5) -
        a[1].confidence * Math.abs(a[1].estimate - 0.5),
    );

  const lines: string[] = [];
  for (const [construct, est] of scored) {
    const copy = COPY[construct];
    if (!copy) continue;
    lines.push(est.estimate >= HIGH ? copy.high : est.estimate <= LOW ? copy.low : copy.mid);
    if (lines.length >= limit - 1) break;
  }

  if (calibration && calibration.confidence >= MIN_CONFIDENCE_TO_SPEAK) {
    lines.push(CALIBRATION_COPY[calibration.label]);
  }

  if (lines.length === 0) {
    lines.push(
      "We have made a careful start on understanding your patterns. The next layers will sharpen this considerably.",
    );
  }
  return lines.slice(0, limit);
}
