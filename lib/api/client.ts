import Constants from "expo-constants";

import { ANALYSE_PATH, EXTRACT_PATH } from "@/lib/api/constants";
import { AnalyseClientError } from "@/lib/api/errors";
import {
  type AnalyseResponse,
  safeParseAnalyseResponse,
} from "@/lib/types/breakdown";
import { safeParseExtractResponse } from "@/lib/types/extract";

const ENV_KEYS = ["EXPO_PUBLIC_API_URL"] as const;

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
 * POST /analyse — server-side AI only; this wrapper never touches Anthropic keys.
 */
export async function postAnalyse(payload: { text: string }): Promise<AnalyseResponse> {
  const base = readExpoPublicApiUrl();
  if (!base) {
    throw new AnalyseClientError(
      "Missing EXPO_PUBLIC_API_URL. Copy .env.example → .env and set your Railway FastAPI base URL.",
      "configuration",
    );
  }

  const url = buildAnalyseUrl(base);
  const body = { text: payload.text.trim() };

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
  const base = readExpoPublicApiUrl();
  if (!base) {
    throw new AnalyseClientError(
      "Missing EXPO_PUBLIC_API_URL. Copy .env.example → .env and set your Railway FastAPI base URL.",
      "configuration",
    );
  }

  const url = buildExtractUrl(base);
  const body = {
    imageBase64: payload.imageBase64.trim(),
    mimeType: normalizeExtractMimeType(payload.mimeType),
  };

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
