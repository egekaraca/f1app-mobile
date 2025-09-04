import { View, Text } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>F1 Mobile App</Text>
      <Link href="/standings/drivers" style={{ color: "#2563eb", fontWeight: "600" }}>
        Driver Standings
      </Link>
      <Link href="/standings/constructors" style={{ color: "#2563eb", fontWeight: "600" }}>
        Constructor Standings
      </Link>
    </View>
  );
}
