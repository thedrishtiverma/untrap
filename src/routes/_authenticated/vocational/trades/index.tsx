import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVocLangContext } from "@/features/vocational/ui";
import { TRADE_SECTORS } from "@/features/vocational/constants";

export const Route = createFileRoute("/_authenticated/vocational/trades/")({
  head: () => ({ meta: [
    { title: "Explore Vocational Trades · UNTRAP" },
    { name: "description", content: "Search India's vocational trades with training details, qualifications and verified evidence only." },
    { name: "robots", content: "noindex" },
  ] }),
  component: TradesCatalogue,
});

interface TradeRow {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  sector: string | null;
  description: string | null;
  description_hi: string | null;
  training_duration: string | null;
  nsqf_level: number | null;
  vocational_qualifications: { name: string; nsqf_level: number | null }[] | null;
}

function TradesCatalogue() {
  const { lang } = useVocLangContext();
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: { user } }, { data: rows }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("vocational_trades")
          .select("id,slug,name,name_hi,sector,description,description_hi,training_duration,nsqf_level,vocational_qualifications(name,nsqf_level)")
          .eq("is_published", true)
          .order("name"),
      ]);
      setTrades((rows as TradeRow[]) ?? []);
      if (user) {
        const { data: savedRows } = await supabase
          .from("vocational_saved_trades")
          .select("trade_id")
          .eq("user_id", user.id);
        setSaved(new Set((savedRows ?? []).map((r) => r.trade_id)));
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trades.filter((t) => {
      if (sector && t.sector !== sector) return false;
      if (!q) return true;
      return [t.name, t.name_hi, t.description, t.description_hi, t.sector]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q));
    });
  }, [trades, query, sector]);

  async function toggleSave(tradeId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (saved.has(tradeId)) {
      await supabase.from("vocational_saved_trades").delete().eq("user_id", user.id).eq("trade_id", tradeId);
      setSaved((s) => { const n = new Set(s); n.delete(tradeId); return n; });
    } else {
      await supabase.from("vocational_saved_trades").insert({ user_id: user.id, trade_id: tradeId });
      setSaved((s) => new Set(s).add(tradeId));
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        {lang === "hi" ? "ट्रेड्स देखें" : "Explore Trades"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {lang === "hi"
          ? "हर ट्रेड के साथ सिर्फ़ सत्यापित जानकारी दिखाई जाती है।"
          : "Every trade shows verified information only."}
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === "hi" ? "ट्रेड खोजें…" : "Search trades…"}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSector(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
            sector === null ? "border-transparent bg-foreground text-background" : "border-border bg-card text-foreground/60 hover:text-foreground",
          )}
        >
          {lang === "hi" ? "सभी" : "All"}
        </button>
        {TRADE_SECTORS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSector(sector === s ? null : s)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              sector === s ? "border-transparent bg-foreground text-background" : "border-border bg-card text-foreground/60 hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {lang === "hi" ? "कोई ट्रेड नहीं मिला।" : "No trades match your search."}
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => (
            <article key={t.id} className="rounded-3xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-serif text-lg font-semibold leading-snug">
                    {(lang === "hi" && t.name_hi) ? t.name_hi : t.name}
                  </h2>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t.sector} · {t.training_duration}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={saved.has(t.id) ? "Remove from saved" : "Save trade"}
                  onClick={() => toggleSave(t.id)}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border transition",
                    saved.has(t.id) ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Bookmark className="h-4 w-4" fill={saved.has(t.id) ? "currentColor" : "none"} />
                </button>
              </div>
              <p className="mt-2.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                {(lang === "hi" && t.description_hi) ? t.description_hi : t.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  NSQF {t.vocational_qualifications?.[0]?.nsqf_level ?? t.nsqf_level ?? "—"}
                </span>
                <Link
                  to="/vocational/trades/$slug"
                  params={{ slug: t.slug }}
                  className="text-xs font-semibold text-foreground/70 hover:text-foreground"
                >
                  {lang === "hi" ? "पूरी जानकारी →" : "Full details →"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
