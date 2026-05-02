/** FastAPI `POST /analyse` path — single source for the client. */

export const ANALYSE_PATH = "/analyse" as const;

/** FastAPI `POST /extract` — vision OCR / handwriting to plain Japanese (separate from `/analyse`). */

export const EXTRACT_PATH = "/extract" as const;

/** Phase 2: mint drills from a single `SentenceBreakdown`. */

export const PRACTICE_GENERATE_PATH = "/practice/generate" as const;

/** Phase 2: score one learner submission. */

export const PRACTICE_EVALUATE_PATH = "/practice/evaluate" as const;
