import { View, Text, Pressable } from "react-native";
import type { Race } from "../types/race";
import { formatRaceDateTimeLocal } from "../lib/api";

type Props = {
  race: Race;
  onPress?: () => void;
};

export default function RaceListItem({ race, onPress }: Props) {
  const { dateStr, timeStr } = formatRaceDateTimeLocal(race.date, race.time);

  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: "white"
      }}
    >
      <Text style={{ fontWeight: "600", fontSize: 16 }}>{race.raceName}</Text>
      <Text style={{ opacity: 0.8, marginTop: 2 }}>
        {race.Circuit.circuitName} — {race.Circuit.Location.locality}, {race.Circuit.Location.country}
      </Text>
      <Text style={{ marginTop: 4 }}>
        {dateStr} {timeStr ? `• ${timeStr}` : ""}
      </Text>
    </Pressable>
  );
}
