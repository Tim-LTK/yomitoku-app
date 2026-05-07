import { StyleSheet, Text, View } from "react-native";

type Props = { pitchAccent: string; reading: string };

function segmentMorae(reading: string): string[] {
  // Small combining kana attach to the preceding mora (e.g. きゃ = 1 mora)
  const SMALL_COMBINING = new Set([
    "ゃ",
    "ゅ",
    "ょ",
    "ゎ",
    "ぁ",
    "ぃ",
    "ぅ",
    "ぇ",
    "ぉ",
    "ャ",
    "ュ",
    "ョ",
    "ヮ",
    "ァ",
    "ィ",
    "ゥ",
    "ェ",
    "ォ",
  ]);
  const morae: string[] = [];
  for (const char of reading) {
    if (SMALL_COMBINING.has(char) && morae.length > 0) {
      morae[morae.length - 1] += char;
    } else {
      morae.push(char);
    }
  }
  return morae;
}

/** True when PitchAccentBadge will render morae + overlines (same length gate as the badge). */
export function canShowPitchAccentVisual(pitchAccent: string | null | undefined, reading: string): boolean {
  if (!pitchAccent) {
    return false;
  }
  return segmentMorae(reading).length === pitchAccent.length;
}

export function PitchAccentBadge({ pitchAccent, reading }: Props) {
  const morae = segmentMorae(reading);
  if (morae.length !== pitchAccent.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.accentLabel}>アクセント</Text>
      <View style={styles.moraRow}>
        {morae.map((mora, i) => {
          const isHigh = pitchAccent[i] === "H";
          return (
            <View key={`${i}-${mora}`} style={isHigh ? styles.moraHigh : styles.moraLow}>
              <Text style={styles.moraText}>{mora}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  accentLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#6366f1",
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  moraRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  moraHigh: {
    borderTopWidth: 2,
    borderTopColor: "#4338ca",
    paddingTop: 4,
    paddingHorizontal: 1,
  },
  moraLow: {
    borderTopWidth: 0,
    borderTopColor: "#4338ca",
    paddingTop: 6,
    paddingHorizontal: 1,
  },
  moraText: {
    fontSize: 13,
    color: "#1e1b4b",
  },
});
