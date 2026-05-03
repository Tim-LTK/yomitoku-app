import { guardApiBase } from "@/lib/api/client";
import {
  SRS_GAPS_PATH,
  srsGapPath,
} from "@/lib/api/constants";
import { AnalyseClientError } from "@/lib/api/errors";
import { knowledgeGapSchema, knowledgeGapsArraySchema, type KnowledgeGap } from "@/lib/types/gaps";
function normalizeBase(raw: string): string {
  return raw.replace(/\/+$/, "");
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
      "The server returned malformed JSON from /srs. Try again once the API is healthy.",
      "parse_json",
      { cause, statusCode: res.status },
    );
  }
}

function messageFromFailure(status: number, payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const d = (payload as { detail?: unknown }).detail;
    if (typeof d === "string" && d.trim()) {
      return d.trim();
    }
  }
  return `SRS request failed with status ${status}.`;
}

async function srsFetch(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  pathSuffix: string,
  body?: unknown,
): Promise<unknown | null> {
  const base = guardApiBase();
  const url = `${normalizeBase(base)}${pathSuffix}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers:
        method === "DELETE"
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body:
        body !== undefined && method !== "DELETE" && method !== "GET"
          ? JSON.stringify(body)
          : undefined,
    });
  } catch (cause) {
    throw new AnalyseClientError(
      "Network error calling /srs. Confirm EXPO_PUBLIC_API_URL is reachable.",
      "network",
      { cause },
    );
  }

  const json = await readJsonFromResponse(res);
  if (!res.ok) {
    throw new AnalyseClientError(messageFromFailure(res.status, json), "http", {
      statusCode: res.status,
    });
  }

  return json;
}

/** Upsert learner gap JSON into Supabase via FastAPI `/srs/gaps`. */

export async function cloudSaveGap(gap: KnowledgeGap): Promise<void> {
  await srsFetch("POST", SRS_GAPS_PATH, gap);
}

/** Load canonical knowledge gaps newest-first ordering handled server-side fallback sort. */

export async function cloudLoadGaps(): Promise<KnowledgeGap[]> {
  const json = await srsFetch("GET", SRS_GAPS_PATH);
  const parsed = knowledgeGapsArraySchema.safeParse(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "/srs/gaps response did not match local KnowledgeGap shape.",
      "response_shape",
      { zodError: parsed.error },
    );
  }
  return parsed.data;
}

/** Remove one gap row remotely. */

export async function cloudDeleteGap(id: string): Promise<void> {
  await srsFetch("DELETE", srsGapPath(id));
}

/** Merge partial fields into persisted JSON snapshot. */

export async function cloudUpdateGap(
  id: string,
  updates: Partial<KnowledgeGap>,
): Promise<KnowledgeGap> {
  const { id: _drop, ...rest } = updates;
  void _drop;
  const json = await srsFetch("PATCH", srsGapPath(id), rest);
  const parsed = knowledgeGapSchema.safeParse(json);
  if (!parsed.success) {
    throw new AnalyseClientError(
      "PATCH /srs/gaps response did not match KnowledgeGap.",
      "response_shape",
      { zodError: parsed.error },
    );
  }
  return parsed.data;
}

