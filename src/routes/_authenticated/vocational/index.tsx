import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Compass, GitCompareArrows, Users, PhoneCall, BarChart3, ArrowRight } from "lucide-react";
import { useVocLangContext } from "@/features/vocational/ui";
import { DECISION_SUPPORT_LINE, DECISION_SUPPORT_LINE_HI } from "@/features/vocational/constants";

export const Route = createFileRoute("/_authenticated/vocational/")({
  head: () => ({ meta: [
    { title: "Vocational Careers · UNTRAP" },
    { name: "description", content: "Explore verified skill-first vocational trades in India, compare pathways and decide together with your family — with evidence, never guesswork." },
    { name: "robots", content: "noindex" },
  ] }),
  component: VocationalHub,
});

interface TradeLite {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  sector: string | null;
  training_duration: string | null;
}

const CARDS = [
  { to: "/vocational/trades", icon: Compass, en: "Explore Trades", hi: "ट्रेड्स देखें", dEn: "Searchable catalogue of vocational trades with training, qualifications and verified evidence.", dHi: "ट्रेनिंग, योग्यता और सत्यापित जानकारी के साथ ट्रेड्स का संग्रह।" },
  { to: "/vocational/compare", icon: GitCompareArrows, en: "Compare Careers", hi: "करियर की तुलना", dEn: "Put 2–3 pathways side by side. No ranking — different priorities suit different families.", dHi: "दो तीन रास्ते साथ-साथ देखें। कोई रैंकिंग नहीं — हर परिवार की प्राथमिकता अलग होती है।" },
  { to: "/vocational/family", icon: Users, en: "Family Decision Room", hi: "फैमिली डिसीज़न रूम", dEn: "A shared room where you and your family state priorities and concerns — nobody is forced to agree.", dHi: "आप और आपका परिवार अपनी प्राथमिकताएँ और चिंताएँ यहाँ रख सकते हैं — सहमति ज़बरदस्ती नहीं।" },
  { to: "/vocational/counsellor", icon: PhoneCall, en: "Human Counsellor", hi: "काउंसलर से बात", dEn: "When evidence is missing or disagreement stays, request a conversation with a human counsellor.", dHi: "जब जानकारी कम हो या बात न बने, तो इंसानी काउंसलर से बात माँगें।" },
] as const;

function VocationalHub() {
  const { lang } = useVocLangContext();
  const [trades, setTrades] = useState<TradeLite[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vocational_trades")
        .select("id,slug,name,name_hi,sector,training_duration")
        .eq("is_published", true)
        .limit(3);
      setTrades((data as TradeLite[]) ?? []);
    })();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);
    })();
  }, []);

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        {lang === "hi" ? "हुनर पहले — फ़ैसला साथ में" : "Skill-first careers, decided together"}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {lang === "hi"
          ? "वोकेशनल (हुनर-आधारित) करियर की ईमानदार जानकारी — सत्यापित डेटा के साथ। जहाँ डेटा नहीं है, हम साफ़ कहते हैं।"
          : "Honest information about vocational (skill-based) careers in India, backed by verified data. Where data is missing, we say so instead of guessing."}
      </p>
      <p className="mt-3 inline-flex rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground">
        {lang === "hi" ? DECISION_SUPPORT_LINE_HI : DECISION_SUPPORT_LINE}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CARDS.map(({ to, icon: Icon, en, hi, dEn, dHi }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-3xl border border-border bg-card p-5 shadow-card transition hover:shadow-pop"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <h2 className="mt-3 font-serif text-lg font-semibold">
              {lang === "hi" ? hi : en}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {lang === "hi" ? dHi : dEn}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-foreground/70 transition group-hover:text-foreground">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>

      {trades.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold">
            {lang === "hi" ? "शुरू करें यहाँ से" : "Start here"}
          </h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            {trades.map((t) => (
              <Link
                key={t.id}
                to="/vocational/trades/$slug"
                params={{ slug: t.slug }}
                className="rounded-2xl border border-border bg-card/60 p-4 transition hover:border-foreground/20"
              >
                <p className="text-sm font-semibold">{(lang === "hi" && t.name_hi) ? t.name_hi : t.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t.sector} · {t.training_duration}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isAdmin && (
        <Link
          to="/vocational/insights"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <BarChart3 className="h-4 w-4" /> Vocational Insights (admin)
        </Link>
      )}
    </div>
  );
}
