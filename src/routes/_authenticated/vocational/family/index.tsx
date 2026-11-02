import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, KeyRound, ArrowRight } from "lucide-react";
import { useVocLangContext } from "@/features/vocational/ui";
import { DECISION_SUPPORT_LINE, DECISION_SUPPORT_LINE_HI } from "@/features/vocational/constants";

export const Route = createFileRoute("/_authenticated/vocational/family/")({
  head: () => ({ meta: [
    { title: "Family Decision Room · UNTRAP" },
    { name: "description", content: "A shared room where learners and parents state priorities and concerns — nobody is forced to agree." },
    { name: "robots", content: "noindex" },
  ] }),
  component: FamilyDecisionList,
});

interface DecisionRow {
  id: string;
  title: string;
  status: string;
  invite_code: string;
  owner_user_id: string;
  updated_at: string;
}

const STATUS_LABEL: Record<string, { en: string; hi: string }> = {
  in_progress: { en: "In progress", hi: "चल रहा है" },
  resolved: { en: "Decided", hi: "तय हुआ" },
  needs_counsellor: { en: "Needs counsellor", hi: "काउंसलर चाहिए" },
  closed: { en: "Closed", hi: "बंद" },
};

function FamilyDecisionList() {
  const { lang } = useVocLangContext();
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [invite, setInvite] = useState("");
  const [role, setRole] = useState<"learner" | "parent">("learner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const { data } = await supabase
        .from("vocational_decisions")
        .select("id,title,status,invite_code,owner_user_id,updated_at")
        .order("updated_at", { ascending: false });
      setDecisions((data as DecisionRow[]) ?? []);
    })();
  }, []);

  async function createDecision() {
    if (!userId || !newTitle.trim()) return;
    setBusy(true); setError(null);
    const { data, error: err } = await supabase
      .from("vocational_decisions")
      .insert({ owner_user_id: userId, title: newTitle.trim() })
      .select("id")
      .single();
    setBusy(false);
    if (err) { setError("Something went wrong. Please try again."); return; }
    navigate({ to: "/vocational/family/$decisionId", params: { decisionId: data.id } });
  }

  async function joinDecision() {
    const code = invite.trim();
    if (!code) return;
    setBusy(true); setError(null);
    const { data, error: err } = await supabase.rpc("join_vocational_decision", {
      _invite_code: code,
      _participant_role: role,
    });
    setBusy(false);
    if (err) {
      setError(err.message.includes("Invitation") ? (lang === "hi" ? "निमंत्रण नहीं मिला — कोड जाँचें।" : "Invitation not found — check the code.") : "Something went wrong. Please try again.");
      return;
    }
    navigate({ to: "/vocational/family/$decisionId", params: { decisionId: data as string } });
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        {lang === "hi" ? "फैमिली डिसीज़न रूम" : "Family Decision Room"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {lang === "hi"
          ? "आप और परिवार अपनी बात अलग-अलग रख सकते हैं — सहमति ज़बरदस्ती नहीं।"
          : "You and your family state priorities and concerns separately — nobody is forced to agree."}
      </p>
      <p className="mt-3 inline-flex rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground">
        {lang === "hi" ? DECISION_SUPPORT_LINE_HI : DECISION_SUPPORT_LINE}
      </p>

      <section className="mt-5">
        <h2 className="font-serif text-lg font-semibold">
          {lang === "hi" ? "आपके डिसीज़न रूम" : "Your decision rooms"}
        </h2>
        {decisions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "hi" ? "अभी कोई रूम नहीं है।" : "No decision rooms yet."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {decisions.map((d) => (
              <li key={d.id}>
                <Link
                  to="/vocational/family/$decisionId"
                  params={{ decisionId: d.id }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:shadow-pop"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {d.owner_user_id === userId
                        ? (lang === "hi" ? "आपने बनाया (लर्नर)" : "Created by you (learner)")
                        : (lang === "hi" ? "आप सदस्य हैं" : "You're a member")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                      {STATUS_LABEL[d.status] ? (lang === "hi" ? STATUS_LABEL[d.status].hi : STATUS_LABEL[d.status].en) : d.status}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <Plus className="h-4 w-4" /> {lang === "hi" ? "नया रूम बनाएँ" : "Start a new room"}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {lang === "hi" ? "लर्नर के रूप में रूम बनाएँ, फिर परिवार को कोड भेजें।" : "Create as the learner, then invite your family with a code."}
          </p>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={lang === "hi" ? "रूम का नाम, जैसे: मेरा करियर फ़ैसला" : "Room name, e.g. My career decision"}
            className="mt-3 w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground/30"
          />
          <button
            type="button"
            disabled={busy || !newTitle.trim()}
            onClick={createDecision}
            className="mt-3 w-full rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-pop disabled:opacity-50"
          >
            {lang === "hi" ? "बनाएँ" : "Create room"}
          </button>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <KeyRound className="h-4 w-4" /> {lang === "hi" ? "कोड से जुड़ें" : "Join with a code"}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {lang === "hi" ? "परिवार वाले (माता-पिता) इसी तरह जुड़ते हैं।" : "How a parent joins the room."}
          </p>
          <input
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="Invite code"
            className="mt-3 w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground/30"
          />
          <div className="mt-2 flex gap-1.5">
            {(["learner", "parent"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={
                  role === r
                    ? "flex-1 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background"
                    : "flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground"
                }
              >
                {r === "learner" ? (lang === "hi" ? "लर्नर" : "Learner") : (lang === "hi" ? "पेरेंट" : "Parent")}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy || !invite.trim()}
            onClick={joinDecision}
            className="mt-3 w-full rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-pop disabled:opacity-50"
          >
            {lang === "hi" ? "जुड़ें" : "Join room"}
          </button>
        </section>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
