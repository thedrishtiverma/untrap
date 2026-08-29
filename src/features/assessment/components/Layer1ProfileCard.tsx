import { Brain, CheckCircle2 } from "lucide-react";

import type { Layer1Profile } from "../types/layer1";

export function Layer1ProfileCard({ profile }: { profile: Layer1Profile }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Layer 1 · Psychological intelligence
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">How you think, decide and keep going</h2>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {profile.insights.map((insight) => (
          <li key={insight} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{insight}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        A working picture built from {profile.evidenceCount} signals across {profile.dimensionsMeasured} patterns — not a fixed label.
      </p>
    </section>
  );
}