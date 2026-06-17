import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Map, MessageCircle, ClipboardCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNTRAP — Discover. Build. Become." },
      { name: "description", content: "AI career clarity for Indian students. Take the quiz, get a personalised report, and follow a 30-day roadmap." },
      { property: "og:title", content: "UNTRAP — Discover. Build. Become." },
      { property: "og:description", content: "AI career clarity for confused Indian students. Built for Tier-2 & Tier-3 cities." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo size="md" />
        <Link to="/auth" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-secondary">
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-16 pt-6">
        <div className="untrap-gradient-soft relative overflow-hidden rounded-4xl border border-border/70 p-8 shadow-card sm:p-14">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl" aria-hidden />

          <span className="relative inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> AI career clarity, built for India
          </span>

          <h1 className="relative mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Confused about your career? <span className="text-primary">Get untrapped</span> in 30 days.
          </h1>
          <p className="relative mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            UNTRAP helps Indian students 15–24 cut through pressure and confusion with a smart self-assessment, a personalised AI report, and a doable 30-day plan — guided by Saarthi AI.
          </p>

          <div className="relative mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-pop transition hover:translate-y-[-1px]"
            >
              Start free
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <span className="text-sm font-medium text-muted-foreground">No credit card · 5-minute quiz</span>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardCheck, title: "Self-assessment", desc: "Map your interests, strengths, working style and real-life constraints in 5 minutes." },
            { icon: Sparkles, title: "AI Career Report", desc: "A warm, honest report on what fits you — and what's holding you back." },
            { icon: Map, title: "30-day roadmap", desc: "Tiny weekly tasks. No fluff. Built to fit a student's reality." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Saarthi AI — your career mentor</p>
              <p className="text-sm text-muted-foreground">Family pressure, course confusion, what to do next — ask anything.</p>
            </div>
          </div>
          <Link to="/auth" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90">
            Meet Saarthi
          </Link>
        </div>

        <p className="mt-12 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Discover · Build · Become
        </p>
      </section>
    </div>
  );
}
