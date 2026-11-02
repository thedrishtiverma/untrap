import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { facilitateConcern } from "@/lib/vocational.functions";
import { Copy, Plus, X, BrainCircuit, PhoneCall, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVocLangContext } from "@/features/vocational/ui";
import {
  CONCERN_CATEGORIES,
  concernLabel,
  NO_RANKING_LINE,
  NO_RANKING_LINE_HI,
  DECISION_SUPPORT_LINE,
  DECISION_SUPPORT_LINE_HI,
  UNAVAILABLE_EVIDENCE,
  UNAVAILABLE_EVIDENCE_HI,
  type Lang,
} from "@/features/vocational/constants";

export const Route = createFileRoute("/_authenticated/vocational/family/$decisionId")({
  head: () => ({ meta: [
    { title: "Decision Room · UNTRAP" },
    { name: "description", content: "Family vocational decision room — learner, parent and shared views with structured concerns." },
    { name: "robots", content: "noindex" },
  ] }),
  component: DecisionRoom,
});

interface DecisionRow {
  id: string;
  title: string;
  status: string;
  invite_code: string;
  owner_user_id: string;
  learner_priorities: string[];
  parent_priorities: string[];
  learner_notes: string | null;
  parent_notes: string | null;
  shortlisted_trade_ids: string[];
}
interface Participant { id: string; user_id: string; participant_role: "learner" | "parent" }
interface Concern {
  id: string;
  raised_by: string;
  concern_category: string;
  concern_text: string;
  ai_response: Facilitation | null;
  status: string;
}
interface Facilitation {
  understanding: string;
  evidence: string[];
  alternatives: string[];
  uncertainty: string;
  generated_at?: string;
}
interface TradeLite {
  id: string; slug: string; name: string; name_hi: string | null;
  vocational_progression_pathways: { stage: string }[] | null;
}

type View = "learner" | "parent" | "together";

function DecisionRoom() {
  const { decisionId } = Route.useParams();
  const { lang } = useVocLangContext();
  const facilitate = useServerFn(facilitateConcern);

  const [decision, setDecision] = useState<DecisionRow | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [shortlist, setShortlist] = useState<TradeLite[]>([]);
  const [allTrades, setAllTrades] = useState<TradeLite[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>("together");
  const [facilitating, setFacilitating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newPriority, setNewPriority] = useState("");
  const [newConcern, setNewConcern] = useState({ category: "income", text: "" });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const { data: d } = await supabase.from("vocational_decisions").select("*").eq("id", decisionId).maybeSingle();
      if (!d) { setError(lang === "hi" ? "यह रूम नहीं मिली या आप सदस्य नहीं हैं।" : "Room not found, or you're not a member."); return; }
      const dec = d as DecisionRow;
      setDecision(dec);
      const [{ data: parts }, { data: cons }, { data: sl }, { data: all }] = await Promise.all([
        supabase.from("vocational_decision_participants").select("id,user_id,participant_role").eq("decision_id", dec.id),
        supabase.from("vocational_concerns").select("id,raised_by,concern_category,concern_text,ai_response,status").eq("decision_id", dec.id).order("created_at"),
        dec.shortlisted_trade_ids?.length
          ? supabase.from("vocational_trades").select("id,slug,name,name_hi,vocational_progression_pathways(stage)").in("id", dec.shortlisted_trade_ids)
          : Promise.resolve({ data: [] }),
        supabase.from("vocational_trades").select("id,slug,name,name_hi,vocational_progression_pathways(stage)").eq("is_published", true).order("name"),
      ]);
      setParticipants((parts as Participant[]) ?? []);
      setConcerns((cons as Concern[]) ?? []);
      setShortlist((sl as TradeLite[]) ?? []);
      setAllTrades((all as TradeLite[]) ?? []);
      setView((parts as Participant[])?.some((p) => p.user_id === user?.id && p.participant_role === "parent") || (user?.id === dec.owner_user_id && false) ? "parent" : "learner");
    })();
  }, [decisionId]);

  if (error || !decision) {
    return <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{error ?? "Loading…"}</div>;
  }

  const isOwner = userId === decision.owner_user_id;
  const myRole: "learner" | "parent" = participants.find((p) => p.user_id === userId)?.participant_role ?? (isOwner ? "learner" : "learner");
  const canEditLearner = myRole === "learner";
  const canEditParent = myRole === "parent";
  const unresolved = concerns.filter((c) => c.status === "open" || c.status === "still_concerned");

  async function updateDecision(patch: Partial<DecisionRow>) {
    const { error: err } = await supabase.from("vocational_decisions").update(patch).eq("id", decision!.id);
    if (err) { setError("Something went wrong. Please try again."); return; }
    setDecision((d) => (d ? { ...d, ...patch } as DecisionRow : d));
  }

  async function addPriority(side: "learner" | "parent") {
    const text = newPriority.trim();
    if (!text) return;
    const key = side === "learner" ? "learner_priorities" : "parent_priorities";
    await updateDecision({ [key]: [...decision![key], text] } as Partial<DecisionRow>);
    setNewPriority("");
  }
  async function removePriority(side: "learner" | "parent", idx: number) {
    const key = side === "learner" ? "learner_priorities" : "parent_priorities";
    const list = decision![key].filter((_, i) => i !== idx);
    await updateDecision({ [key]: list } as Partial<DecisionRow>);
  }

  async function addToShortlist(tradeId: string) {
    if (!tradeId || decision!.shortlisted_trade_ids.includes(tradeId)) return;
    const ids = [...decision!.shortlisted_trade_ids, tradeId];
    await updateDecision({ shortlisted_trade_ids: ids });
    const t = allTrades.find((x) => x.id === tradeId);
    if (t) setShortlist((s) => [...s, t]);
  }
  async function removeFromShortlist(tradeId: string) {
    await updateDecision({ shortlisted_trade_ids: decision!.shortlisted_trade_ids.filter((i) => i !== tradeId) });
    setShortlist((s) => s.filter((t) => t.id !== tradeId));
  }

  async function raiseConcern() {
    const text = newConcern.text.trim();
    if (!text || !userId) return;
    const { data: inserted, error: err } = await supabase
      .from("vocational_concerns")
      .insert({ decision_id: decision!.id, raised_by: userId, concern_category: newConcern.category, concern_text: text })
      .select("id,raised_by,concern_category,concern_text,ai_response,status")
      .single();
    if (err) { setError("Something went wrong. Please try again."); return; }
    setConcerns((c) => [...c, inserted as Concern]);
    setNewConcern({ category: newConcern.category, text: "" });
  }

  async function askSaarthi(concernId: string) {
    setFacilitating(concernId); setError(null);
    try {
      const result = await facilitate({ data: { decisionId: decision!.id, concernId, language: lang } });
      setConcerns((cs) => cs.map((c) => (c.id === concernId ? { ...c, ai_response: result as Facilitation } : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setFacilitating(null);
    }
  }

  async function setConcernStatus(concernId: string, status: string) {
    const { error: err } = await supabase.from("vocational_concerns").update({ status }).eq("id", concernId);
    if (err) { setError("Something went wrong. Please try again."); return; }
    setConcerns((cs) => cs.map((c) => (c.id === concernId ? { ...c, status } : c)));
    if (status === "needs_counsellor") {
      const concern = concerns.find((c) => c.id === concernId);
      if (concern && userId) {
        await supabase.from("vocational_counsellor_requests").insert({
          requested_by: userId,
          requester_role: myRole,
          topic: `${concernLabel(concern.concern_category, "en")} — ${decision!.title}`,
          concern_category: concern.concern_category,
          conversation_summary: concern.concern_text,
          trade_id: decision!.shortlisted_trade_ids[0] ?? null,
          urgency: "high",
        });
      }
    }
  }

  const raiserRole = (raisedBy: string): "learner" | "parent" =>
    participants.find((p) => p.user_id === raisedBy)?.participant_role ?? "learner";

  const sharedPriorities = decision.learner_priorities.filter((p) => decision.parent_priorities.includes(p));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">{decision.title}</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {lang === "hi" ? "आप" : "You are"}: {myRole === "parent" ? (lang === "hi" ? "पेरेंट" : "parent") : (lang === "hi" ? "लर्नर" : "learner")} · {participants.length + 1} {lang === "hi" ? "सदस्य" : "members"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(decision.invite_code).catch(() => {})}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" />
          {lang === "hi" ? "निमंत्रण कोड कॉपी करें" : "Copy invite code"}
        </button>
      </div>

      <div className="mt-4 flex gap-1.5">
        {(["learner", "parent", "together"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-xs font-semibold transition",
              view === v ? "border-transparent bg-foreground text-background shadow-pop" : "border-border bg-card text-foreground/60 hover:text-foreground",
            )}
          >
            {v === "learner" ? (lang === "hi" ? "लर्नर" : "Learner") : v === "parent" ? (lang === "hi" ? "पेरेंट" : "Parent") : (lang === "hi" ? "साथ में" : "Together")}
          </button>
        ))}
      </div>

      {(view === "learner" || view === "parent") && (
        <PriorityPanel
          lang={lang}
          side={view}
          priorities={view === "learner" ? decision.learner_priorities : decision.parent_priorities}
          notes={view === "learner" ? decision.learner_notes : decision.parent_notes}
          canEdit={view === "learner" ? canEditLearner : canEditParent}
          newPriority={newPriority}
          setNewPriority={setNewPriority}
          addPriority={addPriority}
          removePriority={removePriority}
          onSaveNotes={(notes) => updateDecision(view === "learner" ? { learner_notes: notes } : { parent_notes: notes })}
          shortlist={shortlist}
          allTrades={allTrades}
          addToShortlist={addToShortlist}
          removeFromShortlist={removeFromShortlist}
          canEditShortlist={canEditLearner}
        />
      )}

      {view === "together" && (
        <TogetherView
          lang={lang}
          decision={decision}
          shortlist={shortlist}
          sharedPriorities={sharedPriorities}
          unresolvedCount={unresolved.length}
          isOwner={isOwner}
          onStatus={(status) => updateDecision({ status })}
        />
      )}

      <ConcernsSection
        lang={lang}
        concerns={concerns}
        raiserRole={raiserRole}
        newConcern={newConcern}
        setNewConcern={setNewConcern}
        raiseConcern={raiseConcern}
        askSaarthi={askSaarthi}
        facilitating={facilitating}
        setConcernStatus={setConcernStatus}
      />

      <FamilyReport lang={lang} decision={decision} shortlist={shortlist} concerns={concerns} raiserRole={raiserRole} unresolvedCount={unresolved.length} />

      {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}
      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        {lang === "hi" ? DECISION_SUPPORT_LINE_HI : DECISION_SUPPORT_LINE}
      </p>
    </div>
  );
}

function PriorityPanel(props: {
  lang: Lang;
  side: "learner" | "parent";
  priorities: string[];
  notes: string | null;
  canEdit: boolean;
  newPriority: string;
  setNewPriority: (v: string) => void;
  addPriority: (side: "learner" | "parent") => void;
  removePriority: (side: "learner" | "parent", idx: number) => void;
  onSaveNotes: (notes: string) => void;
  shortlist: TradeLite[];
  allTrades: TradeLite[];
  addToShortlist: (id: string) => void;
  removeFromShortlist: (id: string) => void;
  canEditShortlist: boolean;
}) {
  const { lang, side, priorities, notes, canEdit, shortlist, allTrades } = props;
  const [notesDraft, setNotesDraft] = useState(notes ?? "");
  useEffect(() => setNotesDraft(notes ?? ""), [notes]);
  const label = side === "learner" ? (lang === "hi" ? "लर्नर की प्राथमिकताएँ" : "Learner's priorities") : (lang === "hi" ? "पेरेंट की प्राथमिकताएँ" : "Parent's priorities");

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-serif text-lg font-semibold">{label}</h2>
        {!canEdit && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            {lang === "hi" ? "यह दृश्य पढ़ने के लिए है — बदलाव उसी सदस्य करता है।" : "Read-only view — this member edits their own side."}
          </p>
        )}
        <ul className="mt-3 space-y-1.5">
          {priorities.length === 0 && (
            <li className="text-[13px] text-muted-foreground">
              {lang === "hi" ? "अभी कोई प्राथमिकता नहीं।" : "No priorities added yet."}
            </li>
          )}
          {priorities.map((p, i) => (
            <li key={`${p}-${i}`} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-[13px]">
              <span>{p}</span>
              {canEdit && (
                <button type="button" onClick={() => props.removePriority(side, i)} aria-label="Remove">
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-3 flex gap-2">
            <input
              value={props.newPriority}
              onChange={(e) => props.setNewPriority(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); props.addPriority(side); } }}
              placeholder={lang === "hi" ? "प्राथमिकता जोड़ें…" : "Add a priority…"}
              className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground/30"
            />
            <button
              type="button"
              onClick={() => props.addPriority(side)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background"
              aria-label="Add priority"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {lang === "hi" ? "नोट्स" : "Notes"}
          </p>
          {canEdit ? (
            <>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground/30"
                placeholder={lang === "hi" ? "अपनी बात लिखें…" : "Write in your own words…"}
              />
              <button
                type="button"
                onClick={() => props.onSaveNotes(notesDraft)}
                className="mt-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold hover:border-foreground/20"
              >
                {lang === "hi" ? "नोट्स सेव करें" : "Save notes"}
              </button>
            </>
          ) : (
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{notes || "—"}</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "शॉर्टलिस्ट किए ट्रेड" : "Shortlisted pathways"}
        </h2>
        <ul className="mt-3 space-y-1.5">
          {shortlist.length === 0 && (
            <li className="text-[13px] text-muted-foreground">{lang === "hi" ? "अभी कुछ नहीं चुना।" : "Nothing shortlisted yet."}</li>
          )}
          {shortlist.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-[13px]">
              <Link to="/vocational/trades/$slug" params={{ slug: t.slug }} className="font-medium underline-offset-2 hover:underline">
                {(lang === "hi" && t.name_hi) ? t.name_hi : t.name}
              </Link>
              {props.canEditShortlist && (
                <button type="button" onClick={() => props.removeFromShortlist(t.id)} aria-label="Remove">
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {props.canEditShortlist && (
          <select
            value=""
            onChange={(e) => props.addToShortlist(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none"
            aria-label="Add trade to shortlist"
          >
            <option value="">{lang === "hi" ? "ट्रेड जोड़ें…" : "Add a trade…"}</option>
            {allTrades.filter((t) => !shortlist.some((s) => s.id === t.id)).map((t) => (
              <option key={t.id} value={t.id}>{(lang === "hi" && t.name_hi) ? t.name_hi : t.name}</option>
            ))}
          </select>
        )}
      </section>
    </div>
  );
}

function TogetherView(props: {
  lang: Lang;
  decision: DecisionRow;
  shortlist: TradeLite[];
  sharedPriorities: string[];
  unresolvedCount: number;
  isOwner: boolean;
  onStatus: (status: string) => void;
}) {
  const { lang, decision, shortlist, sharedPriorities, unresolvedCount, isOwner } = props;
  const statuses: { value: string; label: string; labelHi: string }[] = [
    { value: "in_progress", label: "Still deciding", labelHi: "सोच रहे हैं" },
    { value: "resolved", label: "Decision made", labelHi: "फ़ैसला हो गया" },
    { value: "needs_counsellor", label: "Needs counsellor", labelHi: "काउंसलर चाहिए" },
    { value: "closed", label: "Closed", labelHi: "बंद" },
  ];
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {lang === "hi" ? "लर्नर चाहता है" : "Learner wants"}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {decision.learner_priorities.map((p, i) => <li key={i} className="text-[13px]">• {p}</li>)}
            {decision.learner_priorities.length === 0 && <li className="text-[13px] text-muted-foreground">—</li>}
          </ul>
          {decision.learner_notes && <p className="mt-3 border-t border-border/60 pt-3 text-[13px] leading-relaxed text-muted-foreground">{decision.learner_notes}</p>}
        </section>
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {lang === "hi" ? "पेरेंट चाहते हैं" : "Parent wants"}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {decision.parent_priorities.map((p, i) => <li key={i} className="text-[13px]">• {p}</li>)}
            {decision.parent_priorities.length === 0 && <li className="text-[13px] text-muted-foreground">—</li>}
          </ul>
          {decision.parent_notes && <p className="mt-3 border-t border-border/60 pt-3 text-[13px] leading-relaxed text-muted-foreground">{decision.parent_notes}</p>}
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "जहाँ आप साथ हैं" : "Where you align"}
        </h2>
        {sharedPriorities.length ? (
          <ul className="mt-2 space-y-1.5">
            {sharedPriorities.map((p, i) => <li key={i} className="text-[13px]">✓ {p}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">
            {lang === "hi" ? NO_RANKING_LINE_HI : NO_RANKING_LINE}
          </p>
        )}
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          {lang === "hi" ? NO_RANKING_LINE_HI : NO_RANKING_LINE}
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "शॉर्टलिस्ट और अगला कदम" : "Shortlist & next steps"}
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {shortlist.length === 0 && <span className="text-[13px] text-muted-foreground">{lang === "hi" ? "कुछ शॉर्टलिस्ट नहीं।" : "Nothing shortlisted."}</span>}
          {shortlist.map((t) => (
            <Link key={t.id} to="/vocational/trades/$slug" params={{ slug: t.slug }} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium">
              {(lang === "hi" && t.name_hi) ? t.name_hi : t.name}
            </Link>
          ))}
        </div>
        {shortlist.some((t) => t.vocational_progression_pathways?.length) && (
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            {lang === "hi"
              ? `रास्ते: ${shortlist.map((t) => (t.vocational_progression_pathways ?? []).map((p) => p.stage).join(" → ")).filter(Boolean).join(" | ")}`
              : `Pathways: ${shortlist.map((t) => (t.vocational_progression_pathways ?? []).map((p) => p.stage).join(" → ")).filter(Boolean).join(" | ")}`}
          </p>
        )}
      </section>

      {isOwner && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Room status</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => props.onStatus(s.value)}
                className={
                  decision.status === s.value
                    ? "rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                    : "rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                }
              >
                {lang === "hi" ? s.labelHi : s.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ConcernsSection(props: {
  lang: Lang;
  concerns: Concern[];
  raiserRole: (id: string) => "learner" | "parent";
  newConcern: { category: string; text: string };
  setNewConcern: (v: { category: string; text: string }) => void;
  raiseConcern: () => void;
  askSaarthi: (id: string) => void;
  facilitating: string | null;
  setConcernStatus: (id: string, status: string) => void;
}) {
  const { lang, concerns } = props;
  return (
    <section className="mt-6">
      <h2 className="font-serif text-lg font-semibold">
        {lang === "hi" ? "चिंताएँ और सवाल" : "Concerns & questions"}
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {lang === "hi" ? "हर चिंता अलग-अलग रखी जा सकती है — कोई ज़बरदस्ती नहीं।" : "Each concern is handled separately — nothing is forced."}
      </p>

      <div className="mt-3 rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap gap-2">
          <select
            value={props.newConcern.category}
            onChange={(e) => props.setNewConcern({ ...props.newConcern, category: e.target.value })}
            className="rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none"
            aria-label="Concern category"
          >
            {CONCERN_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{lang === "hi" ? c.hi : c.en}</option>
            ))}
          </select>
          <input
            value={props.newConcern.text}
            onChange={(e) => props.setNewConcern({ ...props.newConcern, text: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); props.raiseConcern(); } }}
            placeholder={lang === "hi" ? "चिंता लिखें — जैसे: इसमें नौकरी मिलेगी?" : "e.g. Will my child actually get a job?"}
            className="min-w-[220px] flex-1 rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground/30"
          />
          <button
            type="button"
            onClick={props.raiseConcern}
            className="rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-pop"
          >
            {lang === "hi" ? "जोड़ें" : "Add"}
          </button>
        </div>
      </div>

      <ul className="mt-3 space-y-3">
        {concerns.length === 0 && (
          <li className="text-[13px] text-muted-foreground">{lang === "hi" ? "अभी कोई चिंता नहीं।" : "No concerns raised yet."}</li>
        )}
        {concerns.map((c) => (
          <li key={c.id} className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                {concernLabel(c.concern_category, lang)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {props.raiserRole(c.raised_by) === "parent" ? (lang === "hi" ? "पेरेंट" : "Parent") : (lang === "hi" ? "लर्नर" : "Learner")}
              </span>
              <span className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                c.status === "resolved" ? "bg-primary/10 text-primary" : c.status === "needs_counsellor" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground",
              )}>
                {c.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{c.concern_text}</p>

            {c.ai_response && (
              <div className="mt-3 rounded-2xl bg-muted/40 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <BrainCircuit className="h-3.5 w-3.5" /> {lang === "hi" ? "सारथी का निरपेक्ष विचार" : "Saarthi's neutral view"}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed">{c.ai_response.understanding}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {lang === "hi" ? "सत्यापित जानकारी" : "Evidence"}
                </p>
                <ul className="mt-1 space-y-1">
                  {c.ai_response.evidence.map((e, i) => <li key={i} className="text-[13px] leading-relaxed">• {e}</li>)}
                </ul>
                {c.ai_response.alternatives.length > 0 && (
                  <>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {lang === "hi" ? "अन्य रास्ते" : "Alternatives"}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {c.ai_response.alternatives.map((a, i) => <li key={i} className="text-[13px] leading-relaxed">• {a}</li>)}
                    </ul>
                  </>
                )}
                <p className="mt-2 text-[12px] italic leading-relaxed text-muted-foreground">
                  {lang === "hi" ? "अभी जो पता नहीं है: " : "Still unknown: "}{c.ai_response.uncertainty}
                </p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {!c.ai_response && (
                <button
                  type="button"
                  disabled={props.facilitating === c.id}
                  onClick={() => props.askSaarthi(c.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background shadow-pop disabled:opacity-50"
                >
                  <BrainCircuit className="h-3.5 w-3.5" />
                  {props.facilitating === c.id ? "…" : lang === "hi" ? "सारथी से पूछें" : "Ask Saarthi"}
                </button>
              )}
              <button type="button" onClick={() => props.setConcernStatus(c.id, "resolved")} className="rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:border-foreground/20">
                {lang === "hi" ? "चिंता शांत हुई" : "Resolved"}
              </button>
              <button type="button" onClick={() => props.setConcernStatus(c.id, "still_concerned")} className="rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:border-foreground/20">
                {lang === "hi" ? "अब भी चिंता है" : "Still concerned"}
              </button>
              <button
                type="button"
                onClick={() => props.setConcernStatus(c.id, "needs_counsellor")}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold text-amber-700 hover:border-amber-500/40"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                {lang === "hi" ? "काउंसलर चाहिए" : "Needs a counsellor"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FamilyReport(props: {
  lang: Lang;
  decision: DecisionRow;
  shortlist: TradeLite[];
  concerns: Concern[];
  raiserRole: (id: string) => "learner" | "parent";
  unresolvedCount: number;
}) {
  const { lang, decision, shortlist, concerns } = props;
  const [open, setOpen] = useState(false);
  const parentConcerns = concerns.filter((c) => props.raiserRole(c.raised_by) === "parent");
  const learnerConcerns = concerns.filter((c) => props.raiserRole(c.raised_by) === "learner");
  const shared = decision.learner_priorities.filter((p) => decision.parent_priorities.includes(p));
  const differing = [
    ...decision.learner_priorities.filter((p) => !decision.parent_priorities.includes(p)).map((p) => ({ side: "learner", p })),
    ...decision.parent_priorities.filter((p) => !decision.learner_priorities.includes(p)).map((p) => ({ side: "parent", p })),
  ];
  const unavailable = lang === "hi" ? UNAVAILABLE_EVIDENCE_HI : UNAVAILABLE_EVIDENCE;

  const sections: [string, string, React.ReactNode][] = [
    [lang === "hi" ? "लर्नर की जानकारी" : "Learner profile", "1", <List items={decision.learner_priorities} fallback={lang === "hi" ? "प्राथमिकताएँ नहीं लिखी गईं।" : "No priorities written yet."} />],
    [lang === "hi" ? "परिवार की प्राथमिकताएँ" : "Family priorities", "2", <List items={decision.parent_priorities} fallback={lang === "hi" ? "प्राथमिकताएँ नहीं लिखी गईं।" : "No priorities written yet."} />],
    [lang === "hi" ? "शॉर्टलिस्ट किए रास्ते" : "Shortlisted vocational pathways", "3", <List items={shortlist.map((t) => (lang === "hi" && t.name_hi) ? t.name_hi : t.name)} fallback={lang === "hi" ? "कुछ नहीं चुना गया।" : "Nothing shortlisted yet."} />],
    [lang === "hi" ? "देखा गया सबूत" : "Evidence reviewed", "4", <p className="text-[13px] leading-relaxed text-muted-foreground">{lang === "hi" ? "हर ट्रेड के पेज पर सिर्फ़ सत्यापित दावे (स्रोत और तारीख़ के साथ) दिखते हैं। जहाँ डेटा नहीं है, वहाँ साफ़ लिखा है।" : "Each trade page shows verified claims only, with source and date. Where data is missing, it says so plainly."}</p>],
    [lang === "hi" ? "पेरेंट की चिंताएँ" : "Parent concerns", "5", <List items={parentConcerns.map((c) => `${concernLabel(c.concern_category, lang)}: ${c.concern_text}`)} fallback={lang === "hi" ? "कोई चिंता नहीं।" : "None raised."} />],
    [lang === "hi" ? "लर्नर की चिंताएँ" : "Learner concerns", "6", <List items={learnerConcerns.map((c) => `${concernLabel(c.concern_category, lang)}: ${c.concern_text}`)} fallback={lang === "hi" ? "कोई चिंता नहीं।" : "None raised."} />],
    [lang === "hi" ? "सहमति" : "Areas of agreement", "7", <List items={shared} fallback={lang === "hi" ? "अभी कोई साझा प्राथमिकता नहीं।" : NO_RANKING_LINE} />],
    [lang === "hi" ? "असहमति" : "Areas of disagreement", "8", differing.length ? <List items={differing.map((d) => `${d.side === "learner" ? "Learner" : "Parent"}: ${d.p}`)} fallback="" /> : <p className="text-[13px] text-muted-foreground">{lang === "hi" ? "अभी कोई अंतर दर्ज नहीं।" : "No differences recorded yet."}</p>],
    [lang === "hi" ? "करियर आगे बढ़ने के रास्ते" : "Career progression options", "9", <List items={shortlist.flatMap((t) => (t.vocational_progression_pathways ?? []).map((p) => p.stage)).filter((v, i, a) => a.indexOf(v) === i)} fallback={unavailable} />],
    [lang === "hi" ? "आर्थिक पहलू" : "Financial considerations", "10", <p className="text-[13px] leading-relaxed text-muted-foreground">{unavailable} {lang === "hi" ? "ट्रेड के पेज पर सत्यापित लागत/कमाई की जानकारी दिखेगी, जब उपलब्ध हो।" : "Verified cost/earnings figures appear on each trade page when available."}</p>],
    [lang === "hi" ? "ट्रेनिंग विकल्प" : "Training options", "11", <p className="text-[13px] leading-relaxed text-muted-foreground">{lang === "hi" ? "सत्यापित ट्रेनिंग केंद्र हर ट्रेड के पेज पर दिखते हैं; जहाँ नहीं हैं, वहाँ साफ़ लिखा है।" : "Verified training providers appear on each trade page; where none exist, it says so."}</p>],
    [lang === "hi" ? "अनसुलझे सवाल" : "Unresolved questions", "12", <List items={concerns.filter((c) => c.status === "open" || c.status === "still_concerned").map((c) => c.concern_text)} fallback={lang === "hi" ? "कोई नहीं।" : "None."} />],
    [lang === "hi" ? "अगले कदम" : "Recommended next steps", "13", <List items={[
      lang === "hi" ? "हर शॉर्टलिस्टेड ट्रेड का पेज परिवार के साथ देखें" : "Review each shortlisted trade page together",
      lang === "hi" ? "जो जानकारी नहीं मिली, उसे ट्रेनिंग केंद्र से पूछकर जाँचें" : "Verify missing information directly with training centres",
      props.unresolvedCount > 0 ? (lang === "hi" ? "अनसुलझी चिंताओं पर काउंसलर से बात करें" : "Discuss unresolved concerns with a counsellor") : (lang === "hi" ? "ज़रूरत पड़ने पर काउंसलर से बात करें" : "Talk to a counsellor whenever you need"),
    ]} fallback="" />],
    [lang === "hi" ? "इंसानी काउंसलर की सिफ़ारिश" : "Human counsellor recommendation", "14", props.unresolvedCount > 0 || decision.status === "needs_counsellor"
      ? <p className="text-[13px] font-medium text-amber-700">{lang === "hi" ? "सिफ़ारिश: काउंसलर से बात करें।" : "Recommended — a counsellor conversation would help."}</p>
      : <p className="text-[13px] text-muted-foreground">{lang === "hi" ? "अभी ज़रूरी नहीं; चाहें तो कभी भी बात कर सकते हैं।" : "Not required right now — available whenever you want."}</p>],
  ];

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-3xl border border-border bg-card p-5 text-left shadow-card"
      >
        <span className="flex items-center gap-2 font-serif text-lg font-semibold">
          <ClipboardList className="h-5 w-5" />
          {lang === "hi" ? "फैमिली करियर डिसीज़न रिपोर्ट" : "Family Career Decision Report"}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-3 rounded-3xl border border-border bg-card p-5 shadow-card">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {lang === "hi"
              ? "यह रिपोर्ट फ़ैसला लेने में मदद के लिए है — यह फ़ैसला नहीं करती और किसी एक रास्ते की सिफ़ारिश नहीं देती।"
              : "This report supports your family's decision — it does not make the decision and never recommends a single 'best' trade."}
          </p>
          <div className="mt-4 space-y-4">
            {sections.map(([title, num, body]) => (
              <div key={num}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {num}. {title}
                </h3>
                <div className="mt-1.5">{body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function List({ items, fallback }: { items: string[]; fallback: string }) {
  if (!items.length) return <p className="text-[13px] text-muted-foreground">{fallback}</p>;
  return (
    <ul className="space-y-1">
      {items.map((it, i) => <li key={i} className="text-[13px] leading-relaxed">• {it}</li>)}
    </ul>
  );
}
