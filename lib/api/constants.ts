/** FastAPI `POST /analyse` path — single source for the client. */

export const ANALYSE_PATH = "/analyse" as const;

/** Phase 1.6 — onboarding placement → `StudentProfile`. */

export const ONBOARD_ASSESS_PATH = "/onboard/assess" as const;

/** FastAPI `POST /extract` — vision OCR / handwriting to plain Japanese (separate from `/analyse`). */

export const EXTRACT_PATH = "/extract" as const;

/** Phase 2.1 — mint session drills from `KnowledgeGap[]` (server composes session). */

export const PRACTICE_GENERATE_PATH = "/practice/generate" as const;

/** Phase 2.1 — session batch submit → graded results + SRS intervals. */

export const PRACTICE_SUBMIT_PATH = "/practice/submit" as const;

/** Phase 1.5 — targeted tutor explanation for one `BreakdownElement`. */

export const EXPLAIN_PATH = "/explain" as const;

/** Phase 1.7 — targeted grammar / vocabulary / expression scan. */

export const SCAN_PATH = "/scan" as const;

/** Phase 1.7 — passage-grounded follow-up Q&A. */

export const ASK_PATH = "/ask" as const;

/** Phase 3 — FastAPI SRS gap routes (clients call REST, not Postgres). */

export const SRS_GAPS_PATH = "/srs/gaps" as const;

export const srsGapPath = (id: string) => `${SRS_GAPS_PATH}/${encodeURIComponent(id)}` as const;

/** SRS spacing hint from Claude (Phase 3). */

export const SRS_COMPUTE_PATH = "/srs/compute" as const;
