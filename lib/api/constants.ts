/** FastAPI `POST /analyse` path — single source for the client. */

export const ANALYSE_PATH = "/analyse" as const;

/** FastAPI `POST /extract` — vision OCR / handwriting to plain Japanese (separate from `/analyse`). */

export const EXTRACT_PATH = "/extract" as const;

/** Phase 2: mint drills from a single `SentenceBreakdown`. */

export const PRACTICE_GENERATE_PATH = "/practice/generate" as const;

/** Phase 2: score one learner submission. */

export const PRACTICE_EVALUATE_PATH = "/practice/evaluate" as const;

/** Phase 1.5 — targeted tutor explanation for one `BreakdownElement`. */

export const EXPLAIN_PATH = "/explain" as const;

/** Phase 3 — FastAPI SRS gap routes (clients call REST, not Postgres). */

export const SRS_GAPS_PATH = "/srs/gaps" as const;

export const srsGapPath = (id: string) => `${SRS_GAPS_PATH}/${encodeURIComponent(id)}` as const;

/** SRS spacing hint from Claude (Phase 3). */

export const SRS_COMPUTE_PATH = "/srs/compute" as const;
