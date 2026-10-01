# UNTRAP Vocational — SIH26241 implementation plan

## Product scope
Add a first-class, additive Vocational module to the existing signed-in UNTRAP app. Preserve current auth, career assessment, Saarthi, family-related features, roadmaps, and navigation journeys. Treat vocational outcomes as decision support, not a career verdict.

## Experience
- Add a primary Vocational entry to the existing app navigation and a dedicated signed-in workspace with Explore Trades, Compare Careers, Family Decision Room, Career Pathway, My Counselling, Human Counsellor, and Saved Decisions.
- Build a short, progressive learner/family discovery flow with English and Hindi copy, and a translation-ready structure. Avoid requesting sensitive demographic details unless needed by the user journey.
- Add searchable trade pages and side-by-side comparison, showing NSQF progression in plain language. Outcome claims must be tied to verified records with a visible source and update date; otherwise show “Verified data unavailable for this location/trade.” Never invent outcomes.
- Build distinct learner, parent, and shared decision views; let each person state priorities and concerns without forcing agreement. Structure parent concerns, evidence review, agreement/disagreement, unresolved questions, and next steps.
- Add a parent-friendly career explainer, a family decision report, and a visible counsellor request path for unresolved concerns, missing evidence, high uncertainty, or an explicit request.
- Keep administrator insights out of student/parent navigation and protect them with server/database-validated roles.

## Data and safeguards
- Add normalized vocational records for trades, qualifications, providers, locations, job roles, progression pathways, sources, and outcome metrics, plus family decisions, participant roles, concerns, resolution state, and counsellor requests.
- Use additive migrations with explicit grants, RLS, and policies. Student/parent access is limited to their linked decision room; counsellors and administrators receive only their authorized scoped access. Store roles separately from profiles.
- Permit public/signed-in display of only suitably safe trade catalog data; create/update verified claims only through authorized staff workflows. Track verification status, source/reference, geography, collection date, and update date for each outcome metric.
- Do not seed fabricated outcome statistics, providers, prices, wages, placements, or demand. Show unavailable states until verified data is supplied.

## Delivery phases
1. **Foundations:** inspect existing role/auth patterns; additive data model, grants/RLS, least-privilege server operations, role-aware route structure, and navigation entry.
2. **Discovery:** trade catalogue, detail view, source/verification labels, filters, progressive learner/family profile, and comparison.
3. **Family support:** decision room with learner/parent/shared perspectives, structured concern and resolution flows, pathway visualizer, and plain-language explainer.
4. **Counselling and insights:** family decision report, counsellor requests/status, and a separately protected aggregated administrator dashboard.
5. **Verification:** ensure unauthorized roles cannot read staff/admin data or other families; verify unavailable evidence is never presented as fact; exercise mobile/desktop primary journeys; confirm existing journeys remain intact and build is green.

## Technical decisions
- Keep Vocational as an additive feature area with dedicated top-level signed-in routes under the existing authentication layout; this keeps the current URL and auth conventions intact.
- Use database RLS as the final authorization boundary and server-side role checks for privileged actions; UI hiding is not authorization.
- Store translations as locale-aware content fields and use English as fallback; add Hindi without hard-wiring the data model to only two languages.
- Keep all claim generation grounded in verified database records; AI may explain, compare, and facilitate but may not create outcome figures or decide for a family.
