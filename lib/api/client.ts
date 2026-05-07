import Constants from "expo-constants";

import {
  ANALYSE_PATH,
  ASK_PATH,
  EXPLAIN_PATH,
  EXTRACT_PATH,
  ONBOARD_ASSESS_PATH,
  PRACTICE_GENERATE_PATH,
  PRACTICE_SUBMIT_PATH,
  SCAN_PATH,
  SRS_COMPUTE_PATH,
} from "@/lib/api/constants";
import { AnalyseClientError } from "@/lib/api/errors";
import { buildStudentContext } from "@/lib/profile/buildStudentContext";
import { loadProfile } from "@/lib/storage/profile";
import {
  type AnalyseResponse,
  type BreakdownElement,
  safeParseAnalyseResponse,
} from "@/lib/types/breakdown";
import { safeParseExtractResponse } from "@/lib/types/extract";
import {
  safeParseExplainResponse,
  type ElementExplanation,
  type KnowledgeGap,
} from "@/lib/types/gaps";
import {
  safeParsePracticeGenerateItems,
  safeParseSessionResult,
  type PracticeItem,
  type PracticeResult,
  type SessionResult,
  type SessionSubmission,
} from "@/lib/types/practice";
import { safeParseSrsComputeResponse } from "@/lib/types/srs";
import { safeParseStudentProfile, type StudentProfile } from "@/lib/types/profile";
import {
  safeParseAskResponse,
  safeParseScanResult,
  type AskResponse,
  type ScanResult,
} from "@/lib/types/scan";

const ENV_KEYS = ["EXPO_PUBLIC_API_URL"] as const;

async function withOptionalStudentContext<T extends Record<string, unknown>>(body: T): Promise<T> {
  try {
    const profile = await loadProfile();
    if (!profile) {
      return body;
    }
    return { ...body, studentContext: buildStudentContext(profile) };
  } catch {
    return body;
  }
}

function readExpoPublicApiUrl(): string {
  const fromProcess = process.env.EXPO_PUBLIC_API_URL;
  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  for (const key of ENV_KEYS) {
    const raw = extra?.[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
  }

  return "";
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function buildAnalyseUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}${ANALYSE_PATH}`;
}

function buildExtractUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}${EXTRACT_PATH}`;
}

function buildPracticeGenerateUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}${PRACTICE_GENERATE_PATH}`;
}

function buildPracticeSubmitUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}${PRACTICE_SUBMIT_PATH}`;
}

function buildExplainUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}${EXPLAIN_PATH}`;
}

function buildSrsComputeUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}${SRS_COMPUTE_PATH}`;
}

function buildOnboardAssessUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}${ONBOARD_ASSESS_PATH}`;
}

function buildScanUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}${SCAN_PATH}`;
}

function buildAskUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}${ASK_PATH}`;
}

export function guardApiBase(): string {
  const base = readExpoPublicApiUrl();
  if (!base) {
    throw new AnalyseClientError(
      "Missing EXPO_PUBLIC_API_URL. Copy .env.example → .env and set your Railway FastAPI base URL.",
      "configuration",
    );
  }
  return base;
}

async function readJsonFromResponse(res: Response): Promise<unknown> {
  const raw = await res.text();
  if (!raw.trim()) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new AnalyseClientError(
      "The server returned malformed JSON. Try again once the API is healthy.",
      "parse_json",
      { cause, statusCode: res.status },
    );
  }
}

async function postJson(
  url: string,
  body: unknown,
): Promise<{ res: Response; json: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new AnalyseClientError(
      "Network request failed. Confirm the device can reach your API URL and that the server is running.",
      "network",
      { cause },
    );
  }
  const json = await readJsonFromResponse(res);
  return { res, json };
}

function stringifyHttpDetail(detail: unknown): string | null {
  if (detail === null || detail === undefined) {
    return null;
  }
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail.trim();
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((entry) => {
        if (typeof entry === "object" && entry !== null) {
          const rec = entry as Record<string, unknown>;
          if (typeof rec.message === "string") {
            return rec.message;
          }
          if (typeof rec.msg === "string") {
            return rec.msg;
          }
        }
        try {
          return JSON.stringify(entry);
        } catch {
          return String(entry);
        }
      })
      .filter((s) => s.length > 0);
    if (parts.length > 0) {
      return parts.join("\n");
    }
  }
  if (typeof detail === "object") {
    const rec = detail as Record<string, unknown>;
    if (typeof rec.detail === "string") {
      const body = rec.detail.trim();
      if (typeof rec.title === "string" && rec.title.trim().length > 0) {
        return `${rec.title.trim()}: ${body}`;
      }
      return body;
    }
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return null;
  }
}

function messageFromHttpPayload(status: number, payload: unknown): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload.trim();
  }
  if (typeof payload === "object" && payload !== null) {
    const rec = payload as Record<string, unknown>;
    const detailText = stringifyHttpDetail(rec.detail);
    if (detailText) {
      return detailText;
    }
    const fallback = stringifyHttpDetail(rec);
    if (fallback) {
      return fallback;
    }
  }
  return `Request failed with status ${status}. Check EXPO_PUBLIC_API_URL and try again.`;
}

/**
 * GET JSON from the API root — paths must start with `/` (e.g. `/jmdict/lookup?term=…`).
 */
export async function apiClient<T>(path: string): Promise<T> {
  const base = guardApiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${normalizeBaseUrl(base)}${normalizedPath}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (cause) {
    throw new AnalyseClientError(
      "Network request failed. Confirm the device can reach your API URL and that the server is running.",
      "network",
      { cause },
    );
  }
  const json = await readJsonFromResponse(res);
  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }
  return json as T;
}

/**
 * POST /analyse — server-side AI only; this wrapper never touches Anthropic keys.
 */
export async function postAnalyse(payload: { text: string }): Promise<AnalyseResponse> {
  const base = guardApiBase();
  const url = buildAnalyseUrl(base);
  const body = await withOptionalStudentContext({ text: payload.text.trim() });
  const { res, json } = await postJson(url, body);

  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }

  const parsed = safeParseAnalyseResponse(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "API response did not match the expected breakdown shape. The server may need a fix.",
      "response_shape",
      { zodError: parsed.error, statusCode: res.status },
    );
  }

  return parsed.data;
}

/**
 * POST /scan — targeted highlights (Phase 1.7), not full morphological breakdown.
 */
export async function postScan(payload: { text: string }): Promise<ScanResult> {
  const base = guardApiBase();
  const url = buildScanUrl(base);
  const body = await withOptionalStudentContext({ text: payload.text.trim() });
  const { res, json } = await postJson(url, body);

  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }

  const parsed = safeParseScanResult(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "API response did not match the expected scan shape. The server may need a fix.",
      "response_shape",
      { zodError: parsed.error, statusCode: res.status },
    );
  }

  return parsed.data;
}

/**
 * POST /ask — answer a question using the given passage as grounding (Phase 1.7).
 */
export async function postAsk(payload: {
  question: string;
  passage: string;
}): Promise<AskResponse> {
  const base = guardApiBase();
  const url = buildAskUrl(base);
  const body = await withOptionalStudentContext({
    question: payload.question.trim(),
    passage: payload.passage.trim(),
  });
  const { res, json } = await postJson(url, body);

  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }

  const parsed = safeParseAskResponse(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "API response did not match the expected ask shape. The server may need a fix.",
      "response_shape",
      { zodError: parsed.error, statusCode: res.status },
    );
  }

  return parsed.data;
}

const EXTRACT_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function normalizeExtractMimeType(raw: string | null | undefined): string {
  const t = raw?.trim().toLowerCase();
  if (t === "image/jpg") {
    return "image/jpeg";
  }
  if (t && EXTRACT_MIME_TYPES.has(t)) {
    return t;
  }
  return "image/jpeg";
}

/**
 * POST /extract — vision extraction only; never combined with breakdown on the server.
 */
export async function postExtract(payload: {
  imageBase64: string;
  mimeType: string;
}): Promise<string> {
  const base = guardApiBase();
  const url = buildExtractUrl(base);
  const body = await withOptionalStudentContext({
    imageBase64: payload.imageBase64.trim(),
    mimeType: normalizeExtractMimeType(payload.mimeType),
  });
  const { res, json } = await postJson(url, body);

  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }

  const parsed = safeParseExtractResponse(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "API response did not match the expected extract shape. The server may need a fix.",
      "response_shape",
      { zodError: parsed.error, statusCode: res.status },
    );
  }

  return parsed.data.text;
}

/**
 * POST /practice/generate — server composes a session (`KnowledgeGap[]` → PracticeItem[]).
 */
export async function postPracticeGenerate(payload: { gaps: KnowledgeGap[] }): Promise<PracticeItem[]> {
  const base = guardApiBase();
  const url = buildPracticeGenerateUrl(base);
  const body = await withOptionalStudentContext({
    gaps: payload.gaps,
  });
  const { res, json } = await postJson(url, body);

  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }

  const parsed = safeParsePracticeGenerateItems(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "API response did not match the expected practice item list.",
      "response_shape",
      { zodError: parsed.error, statusCode: res.status },
    );
  }

  return parsed.data;
}

/**
 * POST /practice/submit — batch grading + SRS intervals (Phase 2.1).
 */
export async function postPracticeSubmit(submission: SessionSubmission): Promise<SessionResult> {
  const base = guardApiBase();
  const url = buildPracticeSubmitUrl(base);
  const body = await withOptionalStudentContext({
    gaps: submission.gaps,
    practiceItems: submission.practiceItems,
    items: submission.items,
    studentContext: submission.studentContext.trim(),
  });
  const { res, json } = await postJson(url, body);

  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }

  const parsed = safeParseSessionResult(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "API response did not match the expected session result shape.",
      "response_shape",
      { zodError: parsed.error, statusCode: res.status },
    );
  }

  return parsed.data;
}

/**
 * POST /explain — targeted element tutoring (Phase 1.5), separate from sentence breakdown generation.
 */
export async function postExplain(payload: {
  breakdownElement: BreakdownElement;
  sourceSentence: string;
}): Promise<ElementExplanation> {
  const base = guardApiBase();
  const url = buildExplainUrl(base);
  const body = await withOptionalStudentContext({
    breakdownElement: payload.breakdownElement,
    sourceSentence: payload.sourceSentence.trim(),
  });
  const { res, json } = await postJson(url, body);

  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }

  const parsed = safeParseExplainResponse(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "API response did not match the expected explain shape. The server may need a fix.",
      "response_shape",
      { zodError: parsed.error, statusCode: res.status },
    );
  }

  return parsed.data.explanation;
}

/**
 * POST /srs/compute — spacing hint from chronological practice results for one gap snapshot.
 */
export async function postSrsCompute(payload: {
  gap: KnowledgeGap;
  practiceResults: PracticeResult[];
}): Promise<{ suggestedIntervalDays: number; nextReviewAt: string; reasoning: string }> {
  const base = guardApiBase();
  const url = buildSrsComputeUrl(base);
  const body = await withOptionalStudentContext({
    gap: payload.gap,
    results: payload.practiceResults,
  });
  const { res, json } = await postJson(url, body);

  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }

  const parsed = safeParseSrsComputeResponse(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "SRS compute response did not match expected shape.",
      "response_shape",
      { zodError: parsed.error, statusCode: res.status },
    );
  }

  return parsed.data;
}

/**
 * POST /onboard/assess — first-run placement before a profile exists (no studentContext attached).
 */
export async function postOnboardAssess(payload: {
  nativeLanguages: string[];
  selfReportedLevel: string;
  answers: { q1: string; q2: string; q3: string; q4: string; q5: string };
}): Promise<StudentProfile> {
  const base = guardApiBase();
  const url = buildOnboardAssessUrl(base);
  const body = {
    nativeLanguages: payload.nativeLanguages,
    selfReportedLevel: payload.selfReportedLevel.trim(),
    answers: payload.answers,
  };
  const { res, json } = await postJson(url, body);

  if (!res.ok) {
    const message = messageFromHttpPayload(res.status, json);
    throw new AnalyseClientError(message, "http", { statusCode: res.status });
  }

  const parsed = safeParseStudentProfile(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "Onboard assess response did not match StudentProfile shape.",
      "response_shape",
      { zodError: parsed.error, statusCode: res.status },
    );
  }

  return parsed.data;
}