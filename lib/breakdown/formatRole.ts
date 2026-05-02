import type { GrammarRole } from "@/lib/types/breakdown";

export function formatGrammarRoleLabel(role: GrammarRole): string {
  return role.split("_").join(" ");
}
