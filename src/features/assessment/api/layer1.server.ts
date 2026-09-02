/**
 * Server-only Layer 1 persistence + inference logic. All functions receive an
 * RLS-scoped Supabase client (acting as the signed-in student) and that
 * student's id — no admin client, no service-role key.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import {
  LAYER1_SLUG,
  LAYER1_VERSION,
  type AnswerValue,
  type Layer1Answer,
  type Layer1Content,
  type Layer1Profile,
  type Layer1Question,
  type Layer1QuestionType,
  type Layer1SessionState,
} from "../types/layer1";
import { hasValue, isLayerComplete, validateAnswerValue, visibleQuestions } from "../engine/adaptive";
import { deriveAllEvidence, type EvidenceObject } from "../engine/evidence";
import { inferLayer1 } from "../engine/inference";
import { buildInsights } from "../engine/insights";

type DB = SupabaseClient<Database>;

/** Human-readable failure that is safe to send to the client. */
export class AssessmentError extends Error {}

function fail(context: string, error: unknown, message: string): never {
  // Raw database errors stay on the server.
  console.error(`[layer1] ${context}`, error);
  throw new AssessmentError(message);
}

const GENERIC = "Something went wrong on our side. Please try again in a moment.";

function text(raw: unknown, fallback = ""): string {
  if (raw && typeof raw === "object" && "en" in (raw as Record<string, unknown>)) {
    const v = (raw as Record<string, unknown>).en;
    if (typeof v === "string") return v;
  }
  return typeof raw === "string" ? raw : fallback;
}

const SUPPORTED_TYPES: Layer1QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "slider",
  "priority_ranking",
  "reflection",
];

// ---------------------------------------------------------------- content

export async function loadLayer1Content(db: DB): Promise<Layer1Content> {
  const { data: version, error: vErr } = await db
    .from("assessment_versions")
    .select("id, version, is_published")
    .eq("is_published", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (vErr) fail("load version", vErr, GENERIC);
  if (!version) throw new AssessmentError("The assessment is not available yet. Please check back soon.");

  const { data: layer, error: lErr } = await db
    .from("ae_layers")
    .select("id, slug, title, purpose, est_minutes")
    .eq("version_id", version.id)
    .eq("slug", LAYER1_SLUG)
    .maybeSingle();
  if (lErr) fail("load layer", lErr, GENERIC);
  if (!layer) throw new AssessmentError("This part of the assessment is not available yet.");

  const [{ data: dims, error: dErr }, { data: rows, error: qErr }] = await Promise.all([
    db
      .from("ae_dimensions")
      .select("slug, title, description, order_index")
      .eq("layer_id", layer.id)
      .order("order_index"),
    db
      .from("ae_questions")
      .select(
        "id, slug, order_index, required, prompt, description, config, dimension_id, type:ae_question_types(slug), options:ae_question_options(id, value, label, meta, order_index)",
      )
      .eq("layer_id", layer.id)
      .order("order_index"),
  ]);
  if (dErr) fail("load dimensions", dErr, GENERIC);
  if (qErr) fail("load questions", qErr, GENERIC);

  const dimById = new Map<string, string>();
  const { data: dimIds } = await db.from("ae_dimensions").select("id, slug").eq("layer_id", layer.id);
  for (const d of dimIds ?? []) dimById.set(d.id, d.slug);

  const questions: Layer1Question[] = (rows ?? [])
    .map((r) => {
      const typeSlug = (r.type as { slug: string } | null)?.slug as Layer1QuestionType | undefined;
      if (!typeSlug || !SUPPORTED_TYPES.includes(typeSlug)) return null;
      return {
        id: r.id,
        slug: r.slug,
        type: typeSlug,
        orderIndex: r.order_index,
        required: r.required,
        prompt: text(r.prompt),
        description: r.description ? text(r.description) : null,
        dimensionSlug: r.dimension_id ? dimById.get(r.dimension_id) ?? null : null,
        config: (r.config ?? {}) as Layer1Question["config"],
        options: [...((r.options ?? []) as Record<string, unknown>[])]
          .sort((a, b) => Number(a.order_index) - Number(b.order_index))
          .map((o) => ({
            id: String(o.id),
            value: String(o.value),
            label: text(o.label),
            signals: parseSignals((o.meta as Record<string, unknown> | null)?.signals),
          })),
      } satisfies Layer1Question;
    })
    .filter((q): q is Layer1Question => q !== null);

  if (questions.length === 0) {
    throw new AssessmentError("The assessment content could not be loaded. Please try again later.");
  }

  return {
    versionId: version.id,
    assessmentVersion: version.version,
    layer: {
      id: layer.id,
      slug: layer.slug,
      title: layer.title,
      purpose: layer.purpose,
      estMinutes: layer.est_minutes,
    },
    dimensions: (dims ?? []).map((d) => ({
      slug: d.slug,
      title: d.title,
      description: d.description,
    })),
    questions,
  };
}

function parseSignals(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const out: { construct: string; strength: number; weight: number }[] = [];
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [construct, strength, weight] = entry as [string, number, number?];
    if (typeof construct !== "string" || typeof strength !== "number") continue;
    out.push({ construct, strength, weight: typeof weight === "number" ? weight : 1 });
  }
  return out;
}

// ---------------------------------------------------------------- session

export async function startOrResumeSession(
  db: DB,
  userId: string,
  content: Layer1Content,
  device: Record<string, unknown>,
): Promise<{ session: Layer1SessionState; resumed: boolean }> {
  const { data: existing, error } = await db
    .from("ae_sessions")
    .select("id, status, current_question_id, started_at, completed_at")
    .eq("user_id", userId)
    .eq("version_id", content.versionId)
    .in("status", ["in_progress", "completed"])
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("find session", error, GENERIC);

  if (existing) {
    const answers = await loadAnswers(db, existing.id, content);
    return {
      resumed: true,
      session: {
        sessionId: existing.id,
        status: existing.status as Layer1SessionState["status"],
        currentQuestionSlug:
          content.questions.find((q) => q.id === existing.current_question_id)?.slug ?? null,
        answers,
        startedAt: existing.started_at,
        completedAt: existing.completed_at,
      },
    };
  }

  const { data: created, error: cErr } = await db
    .from("ae_sessions")
    .insert({
      user_id: userId,
      version_id: content.versionId,
      status: "in_progress",
      current_layer_id: content.layer.id,
      current_question_id: content.questions[0]?.id ?? null,
      device: device as never,
    })
    .select("id, status, started_at, completed_at")
    .single();
  if (cErr || !created) fail("create session", cErr, GENERIC);

  return {
    resumed: false,
    session: {
      sessionId: created.id,
      status: created.status as Layer1SessionState["status"],
      currentQuestionSlug: content.questions[0]?.slug ?? null,
      answers: [],
      startedAt: created.started_at,
      completedAt: created.completed_at,
    },
  };
}

async function loadAnswers(db: DB, sessionId: string, content: Layer1Content): Promise<Layer1Answer[]> {
  const { data, error } = await db
    .from("ae_answers")
    .select("question_id, value, skipped")
    .eq("session_id", sessionId);
  if (error) fail("load answers", error, GENERIC);

  const bySlug = new Map(content.questions.map((q) => [q.id, q.slug]));
  return (data ?? [])
    .filter((a) => bySlug.has(a.question_id))
    .map((a) => ({
      questionId: a.question_id,
      questionSlug: bySlug.get(a.question_id)!,
      value: (a.value ?? null) as AnswerValue,
      skipped: a.skipped,
    }));
}

// ---------------------------------------------------------------- answers

function sanitizeText(raw: string, maxLength: number): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export async function saveAnswer(
  db: DB,
  userId: string,
  input: { sessionId: string; questionSlug: string; value: AnswerValue; skipped: boolean; timeMs?: number },
): Promise<{ ok: true }> {
  const content = await loadLayer1Content(db);
  const question = content.questions.find((q) => q.slug === input.questionSlug);
  if (!question) throw new AssessmentError("That question is no longer part of the assessment.");

  const { data: session, error: sErr } = await db
    .from("ae_sessions")
    .select("id, status")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (sErr) fail("load session", sErr, GENERIC);
  if (!session) throw new AssessmentError("We could not find your assessment session. Please reload.");
  if (session.status === "completed") {
    throw new AssessmentError("This assessment has already been submitted.");
  }

  let value = input.value;
  if (question.type === "reflection" && typeof value === "string") {
    value = sanitizeText(value, question.config.maxLength ?? 500);
  }
  const skipped = input.skipped || !hasValue(value);
  if (skipped && question.required) {
    throw new AssessmentError("Please answer this one before moving on.");
  }
  if (!skipped) {
    const valid = validateAnswerValue(question, value);
    if (!valid.ok) throw new AssessmentError(valid.error);
  }

  const { data: saved, error: aErr } = await db
    .from("ae_answers")
    .upsert(
      {
        session_id: input.sessionId,
        user_id: userId,
        question_id: question.id,
        value: skipped ? null : (value as never),
        skipped,
        time_ms: typeof input.timeMs === "number" ? Math.max(0, Math.round(input.timeMs)) : null,
        client_updated_at: new Date().toISOString(),
        server_updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,question_id" },
    )
    .select("id")
    .single();
  if (aErr || !saved) fail("save answer", aErr, GENERIC);

  // Append-only trail so an answer change never destroys prior evidence.
  const { error: hErr } = await db.from("ae_answer_history").insert({
    answer_id: saved.id,
    user_id: userId,
    value: skipped ? null : (value as never),
    source: "web",
  });
  if (hErr) console.error("[layer1] answer history", hErr);

  const { error: uErr } = await db
    .from("ae_sessions")
    .update({
      current_question_id: question.id,
      current_layer_id: content.layer.id,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId);
  if (uErr) console.error("[layer1] session touch", uErr);

  return { ok: true };
}

// ---------------------------------------------------------------- completion

export async function completeLayer1(
  db: DB,
  userId: string,
  sessionId: string,
): Promise<Layer1Profile> {
  const content = await loadLayer1Content(db);
  const answers = await loadAnswers(db, sessionId, content);

  if (!isLayerComplete(content.questions, answers)) {
    throw new AssessmentError("A few questions still need an answer before we can wrap up.");
  }

  const visible = visibleQuestions(content.questions, answers);
  const visibleIds = new Set(visible.map((q) => q.id));
  const evidence = deriveAllEvidence(
    visible,
    answers.filter((a) => visibleIds.has(a.questionId)),
  );
  const inference = inferLayer1(evidence);
  const insights = buildInsights(inference.constructs, inference.calibration);
  const completedAt = new Date().toISOString();

  if (evidence.length > 0) {
    const persistedEvidence = mergeEvidenceSignals(evidence);
    const { error: eErr } = await db.from("ae_evidence").upsert(
      persistedEvidence.map((e) => ({
        user_id: userId,
        session_id: sessionId,
        question_id: e.questionId,
        version_id: content.versionId,
        layer_slug: LAYER1_SLUG,
        construct: e.construct,
        strength: e.strength,
        confidence: e.confidence,
        weight: e.weight,
        kind: e.kind,
        source: e.source,
      })),
      { onConflict: "session_id,question_id,construct,kind" },
    );
    if (eErr) fail("persist evidence", eErr, GENERIC);
  }

  const constructsPayload = {
    ...inference.constructs,
    ...(inference.calibration ? { confidence_calibration: inference.calibration } : {}),
  };

  const { error: pErr } = await db.from("student_intelligence_profile").upsert(
    {
      user_id: userId,
      version_id: content.versionId,
      session_id: sessionId,
      layer_slug: LAYER1_SLUG,
      layer_version: LAYER1_VERSION,
      constructs: constructsPayload as never,
      insights: insights as never,
      overall_confidence: inference.overallConfidence,
      evidence_count: inference.evidenceCount,
      dimensions_measured: inference.dimensionsMeasured,
      completed_at: completedAt,
    },
    { onConflict: "user_id,layer_slug,version_id" },
  );
  if (pErr) fail("persist profile", pErr, GENERIC);

  const { error: sErr } = await db
    .from("ae_sessions")
    .update({ status: "completed", completed_at: completedAt, last_activity_at: completedAt })
    .eq("id", sessionId);
  if (sErr) fail("complete session", sErr, GENERIC);

  await db.from("ae_audit").insert({
    session_id: sessionId,
    user_id: userId,
    event: "layer_completed",
    payload: { layer: LAYER1_SLUG, layer_version: LAYER1_VERSION, evidence_count: evidence.length },
  });

  return {
    layerSlug: LAYER1_SLUG,
    layerVersion: LAYER1_VERSION,
    constructs: inference.constructs,
    calibration: inference.calibration,
    insights,
    overallConfidence: inference.overallConfidence,
    dimensionsMeasured: inference.dimensionsMeasured,
    evidenceCount: inference.evidenceCount,
    completedAt,
  };
}

export async function loadProfile(db: DB, userId: string): Promise<Layer1Profile | null> {
  const { data, error } = await db
    .from("student_intelligence_profile")
    .select(
      "layer_slug, layer_version, constructs, insights, overall_confidence, evidence_count, dimensions_measured, completed_at",
    )
    .eq("user_id", userId)
    .eq("layer_slug", LAYER1_SLUG)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("load profile", error, GENERIC);
  if (!data) return null;

  const raw = (data.constructs ?? {}) as Record<string, unknown>;
  const { confidence_calibration, ...constructs } = raw;
  return {
    layerSlug: data.layer_slug,
    layerVersion: data.layer_version,
    constructs: constructs as Layer1Profile["constructs"],
    calibration: (confidence_calibration as Layer1Profile["calibration"]) ?? null,
    insights: Array.isArray(data.insights) ? (data.insights as string[]) : [],
    overallConfidence: Number(data.overall_confidence ?? 0),
    dimensionsMeasured: data.dimensions_measured,
    evidenceCount: data.evidence_count,
    completedAt: data.completed_at,
  };
}

/**
 * A single response can emit the same construct more than once (for example,
 * when a student selects multiple options). The database intentionally keeps
 * one row per question/construct/kind, so fold those signals before upserting
 * rather than asking Postgres to update the same conflict target twice.
 */
function mergeEvidenceSignals(evidence: EvidenceObject[]): EvidenceObject[] {
  const merged = new Map<string, EvidenceObject>();

  for (const signal of evidence) {
    const key = `${signal.questionId}:${signal.construct}:${signal.kind}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...signal });
      continue;
    }

    const existingWeight = existing.weight;
    const nextWeight = existingWeight + signal.weight;
    existing.strength =
      (existing.strength * existingWeight + signal.strength * signal.weight) / nextWeight;
    existing.confidence = Math.max(existing.confidence, signal.confidence);
    existing.weight = nextWeight;
  }

  return [...merged.values()];
}

// ---------------------------------------------------------------- analytics

const ANALYTICS_EVENTS = new Set([
  "assessment_started",
  "assessment_resumed",
  "question_viewed",
  "question_answered",
  "question_skipped",
  "assessment_paused",
  "assessment_completed",
  "assessment_abandoned",
  "layer_completed",
  "save_failure",
]);

/** Only non-sensitive metadata is recorded — never response content. */
export async function logAnalytics(
  db: DB,
  userId: string,
  event: string,
  properties: Record<string, unknown>,
): Promise<void> {
  if (!ANALYTICS_EVENTS.has(event)) return;
  const safe: Record<string, unknown> = {};
  for (const key of ["question_slug", "question_type", "layer", "index", "total", "reason"]) {
    if (properties[key] !== undefined && typeof properties[key] !== "object") {
      safe[key] = properties[key];
    }
  }
  const { error } = await db
    .from("analytics_events")
    .insert({ user_id: userId, event_name: event, properties: safe as never });
  if (error) console.error("[layer1] analytics", error);
}
