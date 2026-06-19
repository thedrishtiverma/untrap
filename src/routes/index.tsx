import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles, Map, MessageCircle, ClipboardCheck, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNTRAP — Escape confusion. Build your future." },
      { name: "description", content: "UNTRAP is the AI career clarity companion for students. Discover your strengths, find your direction, and follow a 30-day roadmap." },
      { property: "og:title", content: "UNTRAP — Escape confusion. Build your future." },
      { property: "og:description", content: "The AI career clarity companion for students. Discover yourself. Find your direction." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen untrap-ivory">
      {/* NAV */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8 sm:py-8">
        <Logo size="lg" />
        <nav className="hidden items-center gap-8 sm:flex">
          <a href="#how" className="text-sm font-medium text-foreground/70 hover:text-foreground">How it works</a>
          <a href="#saarthi" className="text-sm font-medium text-foreground/70 hover:text-foreground">Saarthi AI</a>
          <Link to="/auth" className="text-sm font-medium text-foreground/70 hover:text-foreground">Sign in</Link>
        </nav>
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 sm:hidden"
        >
          Start
        </Link>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-break-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/70 px-3 py-1 text-xs font-semibold text-foreground/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              AI career clarity, built for students
            </span>

            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-7xl">
              Escape confusion.<br />
              Build your <span className="font-serif italic font-light text-foreground">future</span>.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/65">
              UNTRAP helps students discover the right career direction using AI-powered self-discovery, personalized roadmaps, and continuous guidance from Saarthi — your AI mentor.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 text-base font-semibold text-accent-foreground orange-glow transition hover:translate-y-[-1px]"
              >
                Find My Path
                <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-card px-6 py-4 text-base font-semibold text-foreground hover:bg-foreground hover:text-background"
              >
                How UNTRAP Works
              </a>
            </div>

            <p className="mt-6 text-sm text-foreground/50">5-minute quiz · No credit card · 100% free to start</p>
          </div>

          {/* HERO VISUAL: Confusion → Clarity transformation */}
          <HeroVisual />
        </div>
      </section>

      {/* QUOTE */}
      <section className="mx-auto max-w-4xl px-5 pb-24 text-center sm:px-8">
        <p className="font-serif text-3xl font-light leading-tight text-foreground/85 sm:text-5xl">
          “Your future is not decided.<br />
          It is <span className="italic text-accent">designed</span>.”
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="mb-12 flex items-end justify-between gap-6">
          <h2 className="max-w-xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Four steps from confusion to clarity.
          </h2>
          <p className="hidden max-w-xs text-sm text-foreground/60 sm:block">
            Honest, practical, India-aware. No quizzes that tell you to "follow your passion."
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { num: "01", icon: ClipboardCheck, title: "Self-discovery", desc: "Map your interests, strengths, and real-life constraints in 5 minutes." },
            { num: "02", icon: Sparkles, title: "AI Career Report", desc: "A warm, specific report on who you are and what fits you." },
            { num: "03", icon: Map, title: "30-day Roadmap", desc: "Tiny daily missions. Built for a student's real schedule and budget." },
            { num: "04", icon: MessageCircle, title: "Saarthi AI mentor", desc: "Always-on guidance for family pressure, doubts, next steps." },
          ].map(({ num, icon: Icon, title, desc }) => (
            <div key={num} className="lift lift-hover group relative overflow-hidden rounded-3xl border border-foreground/8 bg-card p-7 shadow-soft">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold tracking-widest text-foreground/40">{num}</span>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-foreground text-background">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
              </div>
              <h3 className="mt-8 text-xl font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SAARTHI BAND */}
      <section id="saarthi" className="mx-auto mb-20 max-w-6xl px-5 sm:px-8">
        <div className="untrap-obsidian relative overflow-hidden rounded-[40px] p-8 text-background sm:p-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-background/80 backdrop-blur">
                <Sparkles className="h-3 w-3 text-accent" /> Meet Saarthi
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-background sm:text-5xl">
                A mentor who actually <span className="font-serif italic font-light">knows</span> you.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-background/70">
                Saarthi remembers your goals, your blockers, your progress. Ask about family pressure, course confusion, or what to learn next — in English, Hindi, or Hinglish.
              </p>
              <Link
                to="/auth"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground orange-glow transition hover:translate-y-[-1px]"
              >
                Start discovering yourself <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <SaarthiCard />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-foreground/10 pt-8 sm:flex-row sm:items-center">
          <Logo size="sm" showTagline />
          <p className="text-xs text-foreground/50">© {new Date().getFullYear()} UNTRAP. Made for students who refuse to stay stuck.</p>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------- */

function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      {/* LEFT: floating fragments (confusion) */}
      <div className="absolute inset-0">
        <Fragment className="left-2 top-6 -rotate-12 bg-card/80" label="commerce?" />
        <Fragment className="left-12 top-32 rotate-6 bg-card/80" label="engineering?" />
        <Fragment className="left-0 bottom-10 -rotate-6 bg-card/80" label="abroad?" />
      </div>

      {/* RIGHT: clear stacked path (clarity) */}
      <div className="absolute right-2 top-1/2 w-[58%] -translate-y-1/2 space-y-3">
        <ClearStep step="01" title="Design thinking" tone="ink" />
        <ClearStep step="02" title="Build a portfolio" tone="ink" />
        <ClearStep step="03" title="Apply to internships" tone="orange" />
      </div>

      {/* CENTER: the escape arrow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative grid h-24 w-24 place-items-center rounded-full bg-foreground text-background shadow-[0_30px_80px_-20px_oklch(0.16_0.005_80_/_0.5)]">
          <span aria-hidden className="absolute inset-0 rounded-full ring-8 ring-accent/15" />
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 4 L12 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M5 11 L12 4 L19 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Fragment({ className, label }: { className?: string; label: string }) {
  return (
    <div className={`absolute rounded-2xl border border-foreground/10 px-3 py-2 text-xs font-medium text-foreground/60 shadow-soft backdrop-blur ${className ?? ""}`}>
      {label}
    </div>
  );
}

function ClearStep({ step, title, tone }: { step: string; title: string; tone: "ink" | "orange" }) {
  const dark = tone === "ink";
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-soft ${dark ? "bg-foreground text-background" : "bg-accent text-accent-foreground"}`}>
      <span className={`text-[10px] font-bold tracking-widest ${dark ? "text-background/60" : "text-accent-foreground/80"}`}>{step}</span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
}

function SaarthiCard() {
  return (
    <div className="w-full max-w-sm rounded-3xl bg-card p-5 text-foreground shadow-pop lg:w-[340px]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-foreground text-background">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold">Saarthi</p>
          <p className="text-xs text-foreground/50">knows your context</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-secondary p-4 text-sm leading-relaxed text-foreground/80">
        "Your parents want engineering, but your assessment shows strong design instincts. Let's build proof — one tiny project this week. Want a plan?"
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["Show me a plan", "Talk to parents?", "Find free resources"].map((t) => (
          <span key={t} className="rounded-full border border-foreground/10 px-3 py-1 text-xs font-medium text-foreground/70">{t}</span>
        ))}
      </div>
    </div>
  );
}
