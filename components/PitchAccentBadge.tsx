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

export function PitchAccentBadge({ pitchAccent, reading }: Props) {
  const morae = segmentMorae(reading);
  if (morae.length !== pitchAccent.length) {
    return null;
  }

  return (
    <View style={styles.row}>
      {morae.map((mora, i) => {
        const isHigh = pitchAccent[i] === "H";
        return (
          <View key={`${i}-${mora}`} style={isHigh ? styles.moraHigh : styles.moraLow}>
            <Text style={styles.moraText}>{mora}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    alignSelf: "flex-start",
  },
  moraHigh: {
    borderTopWidth: 2,
    borderTopColor: "#4338ca",
  },
  moraLow: {
    paddingTop: 2,
  },
  moraText: {
    fontSize: 13,
    color: "#1e1b4b",
  },
});
