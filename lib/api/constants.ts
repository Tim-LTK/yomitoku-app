/** FastAPI `POST /analyse` path — single source for the client. */

export const ANALYSE_PATH = "/analyse" as const;

/** FastAPI `POST /extract` — vision OCR / handwriting to plain Japanese (separate from `/analyse`). */

export const EXTRACT_PATH = "/extract" as const;
