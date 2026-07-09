
# UNTRAP Assessment Experience Engine — Engineering Blueprint

Grounded in the Assessment Bible (Volumes I–V). This plan engineers only Module 1 (the assessment experience). It delivers no questions, scoring, or AI interpretation — those plug in later against the interfaces defined here.

## 1. Guiding Constraints (from the Bible)

- 8 Intelligence Layers, each with 10–14 dimensions (Psychological, Behavioral, Educational, Decision, Career, Environmental, Constraint, Growth).
- Every response must be **evidence** (behavioral, contextual), never a self-label.
- Bayesian, longitudinal, low-cognitive-load; one primary task per screen.
- Assessment is versioned, resumable, and re-runnable; nothing is a permanent label.

## 2. Architecture Overview

```text
                ┌──────────── Content Layer (DB-driven) ────────────┐
                │ assessment_versions → layers → dimensions →       │
                │ questions → options / branch_rules                │
                └───────────────────────┬───────────────────────────┘
                                        │
                       ┌────────────────▼─────────────────┐
                       │  Assessment Runtime (Engine)     │
                       │  Session · Progress · Validation │
                       │  Branching · Autosave · Recovery │
                       └───┬──────────┬─────────────┬─────┘
                           │          │             │
                 ┌─────────▼──┐ ┌─────▼─────┐ ┌─────▼──────┐
                 │ Renderer   │ │ TanStack  │ │ Supabase   │
                 │ (React)    │ │ Query     │ │ (RLS+RPC)  │
                 └────────────┘ └───────────┘ └────────────┘
```

Content and runtime are fully decoupled: shipping a new question type is a component + a `question_types` row; shipping a new layer is data-only.

## 3. Folder Structure

```text
src/features/assessment/
  api/                 server fns (start, resume, save, next, complete)
  engine/              pure logic: navigation, validation, branching, scoring hooks
  components/          layout, renderer, controls, indicators, modals
  question-types/      one folder per QuestionType (SingleChoice, Likert, …)
  hooks/               useAssessmentSession, useAutosave, useProgress
  state/               context + selectors (no global store)
  types/               generated + hand-written TS interfaces
  utils/               time, a11y, keyboard, offline queue
src/routes/_authenticated/assessment/…   (routes below)
```

## 4. Routes (TanStack Router, under `_authenticated`)

```text
/assessment                      welcome
/assessment/introduction         mission + benefits
/assessment/overview             layers, dimensions, time, autosave
/assessment/consent              consent gate → creates session
/assessment/session/$sessionId   layout (progress, save indicator, exit)
  /layer/$layerSlug              layer intro + question stepper
  /layer/$layerSlug/q/$qSlug     question screen (deep-link-guarded)
  /reflection                    layer reflection
/assessment/review               pre-submit review
/assessment/completion           generating profile animation
/assessment/resume               resume picker
```

Deep-link guard: navigating past unanswered required questions redirects to the earliest incomplete one.

## 5. Question Engine

Every question type implements one interface:

```ts
interface QuestionTypeModule<TValue, TConfig> {
  type: QuestionTypeId;
  Component: FC<QuestionRenderProps<TValue, TConfig>>;
  defaultValue: (cfg: TConfig) => TValue;
  validate: (v: TValue, cfg: TConfig) => ValidationResult;
  serialize: (v: TValue) => Json;
  deserialize: (j: Json, cfg: TConfig) => TValue;
  a11y: { role: string; describe: (cfg: TConfig) => string };
}
```

Registered types (Phase 1): SingleChoice, MultipleChoice, Likert, PriorityRanking, DragOrder, Slider, Timeline, YesNo, TagSelection, ScenarioCards, Reflection, ShortAnswer, Matrix. Reserved (Phase 3+): ImageChoice, VoiceInput, FileUpload. `QuestionRenderer` reads `question.type` and dispatches — routes never import a question type directly.

## 6. Branching & Validation Engine

- Pure functions in `engine/`: `getNextQuestion(session, answers, rules)`, `getPrevQuestion`, `evaluateBranch(rule, answers)`.
- Branch rules stored as DB JSON DSL: `{ if: {questionId, op, value}, then: 'goto'|'skip'|'showLayer', target }`.
- `validate(answer, question)` runs client-side for UX and server-side on save (source of truth).
- Layer-completion validation blocks "Next Layer" until required questions in that layer are answered or explicitly skipped.

## 7. Autosave Engine

- Debounced (400 ms) per question; flushes immediately on blur, next, layer-change, and route-leave.
- Optimistic update → `answers` cache; server call via `saveAnswer` server fn.
- Retry queue in `localStorage` (`untrap:autosave:<sessionId>`) with exponential backoff; drained on reconnect (`online` event) and on session mount.
- Conflict resolution: server compares `client_updated_at`; last-writer-wins per question, but every write is appended to `answer_history` for audit.
- UI states: Saving · Saved · Retrying · Offline · Failed · Recovered · Synced (single `SaveIndicator` component reading a state machine).

## 8. Session & Recovery

- `startSession` creates a row with `assessment_version_id` snapshot so mid-flight publishes never break a live session.
- `resume_token` (opaque UUID) stored in `assessment_sessions` and referenced by `/assessment/resume`.
- `heartbeat` server fn every 30 s updates `last_activity_at` + device metadata.
- Recovery flow: on route mount, hydrate answers from server, replay pending queue, land on `current_question_id`.
- Multi-tab: broadcast channel `untrap-assessment-<sessionId>`; second tab becomes read-only with banner.

## 9. State Management

- **Server state** (questions, answers, progress, session) → TanStack Query with per-request `QueryClient` (already configured).
- **Ephemeral UI state** (draft value being typed, modal open) → local `useState` inside renderer.
- **Cross-cutting session context** (sessionId, currentLayer, saveState) → small React context provided by the session route layout.
- No Redux/Zustand. All derived values via memoized selectors.

## 10. Database Schema (Supabase, additive migration)

New tables (all with `GRANT`s, RLS, `updated_at` triggers):

```text
assessment_definitions(id, slug, title, description, created_by)
assessment_versions(id, definition_id, version, is_published, published_at,
                    snapshot jsonb)   -- immutable content snapshot
layers(id, version_id, order_index, slug, title, purpose, est_minutes)
dimensions(id, layer_id, order_index, slug, title, description)
question_types(id, slug, config_schema jsonb)     -- registry
questions(id, version_id, layer_id, dimension_id, order_index, slug,
          type_id, prompt, description, helper, required, config jsonb,
          a11y jsonb)
question_options(id, question_id, order_index, label, value, meta jsonb)
branch_rules(id, version_id, source_question_id, rule jsonb, target jsonb)

assessment_sessions(id, user_id, version_id, status, current_layer_id,
                    current_question_id, resume_token, started_at,
                    completed_at, last_activity_at, device jsonb)
answers(id, session_id, user_id, question_id, value jsonb,
        skipped bool, time_ms int, client_updated_at, server_updated_at)
answer_history(id, answer_id, value jsonb, changed_at, source)
session_progress(session_id PK, layer_progress jsonb, overall_pct,
                 answered_count, remaining_count, confidence_score)
autosave_queue(id, session_id, payload jsonb, attempts, next_attempt_at)
assessment_audit(id, session_id, event, payload jsonb, at)
```

RLS: every table scoped to `auth.uid() = user_id`; content tables (`layers`, `questions`, …) readable by `authenticated` only. `question_types`, `assessment_versions` writable by admin role only. All `public` tables get explicit `GRANT` blocks in the same migration.

Existing legacy tables (`assessments`, `assessment_questions`, `assessment_responses`) are left untouched; a follow-up migration deprecates them once the new engine is live.

## 11. Server API (createServerFn, all `requireSupabaseAuth`)

`startSession`, `resumeSession(token?)`, `getSession(id)`, `getNextQuestion(id)`, `getPrevQuestion(id)`, `saveAnswer(id, questionId, value, clientTs)`, `batchSaveAnswers`, `skipQuestion`, `getProgress(id)`, `completeAssessment(id)`, `heartbeat(id)`. All return DTOs, never Supabase rows. `completeAssessment` fires a `student_intelligence_profile.requested` audit event — the profile generator (out of scope) subscribes later.

## 12. TypeScript Interfaces (highlights)

`Assessment`, `AssessmentVersion`, `Layer`, `Dimension`, `Question<TConfig>`, `QuestionOption`, `QuestionType`, `Answer<TValue>`, `Session`, `Progress`, `AutosaveState`, `BranchRule`, `ValidationResult`, `NavigationState`, `CompletionSummary`. Strict mode, no `any`, discriminated union on `Question["type"]`.

## 13. Accessibility

- Every question has `aria-labelledby`/`describedby`; renderer wraps in `<fieldset>` where semantically appropriate.
- Full keyboard map: `←/→` prev/next, `1–9` select option, `Enter` confirm, `Esc` open exit modal.
- Focus is restored to the primary interaction on route change; focus trapped in modals; skip-link to main.
- `prefers-reduced-motion` disables transitions; contrast tested at AA; touch targets ≥ 44 px.

## 14. Performance

- Route-level code splitting; each question-type module lazy-loaded.
- Prefetch next question on answer commit.
- Skeletons for question, layer intro, and completion.
- Autosave payloads < 2 KB; batch endpoint for reconnect drain.
- Budgets: LCP < 2 s on mid-range Android, question transition < 150 ms, autosave RTT < 300 ms.

## 15. Security

- All writes go through server fns with `requireSupabaseAuth`; RLS enforces ownership.
- Zod validation on every server fn input; server re-validates against `questions.config`.
- Rate limit: `saveAnswer` ≤ 20/s per user (edge counter table); `startSession` ≤ 5/min.
- Server rejects answers for questions not in the session's `assessment_version_id` snapshot (prevents tampering).
- Resume tokens are opaque UUIDs, single-user scoped, invalidated on completion.

## 16. Error, Loading & Empty States

- Route-level `errorComponent` + `notFoundComponent` on every assessment route with retry (`router.invalidate()`).
- Global `OfflineBanner` bound to `navigator.onLine`.
- Session-corruption path: `SessionRecovery` screen offers Resume / Restart / Contact.
- Empty content (no published version) → friendly "Assessment coming soon" state; never a blank page.

## 17. Observability

- `assessment_audit` for every domain event (start, answer, skip, layer_complete, exit, resume, complete, error).
- Client-side breadcrumbs shipped to existing `error-capture` on unhandled errors.
- Analytics events emitted through existing `logEvent` server fn: `assessment_started`, `layer_completed`, `assessment_completed`, `autosave_failed`, `session_resumed`.

## 18. Testing Strategy

- **Unit**: engine (navigation, validation, branching), question-type validators, autosave state machine.
- **Integration**: server fns against a seeded test schema; RLS deny-tests per role.
- **E2E** (Playwright): full run-through, refresh mid-question, offline drain, resume via token, deep-link guard, keyboard-only run, reduced-motion run.

## 19. Future Extensibility (interfaces reserved now)

- `QuestionTypeModule` registry supports adaptive/AI question types with no engine changes.
- `branch_rules.rule` DSL accepts `ai_signal` predicates for adaptive branching.
- `assessment_versions.snapshot` enables A/B packs and institution-specific assessments.
- `answers.time_ms` + `assessment_audit` provide the raw signal stream for future analytics/gamification.
- i18n: `prompt`, `description`, `helper`, `option.label` are all `jsonb` keyed by locale from day 1 (default `en`).

## 20. Phased Delivery

- **Phase 0 — Foundations (1 migration + scaffolding)**
  New Supabase schema, RLS, GRANTs, seed of `question_types`, feature folder skeleton, routes stubbed with placeholders, TS types generated.
- **Phase 1 — Runtime MVP**
  Welcome → Consent → Session, `QuestionRenderer` with SingleChoice/MultipleChoice/Likert/Slider/Reflection, autosave (online only), progress, completion screen. Content seeded from the Bible for Layer 1 as a smoke test.
- **Phase 2 — Resilience**
  Offline queue, session recovery, multi-tab guard, resume flow, heartbeat, review screen, remaining question types, keyboard + a11y pass.
- **Phase 3 — Content & Ops**
  Admin-only content APIs, version publishing, branching DSL runtime, analytics + audit dashboards, Playwright E2E in CI.
- **Phase 4 — Extensibility Hooks**
  Adaptive-question interface, i18n switch, institution packs, profile-generator webhook contract.

## 21. Acceptance Criteria

- A student can complete, exit, and resume the assessment on any device with no data loss, including after refresh, offline period, and multi-tab open.
- Adding a new question type requires zero changes to routes, engine, or DB schema — only a new module + a `question_types` row.
- Publishing a new assessment version does not disturb in-flight sessions.
- All routes pass Lighthouse a11y ≥ 95 and keyboard-only completion.
- No server fn accepts input without Zod + server-side question validation.
- Every new `public` table ships with RLS + explicit GRANTs in the same migration.

## 22. Non-Goals (explicit)

- No question content authoring in this module (Bible-driven seed only).
- No scoring, dimension inference, or profile generation.
- No AI mentor, recommendations, or career prediction.
- No changes to existing legacy assessment tables in Phase 0–2.

---

**Next step on approval:** execute Phase 0 — create the Supabase migration (new schema + RLS + GRANTs + `question_types` seed) and scaffold `src/features/assessment/` with typed stubs and placeholder routes. Content seeding and Phase 1 runtime follow in the next iteration.
