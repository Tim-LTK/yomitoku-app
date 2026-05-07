import { Platform, StyleSheet, Text, View } from "react-native";

type Props = { pitchAccent: string };

function pitchArrow(pattern: string): string {
  return pattern.startsWith("L") ? "⬆" : "⬇";
}

export function PitchAccentBadge({ pitchAccent }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>
        {pitchArrow(pitchAccent)} {pitchAccent}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#4338ca",
    letterSpacing: 0.5,
  },
});
