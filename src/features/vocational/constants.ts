// UNTRAP Vocational — shared constants (SIH26241).
// Bilingual copy: English primary, Hindi fallback mirrors. All copy is
// decision-support framing: no fabricated reassurance, no ranking.

export const CONCERN_CATEGORIES = [
  { value: "income", en: "Income", hi: "आमदनी" },
  { value: "job_security", en: "Job security", hi: "नौकरी की सुरक्षा" },
  { value: "social_perception", en: "Social perception", hi: "समाज की सोच" },
  { value: "safety", en: "Safety", hi: "सुरक्षा" },
  { value: "training_quality", en: "Training quality", hi: "ट्रेनिंग की गुणवत्ता" },
  { value: "training_cost", en: "Training cost", hi: "ट्रेनिंग की लागत" },
  { value: "distance", en: "Distance", hi: "दूरी" },
  { value: "migration", en: "Migration", hi: "घर से दूर जाना" },
  { value: "future_growth", en: "Future growth", hi: "आगे बढ़ना" },
  { value: "higher_education", en: "Higher education", hi: "आगे की पढ़ाई" },
  { value: "family_expectations", en: "Family expectations", hi: "परिवार की अपेक्षाएँ" },
  { value: "gender", en: "Gender-related concerns", hi: "लिंग से जुड़ी चिंताएँ" },
  { value: "government_recognition", en: "Government recognition", hi: "सरकारी मान्यता" },
  { value: "career_stability", en: "Career stability", hi: "करियर की स्थिरता" },
] as const;

export const NO_RANKING_LINE =
  "Different priorities may make different pathways more suitable.";
export const NO_RANKING_LINE_HI =
  "अलग-अलग प्राथमिकताओं के हिसाब से अलग रास्ते ज़्यादा उपयुक्त हो सकते हैं।";

export const UNAVAILABLE_EVIDENCE =
  "Verified data unavailable for this location/trade.";
export const UNAVAILABLE_EVIDENCE_HI =
  "इस जगह/ट्रेड के लिए सत्यापित डेटा उपलब्ध नहीं है।";

export const DECISION_SUPPORT_LINE =
  "Saarthi and UNTRAP support your family's decision — they never decide for you.";
export const DECISION_SUPPORT_LINE_HI =
  "सारथी और UNTRAP आपके परिवार के फ़ैसले में मदद करते हैं — फ़ैसला आपका ही होता है।";

export const COUNSELLOR_TRIGGERS = [
  "Verified information is unavailable for your question",
  "Family disagreement remains unresolved",
  "You explicitly want to talk to a human",
  "High uncertainty about the right pathway",
  "Sensitive or complex family circumstances",
] as const;

export type Lang = "en" | "hi";

export function concernLabel(value: string, lang: Lang): string {
  const c = CONCERN_CATEGORIES.find((x) => x.value === value);
  if (!c) return value;
  return lang === "hi" ? c.hi : c.en;
}

export const TRADE_SECTORS = [
  "Power & Construction",
  "Manufacturing",
  "Healthcare",
  "Beauty & Wellness",
  "Automotive",
] as const;
