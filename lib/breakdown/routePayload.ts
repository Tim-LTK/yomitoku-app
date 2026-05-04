import type { AnalyseResponse } from "@/lib/types/breakdown";
import type { ScanResult } from "@/lib/types/scan";

/** In-memory handoff for analyse results — URL only carries `id`, not the full JSON payload. */

const responsesById = new Map<string, AnalyseResponse>();

export function storeAnalyseResult(routeId: string, response: AnalyseResponse): void {
  responsesById.set(routeId, response);
}

export function getAnalyseResult(routeId: string): AnalyseResponse | undefined {
  return responsesById.get(routeId);
}

/** Phase 1.7 targeted scan — same id handoff pattern as breakdown. */

const scanResultsById = new Map<string, ScanResult>();

export function storeScanResult(routeId: string, result: ScanResult): void {
  scanResultsById.set(routeId, result);
}

export function getScanResult(routeId: string): ScanResult | undefined {
  return scanResultsById.get(routeId);
}
