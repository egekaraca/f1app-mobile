import { View, Text, FlatList, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getDriverStandings } from "../../../lib/api";

const SEASON = "2025";

export default function DriverStandingsScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["driver-standings", SEASON],
    queryFn: () => getDriverStandings(SEASON),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <Centered message="Sürücü puan durumu yükleniyor…" />;
  }
  if (isError || !data) {
    return <Centered message="Veri alınamadı. Tekrar dene." onRetry={refetch} />;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
        2025 Driver Standings
      </Text>
      <FlatList
        data={data}
        keyExtractor={(it) => it.Driver.driverId}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              marginBottom: 10,
              backgroundColor: "white",
              gap: 12,
            }}
          >
            <RankBadge n={item.position} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>
                {item.Driver.givenName} {item.Driver.familyName}
              </Text>
              <Text style={{ opacity: 0.8, marginTop: 2 }} numberOfLines={1}>
                {item.Constructors?.[0]?.name ?? "—"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontWeight: "700" }}>{item.points} pts</Text>
              <Text style={{ opacity: 0.7 }}>{item.wins} wins</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>Bu sezon için data yok.</Text>}
      />
    </View>
  );
}

function RankBadge({ n }: { n: number }) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#111827",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "800" }}>{n}</Text>
    </View>
  );
}

function Centered({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text style={{ textAlign: "center", marginBottom: 8 }}>{message}</Text>
      {onRetry && (
        <Text onPress={onRetry} style={{ color: "#2563eb", fontWeight: "600" }}>
          Tekrar dene
        </Text>
      )}
    </View>
  );
}
