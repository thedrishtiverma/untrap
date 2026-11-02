import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark, GitCompareArrows, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVocLangContext, EvidenceBlock, PathwayVisualizer, type VerifiedMetric, type PathwayStage } from "@/features/vocational/ui";
import { DECISION_SUPPORT_LINE, DECISION_SUPPORT_LINE_HI } from "@/features/vocational/constants";

export const Route = createFileRoute("/_authenticated/vocational/trades/$slug")({
  head: () => ({ meta: [
    { title: "Vocational Trade · UNTRAP" },
    { name: "description", content: "Verified details for this vocational trade: training, progression, safety and evidence." },
    { name: "robots", content: "noindex" },
  ] }),
  component: TradeDetail,
});

interface TradeDetailRow {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  sector: string | null;
  description: string | null;
  description_hi: string | null;
  who_it_may_suit: string | null;
  education_background: string | null;
  training_duration: string | null;
  nsqf_level: number | null;
  safety_information: string | null;
  work_environment: string | null;
  misconceptions: string[];
  vocational_qualifications: { name: string; awarding_body: string | null; nsqf_level: number | null }[] | null;
  vocational_job_roles: { id: string; title: string }[] | null;
  vocational_progression_pathways: PathwayStage[] | null;
}

interface TradeDetail {
  trade: TradeDetailRow | null;
  metrics: VerifiedMetric[];
  providers: { id: string; name: string; location_state: string | null; location_district: string | null }[];
  saved: boolean;
}

function TradeDetail() {
  const { slug } = Route.useParams();
  const { lang } = useVocLangContext();
  const [data, setData] = useState<TradeDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: trade } = await supabase
        .from("vocational_trades")
        .select("*,vocational_qualifications(name,awarding_body,nsqf_level),vocational_job_roles(id,title),vocational_progression_pathways(id,order_index,stage,explanation)")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!trade) { setNotFound(true); return; }
      const t = trade as TradeDetailRow;
      const [{ data: metrics }, { data: providers }, savedRes] = await Promise.all([
        supabase
          .from("vocational_outcome_metrics")
          .select("id,metric_type,label,value_text,last_updated,verification_status,vocational_data_sources(name,source_url),vocational_locations(state,district)")
          .eq("trade_id", t.id)
          .order("last_updated", { ascending: false }),
        supabase
          .from("vocational_training_providers")
          .select("id,name,vocational_locations(state,district)")
          .eq("trade_id", t.id),
        user
          ? supabase.from("vocational_saved_trades").select("trade_id").eq("user_id", user.id).eq("trade_id", t.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setData({
        trade: t,
        metrics: (metrics ?? []).map((m) => ({
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
        })),
        providers: (providers ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          location_state: p.vocational_locations?.state ?? null,
          location_district: p.vocational_locations?.district ?? null,
        })),
        saved: Boolean(savedRes.data),
      });
    })();
  }, [slug]);

  if (notFound || !data?.trade) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {lang === "hi" ? "यह ट्रेड नहीं मिला।" : "This trade could not be found."}
        </p>
        <Link to="/vocational/trades" className="mt-3 inline-block text-sm font-semibold underline underline-offset-2">
          {lang === "hi" ? "सभी ट्रेड्स देखें" : "Back to all trades"}
        </Link>
      </div>
    );
  }

  const t = data.trade;
  const name = (lang === "hi" && t.name_hi) ? t.name_hi : t.name;
  const desc = (lang === "hi" && t.description_hi) ? t.description_hi : t.description;
  const qual = t.vocational_qualifications?.[0];
  const progression = [...(t.vocational_progression_pathways ?? [])].sort((a, b) => a.order_index - b.order_index);
  const earningsMetrics = data.metrics.filter((m) => /earn|income|wage|salary|placement|demand/i.test(`${m.metric_type} ${m.label}`));
  const unavailableHi = "सत्यापित डेटा उपलब्ध नहीं है — हम अनुमान नहीं लगाते।";
  const unavailableEn = "Verified data isn't available for this yet — we won't guess.";

  async function toggleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (data!.saved) {
      await supabase.from("vocational_saved_trades").delete().eq("user_id", user.id).eq("trade_id", t.id);
    } else {
      await supabase.from("vocational_saved_trades").insert({ user_id: user.id, trade_id: t.id });
    }
    setData((d) => (d ? { ...d, saved: !d.saved } : d));
  }

  const explainer = [
    { q: lang === "hi" ? "यह इंसान असल में क्या करता है?" : "What does this person actually do?", a: desc },
    { q: lang === "hi" ? "कहाँ काम कर सकते हैं?" : "Where can they work?", a: t.work_environment },
    { q: lang === "hi" ? "कैसे शुरू करें?" : "How do they start?", a: [t.education_background, t.training_duration ? `Training: ${t.training_duration}` : null, qual ? `Qualification: ${qual.name}${qual.awarding_body ? ` (${qual.awarding_body})` : ""}` : null].filter(Boolean).join(" · ") },
    { q: lang === "hi" ? "कमाई कैसे होती है?" : "How can they earn?", a: earningsMetrics.length ? earningsMetrics.map((m) => `${m.label}: ${m.value_text} (updated ${m.last_updated})`).join("; ") : (lang === "hi" ? unavailableHi : unavailableEn) },
    { q: lang === "hi" ? "आगे कैसे बढ़ें?" : "How can they progress?", a: progression.map((p) => p.stage).join(" → ") || (lang === "hi" ? unavailableHi : unavailableEn) },
    { q: lang === "hi" ? "आगे क्या पढ़ सकते हैं?" : "What can they study next?", a: progression[progression.length - 1]?.explanation ?? (lang === "hi" ? unavailableHi : unavailableEn) },
    { q: lang === "hi" ? "सुरक्षा का ध्यान?" : "What about safety?", a: t.safety_information },
    { q: lang === "hi" ? "अगर मन बदल जाए तो?" : "What if they change their mind?", a: lang === "hi" ? "हुनर बर्बाद नहीं होते — मेहनत और अनुभव कई दूसरे रास्तों में काम आते हैं। सही जानकारी के लिए काउंसलर से बात करें।" : "Skills rarely go to waste — the discipline and experience carry over to other paths. Talk to a counsellor to explore switches." },
  ].filter((x) => x.a);

  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t.sector}</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">{name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {qual && (
              <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold">
                {qual.name}
              </span>
            )}
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              NSQF {qual?.nsqf_level ?? t.nsqf_level ?? "—"}
            </span>
            {t.training_duration && (
              <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold">
                {t.training_duration}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleSave}
            aria-label={data.saved ? "Remove from saved" : "Save trade"}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl border border-border transition",
              data.saved ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Bookmark className="h-4 w-4" fill={data.saved ? "currentColor" : "none"} />
          </button>
          <Link
            to="/vocational/compare"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition hover:text-foreground"
            aria-label="Compare"
          >
            <GitCompareArrows className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed">{desc}</p>

      {(t.who_it_may_suit || t.education_background) && (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {t.who_it_may_suit && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {lang === "hi" ? "किन लोगों के लिए ठीक हो सकता है" : "Who it may suit"}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed">{t.who_it_may_suit}</p>
            </div>
          )}
          {t.education_background && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {lang === "hi" ? "पढ़ाई की शुरुआत" : "Education background"}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed">{t.education_background}</p>
            </div>
          )}
        </div>
      )}

      {(t.safety_information || t.work_environment) && (
        <section className="mt-6">
          <h2 className="font-serif text-lg font-semibold">{lang === "hi" ? "सुरक्षा और काम का माहौल" : "Safety & work environment"}</h2>
          {t.safety_information && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t.safety_information}</p>}
          {t.work_environment && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.work_environment}</p>}
        </section>
      )}

      {t.vocational_job_roles?.length ? (
        <section className="mt-6">
          <h2 className="font-serif text-lg font-semibold">{lang === "hi" ? "काम के रोल" : "Job roles"}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {t.vocational_job_roles.map((r) => (
              <span key={r.id} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium">{r.title}</span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "रास्ता — आगे कैसे बढ़ें" : "Career pathway"}
        </h2>
        <div className="mt-3">
          <PathwayVisualizer stages={progression} lang={lang} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "सत्यापित परिणाम" : "Verified outcomes"}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {lang === "hi" ? "हर दावे के साथ स्रोत और तारीख़ दिखती है।" : "Every claim shows its source and last-updated date."}
        </p>
        <div className="mt-3">
          <EvidenceBlock metrics={data.metrics} lang={lang} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "ट्रेनिंग केंद्र" : "Training providers"}
        </h2>
        <div className="mt-3">
          {data.providers.length ? (
            <ul className="space-y-2">
              {data.providers.map((p) => (
                <li key={p.id} className="rounded-2xl border border-border bg-card p-3.5 text-sm">
                  <span className="font-semibold">{p.name}</span>
                  {p.location_state && (
                    <span className="ml-2 text-[12px] text-muted-foreground">
                      {p.location_district ? `${p.location_district}, ` : ""}{p.location_state}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              {lang === "hi" ? "इस जगह/ट्रेड के लिए सत्यापित ट्रेनिंग केंद्र उपलब्ध नहीं हैं।" : "Verified data unavailable for this location/trade."}
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "इसे परिवार को समझाएँ" : "Explain this career to my family"}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {lang === "hi" ? "सरल भाषा में, बिना कोई बात बढ़ा-चढ़ाएँ।" : "Simple language, nothing exaggerated."}
        </p>
        <dl className="mt-4 space-y-3">
          {explainer.map((x) => (
            <div key={x.q} className="rounded-2xl bg-muted/40 p-3.5">
              <dt className="text-[13px] font-semibold">{x.q}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{x.a}</dd>
            </div>
          ))}
        </dl>
        <Link
          to="/vocational/family"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-pop"
        >
          <Users className="h-3.5 w-3.5" />
          {lang === "hi" ? "फैमिली रूम में खोलें" : "Discuss in the Family Room"}
        </Link>
      </section>

      {t.misconceptions?.length ? (
        <section className="mt-6">
          <h2 className="font-serif text-lg font-semibold">{lang === "hi" ? "आम गलतफ़हमियाँ" : "Common misconceptions"}</h2>
          <ul className="mt-2 space-y-1.5">
            {t.misconceptions.map((m, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-muted-foreground">• {m}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        {lang === "hi" ? DECISION_SUPPORT_LINE_HI : DECISION_SUPPORT_LINE}
      </p>
    </article>
  );
}
