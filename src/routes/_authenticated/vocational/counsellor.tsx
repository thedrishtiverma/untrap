import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVocLangContext } from "@/features/vocational/ui";
import { COUNSELLOR_TRIGGERS, CONCERN_CATEGORIES } from "@/features/vocational/constants";

export const Route = createFileRoute("/_authenticated/vocational/counsellor")({
  head: () => ({ meta: [
    { title: "Talk to a Counsellor · UNTRAP" },
    { name: "description", content: "Request a human vocational counselling conversation when evidence is missing or the family needs more support." },
    { name: "robots", content: "noindex" },
  ] }),
  component: CounsellorPage,
});

interface RequestRow {
  id: string;
  topic: string;
  concern_category: string | null;
  conversation_summary: string | null;
  urgency: string;
  status: string;
  created_at: string;
  trade_id: string | null;
  vocational_trades: { name: string } | null;
}

interface TradeLite { id: string; name: string }

const STATUS_BADGE: Record<string, string> = {
  open: "bg-amber-500/10 text-amber-600",
  in_progress: "bg-blue-500/10 text-blue-600",
  resolved: "bg-primary/10 text-primary",
  closed: "bg-muted text-muted-foreground",
};

function CounsellorPage() {
  const { lang } = useVocLangContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeLite[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [form, setForm] = useState({
    topic: "", concern_category: "", conversation_summary: "", trade_id: "", location_text: "", urgency: "normal", requester_role: "learner",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const [{ data: t }, { data: r }] = await Promise.all([
        supabase.from("vocational_trades").select("id,name").eq("is_published", true).order("name"),
        supabase
          .from("vocational_counsellor_requests")
          .select("id,topic,concern_category,conversation_summary,urgency,status,created_at,trade_id,vocational_trades(name)")
          .order("created_at", { ascending: false }),
      ]);
      setTrades((t as TradeLite[]) ?? []);
      setRequests((r as RequestRow[]) ?? []);
    })();
  }, []);

  async function submit() {
    if (!form.topic.trim()) { setError(lang === "hi" ? "विषय लिखें।" : "Please add a topic."); return; }
    if (!userId) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.from("vocational_counsellor_requests").insert({
      requested_by: userId,
      topic: form.topic.trim(),
      concern_category: form.concern_category || null,
      conversation_summary: form.conversation_summary.trim() || null,
      trade_id: form.trade_id || null,
      location_text: form.location_text.trim() || null,
      urgency: form.urgency,
      requester_role: form.requester_role,
    });
    setBusy(false);
    if (err) { setError("Something went wrong. Please try again."); return; }
    setDone(true);
    const { data: r } = await supabase
      .from("vocational_counsellor_requests")
      .select("id,topic,concern_category,conversation_summary,urgency,status,created_at,trade_id,vocational_trades(name)")
      .order("created_at", { ascending: false });
    setRequests((r as RequestRow[]) ?? []);
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        {lang === "hi" ? "काउंसलर से बात करें" : "Talk to a Counsellor"}
      </h1>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {lang === "hi"
          ? "जब जानकारी कम हो, बात न बने, या आप इंसानी मदद चाहें — तब काउंसलर सबसे अच्छा रास्ता है।"
          : "A human counsellor is the right next step when verified information is missing, disagreement stays, or you simply want to talk to a person."}
      </p>

      <ul className="mt-4 space-y-1.5 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
        {COUNSELLOR_TRIGGERS.map((tr) => (
          <li key={tr} className="text-[12px] leading-relaxed text-muted-foreground">• {tr}</li>
        ))}
      </ul>

      <section className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "नया अनुरोध" : "New counselling request"}
        </h2>
        {done && (
          <p className="mt-3 rounded-2xl bg-primary/10 p-3 text-[13px] font-medium text-primary">
            {lang === "hi" ? "अनुरोध भेजा गया — नीचे स्थिति दिखेगी।" : "Request sent — you'll see its status below."}
          </p>
        )}
        <div className="mt-3 grid gap-3">
          <input
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder={lang === "hi" ? "विषय — जैसे: इलेक्ट्रीशियन के बाद आगे क्या?" : "Topic — e.g. What after Electrician ITI?"}
            className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground/30"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.concern_category}
              onChange={(e) => setForm({ ...form, concern_category: e.target.value })}
              className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none"
              aria-label="Concern category"
            >
              <option value="">{lang === "hi" ? "चिंता की श्रेणी (वैकल्पिक)" : "Concern category (optional)"}</option>
              {CONCERN_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{lang === "hi" ? c.hi : c.en}</option>
              ))}
            </select>
            <select
              value={form.trade_id}
              onChange={(e) => setForm({ ...form, trade_id: e.target.value })}
              className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none"
              aria-label="Relevant trade"
            >
              <option value="">{lang === "hi" ? "संबंधित ट्रेड (वैकल्पिक)" : "Relevant trade (optional)"}</option>
              {trades.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
              className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none"
              aria-label="Urgency"
            >
              <option value="low">{lang === "hi" ? "जल्दी नहीं" : "Low urgency"}</option>
              <option value="normal">{lang === "hi" ? "सामान्य" : "Normal"}</option>
              <option value="high">{lang === "hi" ? "जल्दी चाहिए" : "High — needs it soon"}</option>
            </select>
            <select
              value={form.requester_role}
              onChange={(e) => setForm({ ...form, requester_role: e.target.value })}
              className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none"
              aria-label="I am"
            >
              <option value="learner">{lang === "hi" ? "मैं लर्नर हूँ" : "I am the learner"}</option>
              <option value="parent">{lang === "hi" ? "मैं पेरेंट हूँ" : "I am the parent"}</option>
            </select>
          </div>
          <input
            value={form.location_text}
            onChange={(e) => setForm({ ...form, location_text: e.target.value })}
            placeholder={lang === "hi" ? "आपका शहर/ज़िला (वैकल्पिक)" : "Your city/district (optional)"}
            className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground/30"
          />
          <textarea
            value={form.conversation_summary}
            onChange={(e) => setForm({ ...form, conversation_summary: e.target.value })}
            placeholder={lang === "hi" ? "बात का सार — क्या सोचा, क्या चिंता है?" : "Summary — what you've discussed and what worries you"}
            rows={4}
            className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground/30"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="w-full rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-pop disabled:opacity-50"
          >
            {busy ? "…" : lang === "hi" ? "अनुरोध भेजें" : "Send request"}
          </button>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "आपके अनुरोध" : "Your requests"}
        </h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "hi" ? "अभी कोई अनुरोध नहीं।" : "No requests yet."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {requests.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{r.topic}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_BADGE[r.status] ?? "bg-muted"}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </div>
                {r.vocational_trades?.name && (
                  <p className="mt-1 text-[12px] text-muted-foreground">Trade: {r.vocational_trades.name} · {r.urgency} urgency</p>
                )}
                {r.conversation_summary && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{r.conversation_summary}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
