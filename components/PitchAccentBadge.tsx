import { StyleSheet, Text, View } from "react-native";

type Props = {
  pitchAccent: string;
  reading: string;
};

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
    <View style={styles.outer}>
      {morae.map((mora, i) => {
        const isHigh = pitchAccent[i] === "H";
        const hasDropAfter =
          pitchAccent[i] === "H" && i < pitchAccent.length - 1 && pitchAccent[i + 1] === "L";

        let cellStyle = styles.moraLow;
        if (isHigh && hasDropAfter) {
          cellStyle = styles.moraHighDrop;
        } else if (isHigh) {
          cellStyle = styles.moraHigh;
        }

        return (
          <View key={`${i}-${mora}`} style={cellStyle}>
            <Text style={styles.moraText}>{mora}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginTop: 4,
    alignSelf: "flex-start",
  },
  moraHigh: {
    borderTopWidth: 2,
    borderTopColor: "#4338ca",
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  moraHighDrop: {
    borderTopWidth: 2,
    borderTopColor: "#4338ca",
    borderRightWidth: 2,
    borderRightColor: "#4338ca",
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  moraLow: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  moraText: {
    fontSize: 13,
    color: "#1e1b4b",
  },
});
