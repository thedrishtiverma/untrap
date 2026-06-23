import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Compass,
  FileText,
  HeartHandshake,
  Layers,
  MessageCircle,
  Quote,
  ScrollText,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNTRAP — Your future is too important to guess." },
      {
        name: "description",
        content:
          "UNTRAP is the AI career companion built around YOU. Discover yourself, find the path that actually fits, and build your future with Saarthi — your always-on AI mentor.",
      },
      { property: "og:title", content: "UNTRAP — Your future is too important to guess." },
      {
        property: "og:description",
        content: "Stop guessing. Start designing. The AI career companion for Indian students.",
      },
    ],
  }),
  component: Landing,
});

/* ---------- Tiny scroll-reveal hook (no external dep) ---------- */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setShown(true), io.disconnect()),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown };
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ============================================================== */
function Landing() {
  return (
    <div className="min-h-screen untrap-ivory">
      <Nav />
      <Hero />
      <PainMirror />
      <BigQuestion />
      <IntroduceUntrap />
      <JourneyTimeline />
      <Differentiator />
      <SaarthiSection />
      <ReportPreview />
      <TrustSection />
      <MissionSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ---------- NAV ---------- */
function Nav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8 sm:py-8">
      <Link to="/" aria-label="UNTRAP home" className="flex items-center">
        <Logo size="lg" />
      </Link>
      <nav className="hidden items-center gap-8 sm:flex">
        <a href="#pain" className="text-sm font-medium text-foreground/70 hover:text-foreground">
          Why UNTRAP
        </a>
        <a href="#journey" className="text-sm font-medium text-foreground/70 hover:text-foreground">
          The Journey
        </a>
        <a href="#saarthi" className="text-sm font-medium text-foreground/70 hover:text-foreground">
          Saarthi AI
        </a>
        <Link to="/auth" className="text-sm font-medium text-foreground/70 hover:text-foreground">
          Sign in
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 sm:hidden"
        >
          Start
        </Link>
      </div>
    </header>
  );
}

/* ---------- SECTION 1 · HERO ---------- */
function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-12">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-break-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/70 px-3 py-1 text-xs font-semibold text-foreground/70 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Identity first. Career next.
          </span>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-7xl">
            Your future is too important to{" "}
            <span className="font-serif italic font-light">guess</span>.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/65">
            Before you pick a career, understand yourself. UNTRAP is the AI companion that maps who
            you are, what shapes you, and the path that actually fits — then walks it with you.
          </p>


          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 text-base font-semibold text-accent-foreground orange-glow transition hover:translate-y-[-2px]"
            >
              Discover My Path
              <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#journey"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-card px-6 py-4 text-base font-semibold text-foreground hover:bg-foreground hover:text-background"
            >
              See How UNTRAP Works
            </a>
          </div>

          <p className="mt-6 text-sm text-foreground/50">
            5-minute start · No credit card · Built for Indian students
          </p>
        </div>

        <HeroTransformation />
      </div>
    </section>
  );
}

/* Confusion → Intelligence layer → Clarity */
function HeroTransformation() {
  const fragments = [
    "Engineering?",
    "MBA?",
    "Government job?",
    "Startup?",
    "Which skill?",
    "Am I wasting time?",
  ];
  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-[480px]">
      {/* LEFT — floating confusion */}
      <div className="absolute inset-y-0 left-0 w-[44%]">
        {fragments.map((f, i) => (
          <span
            key={f}
            className="absolute rounded-2xl border border-foreground/10 bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground/55 shadow-soft backdrop-blur"
            style={{
              top: `${8 + i * 14}%`,
              left: `${(i % 2) * 18}%`,
              transform: `rotate(${i % 2 ? 4 : -5}deg)`,
              animation: `rise-loop ${3 + (i % 3)}s ease-in-out ${i * 0.2}s infinite`,
            }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* CENTER — UNTRAP intelligence core */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative grid h-28 w-28 place-items-center rounded-full bg-foreground text-background shadow-[0_30px_80px_-20px_oklch(0.16_0.005_80_/_0.5)]">
          <span aria-hidden className="absolute inset-0 rounded-full ring-[10px] ring-accent/15 animate-breakthrough" />
          <span aria-hidden className="absolute -inset-3 rounded-full ring-1 ring-foreground/10" />
          <Sparkles className="h-7 w-7" />
          <span className="absolute -bottom-7 text-[10px] font-bold uppercase tracking-[0.25em] text-foreground/60">
            UNTRAP
          </span>
        </div>
      </div>

      {/* RIGHT — clear future map */}
      <div className="absolute right-0 top-1/2 w-[52%] -translate-y-1/2 space-y-2.5">
        {[
          { step: "01", title: "Career direction", tone: "ink" as const },
          { step: "02", title: "Skills to learn", tone: "ink" as const },
          { step: "03", title: "30-day roadmap", tone: "ink" as const },
          { step: "04", title: "Steady growth", tone: "orange" as const },
        ].map((s, i) => (
          <div
            key={s.step}
            style={{ animation: `break-up 600ms cubic-bezier(.2,.7,.2,1) ${i * 120}ms both` }}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-soft ${
              s.tone === "ink" ? "bg-foreground text-background" : "bg-accent text-accent-foreground"
            }`}
          >
            <span
              className={`text-[10px] font-bold tracking-widest ${
                s.tone === "ink" ? "text-background/60" : "text-accent-foreground/80"
              }`}
            >
              {s.step}
            </span>
            <span className="text-sm font-semibold">{s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- SECTION 2 · PAIN MIRROR ---------- */
function PainMirror() {
  const cards = [
    {
      title: "Too many choices",
      quote: "I have hundreds of options but don't know which one fits me.",
      icon: Layers,
    },
    {
      title: "Outside pressure",
      quote: "My family wants one path. My heart wants another.",
      icon: HeartHandshake,
    },
    {
      title: "Comparison trap",
      quote: "Everyone seems ahead. I feel stuck.",
      icon: Users,
    },
    {
      title: "Random learning",
      quote: "I keep consuming advice but don't know what to do next.",
      icon: ScrollText,
    },
  ];
  return (
    <section id="pain" className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Most students don't lack ambition.
          <br />
          <span className="font-serif italic font-light text-foreground/70">
            They lack clarity.
          </span>
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 100}>
            <article className="lift group relative overflow-hidden rounded-3xl border border-foreground/8 bg-card p-7 shadow-soft hover:border-foreground/20">
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-foreground">
                  <c.icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <span className="text-xs font-bold tracking-widest text-foreground/30">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold">{c.title}</h3>
              <p className="mt-3 font-serif text-lg italic text-foreground/70">"{c.quote}"</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- SECTION 3 · THE BIG QUESTION ---------- */
function BigQuestion() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 sm:py-32">
      <Reveal>
        <Quote className="mx-auto h-8 w-8 text-accent" />
        <p className="mt-8 font-serif text-4xl font-light leading-[1.1] text-foreground sm:text-6xl">
          What if the problem was never your{" "}
          <span className="italic text-accent">potential</span>?
        </p>
      </Reveal>
      <Reveal delay={150}>
        <p className="mx-auto mt-8 max-w-2xl text-lg text-foreground/60 sm:text-xl">
          What if you simply never had a system to understand yourself?
        </p>
      </Reveal>
    </section>
  );
}

/* ---------- SECTION 4 · INTRODUCE UNTRAP ---------- */
function IntroduceUntrap() {
  const pillars = [
    {
      label: "Who you are",
      desc: "Interests · strengths · personality",
      icon: Brain,
    },
    {
      label: "What shapes you",
      desc: "Family · friends · environment · experiences",
      icon: HeartHandshake,
    },
    {
      label: "Where you want to go",
      desc: "Goals · dreams · ambitions",
      icon: Compass,
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <Reveal>
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
          Meet UNTRAP
        </span>
        <h2 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Your personal AI career companion.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-foreground/65">
          UNTRAP understands the full picture of who you are — then designs a roadmap around it.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {pillars.map((p, i) => (
          <Reveal key={p.label} delay={i * 120}>
            <div className="lift h-full rounded-3xl border border-foreground/8 bg-card p-7 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-foreground text-background">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-xl font-bold">{p.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">{p.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={400}>
        <div className="mt-8 flex items-center justify-center gap-3 rounded-full border border-foreground/10 bg-card/60 px-6 py-3 text-sm font-medium text-foreground/70 backdrop-blur sm:w-fit sm:mx-auto">
          <Sparkles className="h-4 w-4 text-accent" />
          Then UNTRAP creates your personalized future roadmap.
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- SECTION 5 · JOURNEY TIMELINE ---------- */
function JourneyTimeline() {
  const steps = [
    {
      step: "01",
      title: "Understand",
      hook: "Discover your real self.",
      body: "An honest assessment of your personality, strengths, interests, and environment.",
    },
    {
      step: "02",
      title: "Discover",
      hook: "Explore careers that actually fit you.",
      body: "AI matches your identity and reality with future-ready career directions.",
    },
    {
      step: "03",
      title: "Build",
      hook: "Turn clarity into action.",
      body: "A personalized roadmap with daily, weekly, and monthly missions.",
    },
    {
      step: "04",
      title: "Grow",
      hook: "Saarthi stays with you.",
      body: "An AI mentor who guides you through questions, decisions, and progress.",
    },
  ];
  return (
    <section id="journey" className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <Reveal>
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
          The UNTRAP journey
        </span>
        <h2 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Four moves from confusion to a future you actually want.
        </h2>
      </Reveal>

      <div className="relative mt-14">
        <div
          aria-hidden
          className="absolute left-5 top-0 hidden h-full w-px bg-gradient-to-b from-accent/0 via-foreground/15 to-accent/0 md:block md:left-1/2"
        />
        <ol className="space-y-10 md:space-y-16">
          {steps.map((s, i) => {
            const flip = i % 2 === 1;
            return (
              <Reveal key={s.step} delay={i * 100}>
                <li
                  className={`relative grid items-center gap-6 md:grid-cols-2 ${
                    flip ? "md:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div className={flip ? "md:pl-12" : "md:pr-12"}>
                    <div className="lift rounded-3xl border border-foreground/8 bg-card p-7 shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-accent-foreground text-xs font-extrabold">
                          {s.step}
                        </span>
                        <h3 className="text-2xl font-bold">{s.title}</h3>
                      </div>
                      <p className="mt-4 font-serif text-xl italic text-foreground/85">
                        {s.hook}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-foreground/60">{s.body}</p>
                    </div>
                  </div>
                  <div
                    aria-hidden
                    className="absolute left-5 top-8 hidden h-3 w-3 rounded-full bg-accent ring-[6px] ring-background md:block md:left-1/2 md:-translate-x-1/2"
                  />
                  <div />
                </li>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ---------- SECTION 6 · DIFFERENTIATOR ---------- */
function Differentiator() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <Reveal>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Not another career quiz.
        </h2>
        <p className="mt-3 max-w-xl text-foreground/60">
          Quizzes give you a label. UNTRAP gives you a system that evolves with you.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Reveal>
          <div className="rounded-3xl border border-foreground/8 bg-card p-7 shadow-soft">
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">
              Traditional
            </span>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-medium text-foreground/55">
              {["Questions", "Career list", "Done"].map((t, i, a) => (
                <span key={t} className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1.5">{t}</span>
                  {i < a.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-foreground/30" />}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm text-foreground/55">
              A label that ages out the moment your context changes.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="untrap-obsidian relative overflow-hidden rounded-3xl p-7 text-background shadow-pop">
            <span className="text-xs font-bold uppercase tracking-widest text-accent">
              UNTRAP
            </span>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-background">
              {["Understand", "Discover", "Experiment", "Improve", "Grow"].map((t, i, a) => (
                <span key={t} className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">{t}</span>
                  {i < a.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-background/60" />}
                </span>
              ))}
            </div>
            <p className="mt-6 max-w-md text-sm text-background/70">
              The more you use UNTRAP, the better it understands you.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- SECTION 7 · SAARTHI ---------- */
function SaarthiSection() {
  return (
    <section id="saarthi" className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/70 px-3 py-1 text-xs font-semibold text-foreground/70 backdrop-blur">
            <Sparkles className="h-3 w-3 text-accent" /> Saarthi AI
          </span>
          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Everyone needs someone who{" "}
            <span className="font-serif italic font-light">understands</span> their journey.
          </h2>
          <p className="mt-5 max-w-lg text-foreground/65">
            Saarthi remembers your context — your goals, your blockers, your wins. Ask about family
            pressure, course confusion, or the next skill to learn. In English, Hindi, or Hinglish.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="space-y-3">
            <ChatBubble who="student" text="My parents want me to choose engineering, but I don't feel connected." />
            <ChatBubble
              who="saarthi"
              text="Let's understand what you value first. Then we'll design a realistic path you can discuss with them — with proof, not just feelings."
            />
            <ChatBubble who="student" text="I don't know what skill to learn." />
            <ChatBubble
              who="saarthi"
              text="Based on your goals and strengths, let's start with these three small experiments this week."
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ChatBubble({ who, text }: { who: "student" | "saarthi"; text: string }) {
  if (who === "student") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-tr-md bg-secondary px-5 py-3 text-sm text-foreground/80 shadow-soft">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-card px-5 py-3 text-sm leading-relaxed text-foreground/85 shadow-card">
        {text}
      </div>
    </div>
  );
}

/* ---------- SECTION 8 · REPORT PREVIEW ---------- */
function ReportPreview() {
  const items = [
    { label: "Your Identity", icon: Brain },
    { label: "Your Strengths", icon: Target },
    { label: "Your Career Directions", icon: Compass },
    { label: "Your Hidden Blocks", icon: Layers },
    { label: "Your Action Plan", icon: ScrollText },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
        <Reveal>
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
            Personalized report
          </span>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Your Future Map.
          </h2>
          <p className="mt-4 max-w-md text-foreground/65">
            Not a generic PDF. A personal document about you — written in your voice, grounded in
            your reality, and ready to act on.
          </p>
        </Reveal>

        <Reveal delay={150}>
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-accent/20 via-transparent to-indigo/20 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[32px] border border-foreground/10 bg-card p-7 shadow-pop">
              <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                    Your Future Map
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-foreground/40">v1 · personalized</span>
              </div>
              <div className="mt-5 space-y-2.5">
                {items.map((it) => (
                  <div
                    key={it.label}
                    className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <it.icon className="h-4 w-4 text-foreground/70" />
                      <span className="text-sm font-semibold">{it.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-foreground/30" />
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-foreground p-4 text-background">
                <p className="font-serif text-base italic">
                  "You think in systems and build through stories. Three directions fit you right
                  now — let's test the boldest one first."
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-background/60">
                  — Saarthi, your AI mentor
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- SECTION 9 · TRUST ---------- */
function TrustSection() {
  const reasons = [
    {
      title: "Personalized AI",
      desc: "Every insight is shaped by your data — not a template.",
    },
    {
      title: "Built for Indian realities",
      desc: "Tier-2/3 constraints, budgets, and timelines factored in.",
    },
    {
      title: "Understands family pressure",
      desc: "Strategies for hard conversations, not just career names.",
    },
    {
      title: "Adapts with growth",
      desc: "As you change, your roadmap evolves. No frozen labels.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <Reveal>
        <h2 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Why students need UNTRAP.
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reasons.map((r, i) => (
          <Reveal key={r.title} delay={i * 80}>
            <div className="lift h-full rounded-3xl border border-foreground/8 bg-card p-6 shadow-soft">
              <div className="h-1 w-10 rounded-full bg-accent" />
              <h3 className="mt-5 text-lg font-bold">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">{r.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- SECTION 10 · MISSION ---------- */
function MissionSection() {
  return (
    <section className="mx-auto mb-24 max-w-6xl px-5 sm:px-8">
      <Reveal>
        <div className="untrap-obsidian relative overflow-hidden rounded-[40px] p-10 text-background sm:p-16">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
            Our mission
          </span>
          <h2 className="mt-5 max-w-3xl font-serif text-4xl font-light leading-[1.05] text-background sm:text-6xl">
            Every student deserves the chance to discover{" "}
            <span className="italic">who they can become</span>.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-background/70 sm:text-lg">
            Millions of students make life-changing decisions without ever understanding themselves.
            UNTRAP exists to give every student a personal guide for their journey — patient, honest,
            and always on their side.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- SECTION 11 · FINAL CTA ---------- */
function FinalCTA() {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-28 text-center sm:px-8">
      <Reveal>
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
          Start discovering yourself
        </span>
        <h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          The future becomes clearer when you{" "}
          <span className="font-serif italic font-light">understand yourself</span>.
        </h2>
        <Link
          to="/auth"
          className="group mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-semibold text-accent-foreground orange-glow transition hover:translate-y-[-2px]"
        >
          Begin My UNTRAP Journey
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
        <p className="mt-5 text-sm text-foreground/50">Free to start · 5 minutes · Built around you</p>
      </Reveal>
    </section>
  );
}

/* ---------- FOOTER ---------- */
function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
      <div className="flex flex-col items-start justify-between gap-8 border-t border-foreground/10 pt-12 sm:flex-row sm:items-center">
        <Logo size="lg" showTagline />
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap gap-5 text-sm font-medium text-foreground/65">
            <a href="#journey" className="hover:text-foreground">Journey</a>
            <a href="#saarthi" className="hover:text-foreground">Saarthi</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <MessageCircle className="h-4 w-4 opacity-0" aria-hidden />
          </div>
          <p className="text-xs text-foreground/50">
            © {new Date().getFullYear()} UNTRAP. Made for students who refuse to stay stuck.
          </p>
        </div>
      </div>
    </footer>
  );
}
