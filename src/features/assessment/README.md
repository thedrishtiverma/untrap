# Assessment Experience Engine

Phase 0 scaffolding for the UNTRAP Student Intelligence Assessment.

## Layout

- `types/` — public type surface (Session, Question, Answer, etc.).
- `engine/` — pure logic (registry, navigation, branching, validation).
- `api/` — server functions (added in Phase 1).
- `components/` — layout, renderer, indicators (added in Phase 1).
- `question-types/` — one module per `QuestionTypeId` (added in Phase 1).
- `hooks/` — `useAssessmentSession`, `useAutosave`, `useProgress` (Phase 1).
- `state/` — session React context + selectors (Phase 1).
- `utils/` — timers, a11y, offline queue (Phase 1).

The live Layer 1 experience is available at `/assessment-v2` under the
authenticated route tree. The legacy `/assessment` flow has been retired.

## Database

All engine tables are prefixed `ae_*` (plus `assessment_definitions` and
`assessment_versions`). See migration `Phase 0 — Assessment Experience Engine
schema` for the exact SQL. Legacy tables (`assessments`, `assessment_questions`,
`assessment_responses`) are left untouched and deprecated in a later phase.

## Non-goals for Phase 0

No question content, no scoring, no AI interpretation, no UI. See
`.lovable/plan.md` for the full blueprint and phased delivery.
