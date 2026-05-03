/**
 * Grammar-role colours for breakdown chips — hex only (RN StyleSheet paint).
 * Kept aligned with lib/ui/roleColours.ts semantics; breakdown tree avoids Tailwind/nativewind here.
 */

export type ChipRolePaint = Readonly<{ backgroundColor: string; color: string }>;

const FALLBACK: ChipRolePaint = { backgroundColor: "#e2e8f0", color: "#0f172a" };

const HEX_BY_ROLE: Record<string, ChipRolePaint> = {
  topic_marker: { backgroundColor: "#bae6fd", color: "#082f49" },
  subject_marker: { backgroundColor: "#bae6fd", color: "#082f49" },
  object_marker: { backgroundColor: "#bae6fd", color: "#082f49" },
  contrast_marker: { backgroundColor: "#bae6fd", color: "#082f49" },

  verb_base: { backgroundColor: "#c7d2fe", color: "#1e1b4b" },
  verb_te_form: { backgroundColor: "#c7d2fe", color: "#1e1b4b" },
  verb_ending: { backgroundColor: "#c7d2fe", color: "#1e1b4b" },

  grammar_pattern: { backgroundColor: "#fde68a", color: "#451a03" },

  noun: { backgroundColor: "#d4d4d4", color: "#171717" },

  time: { backgroundColor: "#99f6e4", color: "#042f2e" },
  location: { backgroundColor: "#99f6e4", color: "#042f2e" },
  direction: { backgroundColor: "#99f6e4", color: "#042f2e" },
  indirect_object: { backgroundColor: "#99f6e4", color: "#042f2e" },
  means_method: { backgroundColor: "#99f6e4", color: "#042f2e" },

  adjective_i: { backgroundColor: "#a7f3d0", color: "#022c22" },
  adjective_na: { backgroundColor: "#a7f3d0", color: "#022c22" },
  adverb: { backgroundColor: "#a7f3d0", color: "#022c22" },

  conjunction: { backgroundColor: "#e2e8f0", color: "#0f172a" },
  sentence_final: { backgroundColor: "#e2e8f0", color: "#0f172a" },
  other: { backgroundColor: "#e2e8f0", color: "#0f172a" },
};

/** Role chip background + foreground for use with `style`/`textStyle`. */
export function getChipRolePaint(role: string): ChipRolePaint {
  return HEX_BY_ROLE[role] ?? FALLBACK;
}

export function formatGrammarRoleChipLabel(role: string): string {
  return role.split("_").join(" ");
}
