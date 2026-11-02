import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVocLangContext } from "@/features/vocational/ui";

export const Route = createFileRoute("/_authenticated/vocational/insights")({
  head: () => ({ meta: [
    { title: "Vocational Insights · UNTRAP" },
    { name: "description", content: "Administrator-only aggregate insights for the vocational programme." },
    { name: "robots", content: "noindex" },
  ] }),
  component: VocationalInsights,
});

interface InsightsShape {
  decisions: number;
  decisions_by_status: Record<string, number>;
  concerns_by_category: Record<string, number>;
  concerns_by_status: Record<string, number>;
  requests_by_status: Record<string, number>;
  top_saved_trades: { name: string; n: number }[];
  verified_metrics: number;
  pending_metrics: number;
}

function VocationalInsights() {
  const { lang } = useVocLangContext();
  const [data, setData] = useState<InsightsShape | null>(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: res, error: err } = await supabase.rpc("vocational_insights");
      if (err) {
        if (/Not authorized/i.test(err.message)) setDenied(true);
        else setError(true);
        return;
      }
      setData(res as unknown as InsightsShape);
    })();
  }, []);

  if (denied) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-sm font-semibold">
          {lang === "hi" ? "यह पेज केवल एडमिन के लिए है।" : "This dashboard is restricted to administrators."}
        </p>
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-muted-foreground">{lang === "hi" ? "लोड हो रहा है…" : "Loading…"}</p>;
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">Vocational Insights</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Aggregate, de-identified programme data.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Decision rooms" value={data.decisions} />
        <Stat label="Verified outcome records" value={data.verified_metrics} />
        <Stat label="Pending verification" value={data.pending_metrics} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Aggregate title="Decisions by status" entries={Object.entries(data.decisions_by_status)} />
        <Aggregate title="Concerns by category" entries={Object.entries(data.concerns_by_category)} />
        <Aggregate title="Concerns by status" entries={Object.entries(data.concerns_by_status)} />
        <Aggregate title="Counsellor requests by status" entries={Object.entries(data.requests_by_status)} />
      </div>

      {data.top_saved_trades.length > 0 && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-serif text-lg font-semibold">Most saved trades</h2>
          <ul className="mt-2 space-y-1.5">
            {data.top_saved_trades.map((s) => (
              <li key={s.name} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="font-semibold">{s.n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <p className="font-serif text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  );
}

function Aggregate({ title, entries }: { title: string; entries: [string, number][] }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between text-sm">
              <span className="capitalize">{k.replace(/_/g, " ")}</span>
              <span className="font-semibold">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
