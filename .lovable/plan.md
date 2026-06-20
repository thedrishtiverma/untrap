
# UNTRAP — Audit & Transformation Plan

This is a large multi-surface upgrade. To avoid a chaotic single-shot rebuild, I'll work in 3 focused phases. After each phase you can review the preview and redirect before I move on.

## Current state (audited)

**Backend (already solid):**
- DB: `profiles`, `student_profiles`, `assessments` + `assessment_responses` + `assessment_questions`, `careers`, `career_matches`, `career_reports`, `career_traps` + `user_traps`, `roadmap_templates` + `user_roadmaps` + `roadmap_tasks` + `daily_tasks`, `chat_messages` + `ai_chat_history`, `student_memories`, `weekly_reflections`, `user_progress`, `analytics_events`, `ai_prompts`, `knowledge_base`, `user_roles` (with `has_role`).
- AI layer: `ai-service.server.ts` (versioned prompts + memory retrieval), `ai-gateway.server.ts` (Lovable AI), server fns in `ai.functions.ts`, `untrap.functions.ts`, `career.functions.ts`.
- Auth: `_authenticated` route gate + onboarding redirect.

**Frontend (needs work):**
- Routes: `index`, `auth`, `_authenticated/{onboarding, dashboard, assessment, report, roadmap, chat}`.
- Design tokens already monochrome (Obsidian + Ivory, Indigo for AI). Brand orange `#FF6B2C` exists in chart-2 but is NOT wired as the action accent — your brief explicitly wants it back as the CTA/Progress color.
- Logo wordmark integrated, no animated breakthrough mark, no favicon.
- Mobile bottom nav exists; no desktop top-nav variant; no "Profile" route.
- Assessment, report, roadmap, chat pages exist but haven't been redesigned to the new brand tier.

## Phase 1 — Brand foundation (this turn)

Goal: lock the visual + motion system so every later page inherits it for free.

1. **Color tokens** — re-introduce `#FF6B2C` as `--accent` (Breakthrough Orange) for CTAs/progress, keep Obsidian as `--primary`, keep Indigo for Saarthi AI surfaces, keep Ivory background. Add `--ring-orange`, `orange-glow`, `indigo-glow` utilities.
2. **Typography** — load **Open Sauce Sans** (via fontsource — no remote `@import`) as the UI font with weights 400/500/600/800; keep **Fraunces** for emotional pull-quotes. Update `--font-sans` / `--font-display`.
3. **Breakthrough mark** — new `BreakMark` SVG component (the rising-arrow-from-`t` glyph standalone) for favicon, app icon, loaders, and hero animation. Wire as favicon + apple-touch-icon in `__root.tsx`.
4. **Motion language** — `lift`, `rise`, `break-up`, `breakthrough-loop` utilities; ensure 44px min tap targets globally on Button defaults.
5. **Navigation** — `AppShell` gains a desktop top-nav (Home / Journey / Roadmap / Saarthi / Profile) while keeping the mobile bottom-nav. Add `/profile` route (basic profile view + sign out + edit fields).

## Phase 2 — Conversion + entry flows

6. **Landing (`/`)** — hero with "Your future is too important to guess.", confusion→clarity animation built around the BreakMark, problem section (4 cards), Before/After UNTRAP transformation strip, Saarthi band, footer CTA.
7. **Auth + Onboarding** — onboarding becomes a 5-step conversational flow ("01/05") capturing basic + context (confusion level, family expectations, financial limits, daily time, current skills) — these already map to `student_profiles` columns; I'll wire them. Large cards, single question per step, smooth transitions.

## Phase 3 — Core product surfaces

8. **Assessment** — sectioned flow (Confusion → Interests → Strengths → Personality → Reality Check → Blockers) with progress, section intros, calmer single-question-per-screen layout.
9. **Report** — premium "Your UNTRAP Discovery Report" with Career Identity hero, Strength Map (radial chart), Career Match cards (% + fit reasons + challenges), Biggest Trap section, Escape Plan timeline (Now / 30d / 6m / 1y).
10. **Dashboard** — "Personal Growth OS": clarity score, current goal, Today's Mission, weekly reflection prompt, Saarthi quick-access. Trim density.
11. **Roadmap** — week-by-week (W1 Foundation → W4 Review) visualization with task cards (title, time, difficulty, completion).
12. **Saarthi chat** — mentor framing (avatar, "I remember…" memory chips pulled from `student_memories`), Indigo accent surface, AI Elements composition (`conversation`, `message`, `prompt-input`, `shimmer`), markdown rendering, 3-beat reply structure encouraged via system prompt update.

## Out of scope for now (call out if you want them in)

- Parent portal, payments, mentor marketplace, community, physical kits, school partnerships (V2 per your earlier brief).
- Hindi/Hinglish localisation pass — Saarthi will accept all three in input/output, but I won't ship a full i18n string table.
- Push notifications / email reminders.

## Technical notes

- Tailwind v4 tokens live in `src/styles.css` only; fonts via `<link>` in `__root.tsx` head (no remote `@import`).
- All new server logic stays in `*.functions.ts` with `requireSupabaseAuth`; no new tables needed — current schema covers everything in this plan.
- Mobile-first: 320 / 375 / 430 breakpoints validated with `browser--view_preview`; min 44px hit areas via Button base classes.
- Accessibility: semantic-token colors only, `aria-label` on all icon buttons, single `<main>` per route already in place.

---

**If you approve, I'll start with Phase 1 (brand foundation) this turn — that's the highest-leverage change because every other page inherits from it.** Reply approve, or tell me which phase to start with / drop.
