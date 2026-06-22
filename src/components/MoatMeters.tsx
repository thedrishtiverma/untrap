// MoatMeters — "Your Invisible Forces" dashboard surface.
// Renders 5 force meters + decision-style badge + identity gap from
// student_moat_profile. Score → bar with insight + suggested action.
import { Link } from "@tanstack/react-router";
import { Brain, Compass, Eye, Heart, Sparkles, Users } from "lucide-react";

export interface MoatRow {
  family_dynamics_score: number | null;
  family_value_orientation: string | null;
  family_insight: string | null;
  friend_circle_score: number | null;
  ambition_density: string | null;
  friend_circle_insight: string | null;
  exposure_score: number | null;
  exposure_insight: string | null;
  decision_style: "explorer" | "analyzer" | "executor" | "avoider" | null;
  primary_fear: string | null;
  fear_profile: Array<{ fear: string; intensity: number; evidence: string }> | null;
  identity_gap_score: number | null;
  current_identity: string | null;
  desired_identity: string | null;
  identity_bridge: string | null;
  signal_gaps: Array<{ moat: string; why: string; follow_up_question: string }> | null;
  confidence_score: number | null;
}

const STYLE_BADGE: Record<string, { label: string; hint: string }> = {
  explorer: { label: "Explorer", hint: "You decide by trying many options." },
  analyzer: { label: "Analyzer", hint: "You decide once you have evidence." },
  executor: { label: "Executor", hint: "You decide by doing." },
  avoider: { label: "Avoider", hint: "You delay big calls. Smaller commitments help." },
};

export function MoatMeters({ moat, onGenerate, generating }: {
  moat: MoatRow | null;
  onGenerate: () => void;
  generating: boolean;
}) {
  if (!moat) {
    return (
      <div className="rounded-[24px] border border-foreground/8 bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
          <Sparkles className="h-4 w-4" /> Your invisible forces
        </div>
        <p className="mt-3 text-sm text-foreground/65">
          Career choices aren't made by interest alone. Family, friends, exposure, fears, and identity shape every decision. Let UNTRAP map yours.
        </p>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-50"
        >
          {generating ? "Mapping…" : "Map my invisible forces"}
        </button>
      </div>
    );
  }

  const meters = [
    {
      key: "family",
      icon: <Heart className="h-4 w-4" />,
      label: "Family alignment",
      score: moat.family_dynamics_score ?? 0,
      sub: moat.family_value_orientation ?? "—",
      insight: moat.family_insight ?? "",
    },
    {
      key: "friends",
      icon: <Users className="h-4 w-4" />,
      label: "Friend circle",
      score: moat.friend_circle_score ?? 0,
      sub: `${moat.ambition_density ?? "—"} ambition`,
      insight: moat.friend_circle_insight ?? "",
    },
    {
      key: "exposure",
      icon: <Eye className="h-4 w-4" />,
      label: "Exposure",
      score: moat.exposure_score ?? 0,
      sub: "career awareness",
      insight: moat.exposure_insight ?? "",
    },
  ];

  const styleInfo = moat.decision_style ? STYLE_BADGE[moat.decision_style] : null;
  const gaps = moat.signal_gaps ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-foreground/8 bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
            <Sparkles className="h-4 w-4" /> Your invisible forces
          </div>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="text-[11px] font-semibold text-foreground/50 hover:text-foreground disabled:opacity-50"
          >
            {generating ? "Updating…" : "Refresh"}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {meters.map((m) => (
            <div key={m.key}>
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {m.icon} {m.label}
                  <span className="text-[10px] font-medium text-foreground/45">· {m.sub}</span>
                </div>
                <span className="text-sm font-extrabold">{m.score}<span className="text-[10px] text-foreground/40">/100</span></span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${m.score}%` }} />
              </div>
              {m.insight && <p className="mt-1.5 text-xs text-foreground/55 leading-relaxed">{m.insight}</p>}
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {styleInfo && (
            <div className="rounded-2xl bg-secondary/60 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-foreground/50">
                <Brain className="h-3 w-3" /> Decision style
              </div>
              <p className="mt-1 text-sm font-bold">{styleInfo.label}</p>
              <p className="mt-0.5 text-[11px] text-foreground/55 leading-snug">{styleInfo.hint}</p>
            </div>
          )}
          {moat.primary_fear && (
            <div className="rounded-2xl bg-secondary/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Invisible barrier</div>
              <p className="mt-1 text-sm font-bold capitalize">{moat.primary_fear.replace(/_/g, " ")}</p>
              <p className="mt-0.5 text-[11px] text-foreground/55 leading-snug">Saarthi works around this in your plan.</p>
            </div>
          )}
        </div>

        {moat.current_identity && moat.desired_identity && (
          <div className="mt-4 rounded-2xl border border-foreground/8 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-foreground/50">
              <Compass className="h-3 w-3" /> Identity gap · {moat.identity_gap_score ?? 0}/100
            </div>
            <p className="mt-1.5 text-sm">
              <span className="font-medium text-foreground/65">{moat.current_identity}</span>
              <span className="mx-2 text-foreground/30">→</span>
              <span className="font-bold">{moat.desired_identity}</span>
            </p>
            {moat.identity_bridge && <p className="mt-1 text-[11px] text-foreground/55">{moat.identity_bridge}</p>}
          </div>
        )}
      </div>

      {gaps.length > 0 && (
        <div className="rounded-[20px] border border-dashed border-foreground/15 bg-card p-4">
          <p className="text-xs font-bold">Saarthi has {gaps.length} question{gaps.length > 1 ? "s" : ""} for you</p>
          <p className="mt-1 text-[11px] text-foreground/55">Answering them sharpens your invisible-forces map.</p>
          <Link to="/chat" className="mt-3 inline-flex text-xs font-semibold text-accent">Answer in chat →</Link>
        </div>
      )}
    </div>
  );
}
