
# UNTRAP — Phase 1 Implementation Blueprint

Read-only engineering plan based on the current repository. No code changes proposed here — this is the execution map to get Phase 1 to a shippable MVP with the fewest credits.

---

## 1. Current-State Feature Matrix

Legend: ✅ Complete · 🟡 Exists, needs wiring · 🟠 Exists, needs refactor · ❌ Missing

### Foundation
| Area | Status | Notes |
|---|---|---|
| TanStack Start shell (`__root`, `router.tsx`, `start.ts`, `server.ts`) | ✅ | Bootstrapped, auth attacher registered |
| Design system (`styles.css`, Obsidian/Ivory/Orange/Indigo tokens) | ✅ | Tokens + Open Sauce/Fraunces loaded |
| Theme system (light/dark/system) | ✅ | `ThemeProvider`, `ThemeToggle` |
| Logo + BreakMark + favicon | ✅ | `Logo.tsx`, `BreakMark.tsx` |
| AppShell + bottom-nav + desktop top-nav | ✅ | `AppShell.tsx` |
| Auth (email + Google via Lovable) | ✅ | `auth.tsx`, `_authenticated/route.tsx` |
| `_authenticated` route gate | ✅ | Redirects unauth to `/auth` |
| Onboarding (basic 5-field) | 🟠 | Works, but not the 5-step "conversational" flow promised in `.lovable/plan.md`; doesn't capture confusion/family/financial/time/skills into `student_profiles` |
| Profile page | 🟡 | Route exists; needs edit + sign-out audit |
| Landing page (11-section arc) | ✅ | Shipped |

### Assessment
| Area | Status | Notes |
|---|---|---|
| `assessment_questions` table | 🟡 | Table exists, **empty** — no seed |
| `assessment_responses` + `assessments` | ✅ | Schema + RLS |
| Assessment route/UI | 🟠 | Single-flow UI exists but not sectioned (Confusion → Interests → Strengths → Personality → Reality → Blockers) |
| Section intros + progress + one-question-per-screen | ❌ | Not built |
| Response persistence per section | 🟡 | Server fn exists, needs section grouping |

### Career Intelligence & Report
| Area | Status | Notes |
|---|---|---|
| `career_profiles` table | 🟡 | Exists, **empty**; `import_career_profiles` RPC ready |
| Seed dataset (JSON of curated careers) | ❌ | Not created |
| V1 matching (`career.functions.ts`) | 🟠 | Legacy; still referenced by report UI |
| V2 matching (`career-intelligence.functions.ts`) | ✅ | Weighted 30/25/20/15/10, JSON-safe |
| Moat-aware matching (`moat-intelligence.functions.ts`) | 🟡 | Built, not wired into report route |
| `career_matches` / `career_reports` tables | ✅ | |
| Report route (`/report`) | 🟠 | Renders V1 output; needs V2 + moat wiring, Career Identity hero, Strength radial, Trap section, Escape Plan timeline |
| `MoatMeters` component | 🟡 | Built, not mounted in report/dashboard |

### Roadmap & Daily Planner
| Area | Status | Notes |
|---|---|---|
| `roadmap_templates`, `user_roadmaps`, `roadmap_tasks`, `daily_tasks` | ✅ | Schema present |
| Roadmap generator (server fn) | 🟡 | V1 + V2 both exist, V2 not wired |
| Roadmap UI (W1→W4) | 🟠 | Basic list, not week-grouped card layout |
| Daily task completion + streak | ❌ | No UI |
| `user_progress` + `weekly_reflections` UI | ❌ | Tables only |

### Saarthi AI Mentor
| Area | Status | Notes |
|---|---|---|
| `chat_messages` + `ai_chat_history` + `student_memories` | ✅ | |
| `chatWithSaarthi` server fn | 🟠 | Uses legacy path, not the moat + memory-injected V2 in `career-intelligence.functions.ts` |
| Chat route UI | 🟠 | Works, but no memory chips, no avatar/mentor framing, no markdown, no AI Elements composition |
| `ai_prompts` versioned templates | ✅ | Loader + memoization done |

### Infra / Quality
| Area | Status | Notes |
|---|---|---|
| RLS + GRANTs on every public table | ✅ | Verified in prior security pass |
| `has_role` moved to `private` schema | ✅ | |
| Error sanitization in server fns | ✅ | |
| Analytics events plumbing | 🟡 | Table exists, no emitters |
| Knowledge base ingestion | 🟡 | Table exists, unused |
| Duplicate server-fn generations (V1 / V2 / Moat) | 🟠 | 3 parallel implementations — biggest tech-debt item |

---

## 2. Dependency Graph

```text
                   ┌─────────────────────────┐
                   │ A. Server-fn consolidation│  (blocks everything downstream)
                   └────────────┬────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐   ┌──────────▼─────────┐   ┌─────────▼──────────┐
│ B. Seed career_│   │ C. Seed assessment_│   │ D. Onboarding v2   │
│    profiles    │   │    questions       │   │ (writes moat cols) │
└───────┬────────┘   └──────────┬─────────┘   └─────────┬──────────┘
        │                       │                       │
        │              ┌────────▼─────────┐             │
        │              │ E. Assessment UI │◄────────────┘
        │              │  (sectioned)     │
        │              └────────┬─────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
         ┌────────────────────┐
         │ F. Report V2 wiring│  (needs B+E)
         │  + Moat + UI       │
         └──────────┬─────────┘
                    ▼
         ┌────────────────────┐
         │ G. Roadmap V2 UI   │  (needs F)
         │  + daily tasks     │
         └──────────┬─────────┘
                    ▼
         ┌────────────────────┐
         │ H. Saarthi V2 wire │  (needs D+F for memory context)
         │  + memory chips    │
         └──────────┬─────────┘
                    ▼
         ┌────────────────────┐
         │ I. Progress +      │
         │   Reflections UI   │
         └──────────┬─────────┘
                    ▼
         ┌────────────────────┐
         │ J. Analytics +     │
         │   polish + QA      │
         └────────────────────┘
```

---

## 3. Developer Task List (Atomic)

Complexity: S ≤1h · M 2–4h · L ≥1 day. Credits are rough Lovable-agent estimates.

### 3.1 Architecture Cleanup

**A1. Pick canonical career/report/chat server fns**
- Goal: One source of truth per capability (V2 + moat-aware).
- Files: `src/lib/career.functions.ts`, `career-intelligence.functions.ts`, `moat-intelligence.functions.ts`, `untrap.functions.ts`.
- Tables: none.
- Server fns: `generateCareerReport`, `matchCareers`, `chatWithSaarthi`, `generateRoadmap`.
- Routes: `/report`, `/roadmap`, `/chat`.
- Complexity: M · Credits: ~25.
- Manual test: build passes; call each canonical fn from a scratch route; no route imports the deprecated modules.
- DoD: `career.functions.ts` and legacy paths in `untrap.functions.ts` are removed; grep shows only canonical imports.

**A2. Delete legacy fns after route re-wiring (see F1/G1/H1)**
- Goal: Remove dead code once new UI ships.
- Complexity: S · Credits: ~5.
- DoD: `rg "career.functions"` returns zero hits.

### 3.2 Database

**B1. Author `career_profiles` seed JSON (25–40 careers)**
- Goal: Populate matching source.
- Files: `supabase/seed/career_profiles.json` (new).
- Tables: `career_profiles` via `import_career_profiles(_payload jsonb)`.
- Complexity: L (content-heavy) · Credits: ~40.
- Test: `SELECT count(*) FROM career_profiles` ≥ 25; sample row has all 27 fields non-null where required.
- DoD: RPC returns row count == payload length.

**C1. Author `assessment_questions` seed (60–90 items across 6 sections)**
- Goal: Enable sectioned assessment.
- Files: `supabase/migrations/*_seed_assessment_questions.sql` OR use insert tool.
- Tables: `assessment_questions`.
- Complexity: L · Credits: ~35.
- Test: 6 distinct `section` values; each question has scoring metadata.
- DoD: Assessment UI can render all sections without null gaps.

**C2. Add `section_order` + `weight` columns if missing**
- Only if C1 reveals schema gaps.
- Complexity: S · Credits: ~5.

**D0. Confirm `student_profiles` covers moat/context fields**
- Goal: No new migration if columns already exist (audit says they do).
- Complexity: S · Credits: ~3.
- DoD: `\d student_profiles` shows confusion_level, family_expectations, financial_limits, daily_time, current_skills.

### 3.3 AI

**AI1. Consolidate prompt versions in `ai_prompts`**
- Goal: One active version per prompt name (career_match_v2, report_v2, saarthi_v2, roadmap_v2, trap_detect_v2, moat_infer_v1).
- Tables: `ai_prompts`.
- Complexity: M · Credits: ~15.
- Test: `SELECT name, count(*) FILTER (WHERE active) FROM ai_prompts GROUP BY name` → all 1.
- DoD: Loader always resolves canonical prompt.

**AI2. Moat inference trigger on onboarding completion**
- Goal: Run `moat-intelligence.functions.ts::inferMoat` after onboarding save.
- Files: `_authenticated/onboarding.tsx` (client call), server fn already exists.
- Complexity: S · Credits: ~8.
- DoD: New user has `student_moat_profile` row after onboarding.

### 3.4 Backend

**BE1. Section-aware assessment submit fn**
- Goal: `submitAssessmentSection({ section, responses })` idempotent per section.
- Files: `src/lib/untrap.functions.ts` or new `assessment.functions.ts`.
- Tables: `assessment_responses`, `assessments`.
- Complexity: M · Credits: ~15.
- DoD: Re-submitting a section updates, doesn't duplicate.

**BE2. `completeAssessment` triggers report + roadmap generation**
- Goal: Single call fans out to matching → report → trap detect → roadmap.
- Complexity: M · Credits: ~20.
- DoD: `/report` renders within one navigation after completion.

**BE3. Daily task completion + streak fn**
- Goal: `toggleDailyTask(taskId)` updates `daily_tasks.completed_at` and increments `user_progress.streak_days`.
- Complexity: M · Credits: ~15.
- DoD: Streak increments only once per calendar day.

**BE4. Weekly reflection submit fn**
- Complexity: S · Credits: ~8.

**BE5. Analytics emitter helper**
- Goal: `logEvent(name, payload)` → `analytics_events`.
- Complexity: S · Credits: ~5.

### 3.5 Frontend

**FE1. Onboarding v2 (5-step conversational)**
- Goal: One-question-per-screen, writes moat context fields.
- Files: `src/routes/_authenticated/onboarding.tsx`.
- Tables: `profiles`, `student_profiles`.
- Complexity: L · Credits: ~35.
- Test: Progress "01/05" visible; back button preserves state; final submit inserts moat inference (AI2).
- DoD: New user completes onboarding in <90s on mobile.

**FE2. Assessment sectioned UI**
- Goal: 6 sections with intro screens, single-question cards, progress bar.
- Files: `src/routes/_authenticated/assessment.tsx`.
- Complexity: L · Credits: ~50.
- DoD: All 6 sections navigable, resumable mid-flow.

**FE3. Report v2 UI**
- Goal: Career Identity hero, Strength radial chart, top-3 Career Match cards, Trap card, Escape Plan timeline, MoatMeters embed.
- Files: `src/routes/_authenticated/report.tsx`, `src/components/MoatMeters.tsx` (mount).
- Complexity: L · Credits: ~60.
- DoD: Renders with real user data; empty-state if no assessment.

**FE4. Roadmap v2 UI (W1→W4 grouped cards)**
- Files: `src/routes/_authenticated/roadmap.tsx`.
- Complexity: M · Credits: ~30.
- DoD: Tasks grouped by week with completion checkboxes.

**FE5. Daily planner + streak on dashboard**
- Files: `src/routes/_authenticated/dashboard.tsx`.
- Complexity: M · Credits: ~25.
- DoD: "Today's Mission" card + streak counter.

**FE6. Weekly reflection prompt UI**
- Complexity: S · Credits: ~10.

**FE7. Saarthi chat V2 (memory chips + markdown + mentor header)**
- Files: `src/routes/_authenticated/chat.tsx`.
- Complexity: M · Credits: ~25.
- DoD: "I remember…" chips render from `student_memories`; markdown replies render.

**FE8. Profile page edit + sign-out audit**
- Files: `src/routes/_authenticated/profile.tsx`.
- Complexity: S · Credits: ~10.

### 3.6 UX

**UX1. Empty states for /report /roadmap /chat when prerequisites missing**
- Complexity: S · Credits: ~10.

**UX2. Global loading skeletons on data routes**
- Complexity: S · Credits: ~8.

**UX3. Toast + error boundary polish**
- Complexity: S · Credits: ~5.

### 3.7 Testing

**T1. Playwright smoke: auth → onboarding → assessment → report → roadmap → chat**
- Complexity: M · Credits: ~20.
- DoD: One green run against localhost.

**T2. RLS regression queries**
- Complexity: S · Credits: ~5.
- DoD: Anonymous role cannot read any user table.

**T3. AI fallback paths (rate-limit, credit exhaust, malformed JSON)**
- Complexity: S · Credits: ~8.

---

## 4. Duplicate Code Inventory

| Duplicate | Keep | Remove |
|---|---|---|
| Career matching: `career.functions.ts` vs `career-intelligence.functions.ts` vs moat variant | `career-intelligence.functions.ts` (V2) + moat overlay | `career.functions.ts` legacy `matchCareers`, `generateReport` |
| Saarthi chat: `career.functions.ts::chatWithSaarthi` vs V2 in `career-intelligence.functions.ts` | V2 (memory + moat context) | V1 chat fn |
| Roadmap generation: V1 in `untrap.functions.ts` vs V2 | V2 | V1 |
| Trap detection: two variants | Moat-aware version | Plain-context version |
| Legacy `assessments` submit vs section-aware (to build) | New section-aware | Old single-blob submit |

---

## 5. Optimal Credit-Efficient Order

Rationale: seed data unblocks 3 UIs at once; consolidating server fns first prevents refactoring the same UI twice.

1. **A1** consolidate server fns (25) — blocks everything
2. **AI1** prompt cleanup (15)
3. **B1** career_profiles seed (40) — content, unblocks report
4. **C1** assessment_questions seed (35) — unblocks assessment
5. **FE1 + AI2** onboarding v2 + moat inference (43) — unlocks moat everywhere
6. **BE1 + FE2** assessment sectioned (65)
7. **BE2 + FE3** report v2 (80)
8. **FE4 + BE3 + FE5** roadmap + daily + dashboard (70)
9. **FE7** Saarthi V2 (25)
10. **BE4 + FE6** reflections (18)
11. **BE5 + UX1–3** analytics + polish (28)
12. **T1–T3** QA (33)
13. **A2** delete legacy (5)

Estimated total: **~485 credits**.

---

## 6. Milestone Roadmap

**Milestone 1 — Stable Foundation** *(Arch + Data)*
- A1, AI1, B1, C1, D0
- Exit: canonical server fns only; seed data live; onboarding writes full context.

**Milestone 2 — Functional MVP** *(Core loop end-to-end)*
- FE1, AI2, BE1, FE2, BE2, FE3
- Exit: user can sign up → onboard → assess → view V2 report with moat meters.

**Milestone 3 — Beta Ready** *(Roadmap + daily + mentor)*
- FE4, BE3, FE5, FE7, BE4, FE6, FE8
- Exit: full daily loop; Saarthi remembers; reflections submitted; profile editable.

**Milestone 4 — Production Ready** *(Instrumentation + QA)*
- BE5, UX1, UX2, UX3, T1, T2, T3, A2
- Exit: analytics live, empty/loading/error states everywhere, Playwright smoke green, no dead code.

---

## 7. GitHub-Ready Checklist

Copy directly into Issues (grouped by milestone label).

**M1 — Stable Foundation**
- [ ] A1 Consolidate career/report/chat/roadmap server functions to V2 + moat
- [ ] AI1 Deactivate old `ai_prompts` versions; one active row per name
- [ ] B1 Author + import `career_profiles` seed (25–40 careers)
- [ ] C1 Author + insert `assessment_questions` seed (60–90 items, 6 sections)
- [ ] D0 Verify `student_profiles` has all moat context columns

**M2 — Functional MVP**
- [ ] FE1 Onboarding v2 (5-step conversational, mobile-first)
- [ ] AI2 Trigger moat inference on onboarding completion
- [ ] BE1 `submitAssessmentSection` idempotent per section
- [ ] FE2 Assessment sectioned UI with intros + progress
- [ ] BE2 `completeAssessment` fans out to report + trap + roadmap
- [ ] FE3 Report v2 UI (Identity hero, radial, matches, trap, escape plan, moat)

**M3 — Beta Ready**
- [ ] FE4 Roadmap v2 UI (W1→W4 grouped)
- [ ] BE3 Daily task toggle + streak fn
- [ ] FE5 Dashboard "Today's Mission" + streak
- [ ] FE7 Saarthi v2 UI (memory chips, markdown, mentor header)
- [ ] BE4 Weekly reflection submit fn
- [ ] FE6 Weekly reflection prompt UI
- [ ] FE8 Profile edit + sign-out audit

**M4 — Production Ready**
- [ ] BE5 `logEvent` analytics helper + emitters on key actions
- [ ] UX1 Empty states across `/report` `/roadmap` `/chat`
- [ ] UX2 Loading skeletons on all data routes
- [ ] UX3 Toast + error boundary polish
- [ ] T1 Playwright smoke: full happy path
- [ ] T2 RLS regression queries
- [ ] T3 AI failure-path tests (429 / 402 / bad JSON)
- [ ] A2 Delete legacy server-fn files after re-wiring

---

**No code touched.** Approve this plan (or tell me which milestone to start) and I'll begin Milestone 1 in the next turn.
