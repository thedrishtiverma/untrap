import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVocLangContext, EvidenceBlock, type VerifiedMetric } from "@/features/vocational/ui";
import { NO_RANKING_LINE, NO_RANKING_LINE_HI } from "@/features/vocational/constants";

export const Route = createFileRoute("/_authenticated/vocational/compare")({
  head: () => ({ meta: [
    { title: "Compare Vocational Trades · UNTRAP" },
    { name: "description", content: "Side-by-side vocational trade comparison in India — facts only, no ranking." },
    { name: "robots", content: "noindex" },
  ] }),
  component: CompareTrades,
});

interface CompareTrade {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  sector: string | null;
  description: string | null;
  training_duration: string | null;
  education_background: string | null;
  safety_information: string | null;
  work_environment: string | null;
  vocational_qualifications: { name: string; nsqf_level: number | null }[] | null;
  vocational_job_roles: { id: string; title: string }[] | null;
  vocational_progression_pathways: { order_index: number }[] | null;
}

function CompareTrades() {
  const { lang } = useVocLangContext();
  const [trades, setTrades] = useState<CompareTrade[]>([]);
  const [metrics, setMetrics] = useState<Record<string, VerifiedMetric[]>>({});
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("vocational_trades")
        .select("id,slug,name,name_hi,sector,description,training_duration,education_background,safety_information,work_environment,vocational_qualifications(name,nsqf_level),vocational_job_roles(id,title),vocational_progression_pathways(order_index)")
        .eq("is_published", true)
        .order("name");
      const list = (rows as CompareTrade[]) ?? [];
      setTrades(list);
      setPicked(list.slice(0, 2).map((t) => t.id));
      const ids = list.map((t) => t.id);
      if (ids.length) {
        const { data: ms } = await supabase
          .from("vocational_outcome_metrics")
          .select("id,trade_id,metric_type,label,value_text,last_updated,verification_status,vocational_data_sources(name,source_url),vocational_locations(state,district)")
          .in("trade_id", ids);
        const byTrade: Record<string, VerifiedMetric[]> = {};
        for (const m of ms ?? []) {
          (byTrade[m.trade_id] ||= []).push({
            id: m.id,
            metric_type: m.metric_type,
            label: m.label,
            value_text: m.value_text,
            last_updated: m.last_updated,
            verification_status: m.verification_status,
            source_name: m.vocational_data_sources?.name ?? null,
            source_url: m.vocational_data_sources?.source_url ?? null,
            location_state: m.vocational_locations?.state ?? null,
            location_district: m.vocational_locations?.district ?? null,
          });
        }
        setMetrics(byTrade);
      }
    })();
  }, []);

  const chosen = useMemo(() => picked.map((id) => trades.find((t) => t.id === id)).filter(Boolean) as CompareTrade[], [picked, trades]);

  function setSlot(index: number, tradeId: string) {
    setPicked((p) => { const n = [...p]; n[index] = tradeId; return n; });
  }

  const rows: { label: string; labelHi: string; get: (t: CompareTrade) => React.ReactNode }[] = [
    { label: "Sector", labelHi: "क्षेत्र", get: (t) => t.sector ?? "—" },
    { label: "Education to start", labelHi: "शुरुआती पढ़ाई", get: (t) => t.education_background ?? "—" },
    { label: "Training duration", labelHi: "ट्रेनिंग अवधि", get: (t) => t.training_duration ?? "—" },
    { label: "Qualification", labelHi: "योग्यता", get: (t) => t.vocational_qualifications?.[0]?.name ?? "—" },
    { label: "NSQF level", labelHi: "NSQF स्तर", get: (t) => t.vocational_qualifications?.[0]?.nsqf_level ?? "—" },
    { label: "Job roles", labelHi: "काम के रोल", get: (t) => t.vocational_job_roles?.map((r) => r.title).join(", ") || "—" },
    { label: "Work environment", labelHi: "काम का माहौल", get: (t) => t.work_environment ?? "—" },
    { label: "Safety", labelHi: "सुरक्षा", get: (t) => t.safety_information ?? "—" },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        {lang === "hi" ? "करियर की तुलना" : "Compare Careers"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {lang === "hi" ? NO_RANKING_LINE_HI : NO_RANKING_LINE}
      </p>

      {trades.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${chosen.length}, minmax(0, 1fr))` }}>
            {chosen.map((t, i) => (
              <select
                key={i}
                value={t.id}
                onChange={(e) => setSlot(i, e.target.value)}
                className="rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-semibold outline-none"
                aria-label={`Trade ${i + 1}`}
              >
                {trades.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {(lang === "hi" && opt.name_hi) ? opt.name_hi : opt.name}
                  </option>
                ))}
              </select>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Fact</th>
                  {chosen.map((t) => (
                    <th key={t.id} className="p-3.5 font-serif text-sm font-semibold">
                      {(lang === "hi" && t.name_hi) ? t.name_hi : t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-border/60 last:border-0">
                    <td className="p-3.5 align-top text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {lang === "hi" ? r.labelHi : r.label}
                    </td>
                    {chosen.map((t) => (
                      <td key={t.id} className="p-3.5 align-top leading-relaxed">{r.get(t)}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="p-3.5 align-top text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {lang === "hi" ? "सत्यापित परिणाम" : "Verified outcomes"}
                  </td>
                  {chosen.map((t) => (
                    <td key={t.id} className="p-3.5 align-top">
                      <EvidenceBlock metrics={metrics[t.id] ?? []} lang={lang} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {chosen.map((t) => (
              <Link
                key={t.id}
                to="/vocational/trades/$slug"
                params={{ slug: t.slug }}
                className="rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                {(lang === "hi" && t.name_hi) ? t.name_hi : t.name} →
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
