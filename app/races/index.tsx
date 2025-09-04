import { View, Text, FlatList, RefreshControl } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSeasonRaces } from "../../lib/api";
import RaceListItem from "../../components/RaceListItem";

export default function RacesScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["races", "2025"],
    queryFn: () => getSeasonRaces("2025"),
    staleTime: 1000 * 60 * 5, // 5 dk
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Yarışlar yükleniyor…</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ marginBottom: 8, textAlign: "center" }}>
          Takvim alınamadı. İnternet bağlantını veya API’yi kontrol et.
        </Text>
        <Text onPress={() => refetch()} style={{ color: "#2563eb", fontWeight: "600" }}>
          Tekrar dene
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
        2025 F1 Yarış Takvimi
      </Text>

      <FlatList
        data={data}
        keyExtractor={(item) => `${item.season}-${item.round}-${item.raceName}`}
        renderItem={({ item }) => (
          <RaceListItem race={item} onPress={() => { /* ileride detay sayfasına gideceğiz */ }} />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        ListEmptyComponent={
          <Text>Bu sezonda yarış bulunamadı.</Text>
        }
      />
    </View>
  );
}
