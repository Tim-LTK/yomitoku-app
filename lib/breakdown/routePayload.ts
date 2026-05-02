import type { AnalyseResponse } from "@/lib/types/breakdown";

/** In-memory handoff for analyse results — URL only carries `id`, not the full JSON payload. */

const responsesById = new Map<string, AnalyseResponse>();

export function storeAnalyseResult(routeId: string, response: AnalyseResponse): void {
  responsesById.set(routeId, response);
}

export function getAnalyseResult(routeId: string): AnalyseResponse | undefined {
  return responsesById.get(routeId);
}
