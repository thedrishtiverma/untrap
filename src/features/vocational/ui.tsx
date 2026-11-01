import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, ArrowDown, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  UNAVAILABLE_EVIDENCE,
  UNAVAILABLE_EVIDENCE_HI,
  type Lang,
} from "./constants";

/** Language for vocational pages: defaults to the learner's profile language. */
export function useVocLang() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.language === "Hindi") setLang("hi");
    })();
  }, []);
  return { lang, setLang };
}

export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs font-semibold">
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={cn(
            "rounded-full px-3 py-1 transition",
            lang === l ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground",
          )}
        >
          {l === "en" ? "English" : "हिंदी"}
        </button>
      ))}
    </div>
  );
}

export const VOC_TABS = [
  { to: "/vocational", label: "Vocational", labelHi: "वोकेशनल" },
  { to: "/vocational/trades", label: "Explore Trades", labelHi: "ट्रेड्स देखें" },
  { to: "/vocational/compare", label: "Compare", labelHi: "तुलना" },
  { to: "/vocational/family", label: "Family Room", labelHi: "फैमिली रूम" },
  { to: "/vocational/counsellor", label: "Counsellor", labelHi: "काउंसलर" },
] as const;

export function VocationalTabs({ lang }: { lang: Lang }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Vocational sections">
      {VOC_TABS.map((t) => {
        const active = t.to === "/vocational" ? path === t.to : path.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
              active
                ? "border-transparent bg-foreground text-background shadow-pop"
                : "border-border bg-card text-foreground/60 hover:text-foreground",
            )}
          >
            {lang === "hi" ? t.labelHi : t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export interface VerifiedMetric {
  id: string;
  metric_type: string;
  label: string;
  value_text: string;
  last_updated: string;
  verification_status: string;
  source_name?: string | null;
  source_url?: string | null;
  location_state?: string | null;
  location_district?: string | null;
}

/** A verified outcome claim with visible source + date, or an honest unavailable state. */
export function EvidenceBlock({ metrics, lang }: { metrics: VerifiedMetric[]; lang: Lang }) {
  const unavailable = lang === "hi" ? UNAVAILABLE_EVIDENCE_HI : UNAVAILABLE_EVIDENCE;
  if (!metrics.length) {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm leading-relaxed text-muted-foreground">{unavailable}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {metrics.map((m) => (
        <li key={m.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {m.metric_type.replace(/_/g, " ")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <BadgeCheck className="h-3 w-3" /> Verified
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed">
            <span className="text-muted-foreground">{m.label}: </span>
            <span className="font-semibold">{m.value_text}</span>
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {m.location_state ? `${m.location_district ? `${m.location_district}, ` : ""}${m.location_state} · ` : ""}
            Source:{" "}
            {m.source_url ? (
              <a href={m.source_url} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
                {m.source_name ?? "reference"}
              </a>
            ) : (
              <span className="font-medium">{m.source_name ?? "reference"}</span>
            )}
            {" "}· Last updated: {m.last_updated}
          </p>
        </li>
      ))}
    </ul>
  );
}

export interface PathwayStage {
  id: string;
  order_index: number;
  stage: string;
  explanation: string | null;
}

/** Plain-language NSQF-style progression: TRAINING → … with no jargon. */
export function PathwayVisualizer({ stages, lang }: { stages: PathwayStage[]; lang: Lang }) {
  if (!stages.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {lang === "hi" ? "इस ट्रेड के लिए रास्ते की जानकारी अभी उपलब्ध नहीं है।" : "Progression information for this trade isn't recorded yet."}
      </p>
    );
  }
  return (
    <div>
      <ol className="space-y-0">
        {stages.map((s, i) => (
          <li key={s.id}>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                  {i + 1}
                </span>
                {i < stages.length - 1 && <ArrowDown className="my-0.5 h-4 w-4 text-muted-foreground/60" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-semibold leading-tight">{s.stage}</p>
                {s.explanation && (
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.explanation}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-1 rounded-2xl bg-muted/40 p-3 text-[12px] leading-relaxed text-muted-foreground">
        {lang === "hi"
          ? "NSQF का मतलब है राष्ट्रीय कौशल योग्यता ढाँचा — यह 1 से 10 तक के स्तरों में योग्यताओं की तुलना करता है। ऊँचा स्तर = ज़्यादा कौशल और ज़्यादा विकल्प।"
          : "NSQF (National Skills Qualifications Framework) compares qualifications on levels 1–10. A higher level means more skill and more options. Ask any training centre which level their course gives."}
      </p>
    </div>
  );
}
