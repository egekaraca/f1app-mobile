import { useRouter } from "expo-router";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { getConstructorAssets } from "../../lib/constructorAssets";
import {
  getConstructorStandingForSeason,
  getConstructorDrivers,
  getConstructorSeasonsCount,
  getConstructorTotalWins,
  getConstructorInfo,
  type DriverLite,
} from "../../lib/api";

const SEASON = "2025";
const { height: SCREEN_H } = Dimensions.get("window");
const CONTENT_BOTTOM_PADDING = Math.max(260, Math.floor(SCREEN_H * 0.48));

function flagFromNationality(n?: string) {
  const map: Record<string, string> = {
    Australian: "🇦🇺",
    British: "🇬🇧",
    Spanish: "🇪🇸",
    Mexican: "🇲🇽",
    Monegasque: "🇲🇨",
    Dutch: "🇳🇱",
    Japanese: "🇯🇵",
    Finnish: "🇫🇮",
    German: "🇩🇪",
    French: "🇫🇷",
    Danish: "🇩🇰",
    Thai: "🇹🇭",
    Chinese: "🇨🇳",
    American: "🇺🇸",
    Canadian: "🇨🇦",
    Italian: "🇮🇹",
    Brazilian: "🇧🇷",
  };
  return map[n ?? ""] ?? "🏁";
}

/** Arka plan katmanı: gradient + araba */
function ConstructorBackground({
  color,
  car,
}: {
  color: string;
  car: ImageSourcePropType;
}) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { justifyContent: "flex-end" }]}
    >
      {/* Gradient: ortalara kadar uzasın */}
      <LinearGradient
        // daha yumuşak geçiş için 4 durak
        colors={["#00000000", color + "22", color + "66", color]}
        locations={[0.35, 0.55, 0.78, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Araba: altta, genişçe bir yükseklik kaplasın */}
      <Image
        source={car}
        style={{
          width: "100%",
          height: Math.floor(SCREEN_H * 0.25), // ~ekranın %45'i
          resizeMode: "cover",
        }}
      />
    </View>
  );
}

export default function ConstructorDetailScreen() {
  const router = useRouter();
  const id = "mclaren"; // bu dosya Mclaren'e sabit (dinamik istiyorsan router paramı kullan)

  const assets = getConstructorAssets(id);

  const qStanding = useQuery({
    queryKey: ["c-standing", SEASON, id],
    queryFn: () => getConstructorStandingForSeason(SEASON, id),
    staleTime: 1000 * 60 * 5,
  });
  const qDrivers = useQuery({
    queryKey: ["c-drivers", SEASON, id],
    queryFn: () => getConstructorDrivers(SEASON, id),
    staleTime: 1000 * 60 * 5,
  });
  const qSeasons = useQuery({
    queryKey: ["c-seasons", id],
    queryFn: () => getConstructorSeasonsCount(id),
    staleTime: 1000 * 60 * 60,
  });
  const qWinsTotal = useQuery({
    queryKey: ["c-wins-total", id],
    queryFn: () => getConstructorTotalWins(id),
    staleTime: 1000 * 60 * 60,
  });
  const qInfo = useQuery({
    queryKey: ["c-info", id],
    queryFn: () => getConstructorInfo(id),
    staleTime: 1000 * 60 * 60,
  });

  const loading =
    qStanding.isLoading ||
    qDrivers.isLoading ||
    qSeasons.isLoading ||
    qWinsTotal.isLoading ||
    qInfo.isLoading;
  const error =
    qStanding.isError ||
    qDrivers.isError ||
    qSeasons.isError ||
    qWinsTotal.isError ||
    qInfo.isError;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading constructor…</Text>
      </View>
    );
  }

  if (error) {
    const msgs = [
      qStanding.error && `standing: ${String(qStanding.error)}`,
      qDrivers.error && `drivers: ${String(qDrivers.error)}`,
      qSeasons.error && `seasons: ${String(qSeasons.error)}`,
      qWinsTotal.error && `wins: ${String(qWinsTotal.error)}`,
      qInfo.error && `info: ${String(qInfo.error)}`,
    ].filter(Boolean) as string[];
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}
      >
        <Text style={{ textAlign: "center", marginBottom: 8 }}>
          Data could not be loaded.
        </Text>
        {msgs.map((m, i) => (
          <Text key={i} style={{ textAlign: "center", opacity: 0.8 }}>
            {m}
          </Text>
        ))}
        <Text
          onPress={() => {
            qStanding.refetch();
            qDrivers.refetch();
            qSeasons.refetch();
            qWinsTotal.refetch();
            qInfo.refetch();
          }}
          style={{ marginTop: 12, color: "#2563eb", fontWeight: "600" }}
        >
          Retry
        </Text>
      </View>
    );
  }

  const standing = qStanding.data!;
  const drivers = (qDrivers.data ?? []) as DriverLite[];
  const years = qSeasons.data ?? 0;
  const totalWins = qWinsTotal.data ?? 0;
  const info = qInfo.data;
  const name: string = info?.name ?? id;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* ARKA PLAN: içerikten önce render, absolute fill */}
      <ConstructorBackground color={assets.color} car={assets.car} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <Text onPress={() => router.back()} style={{ fontSize: 22, marginRight: 12 }}>
          ←
        </Text>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>{name}</Text>
      </View>

      {/* İçerik — altta arka planla çakışmaması için extra paddingBottom */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: CONTENT_BOTTOM_PADDING,
        }}
      >
        {/* Logo + Drivers */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Image
            source={assets.logo}
            style={{ width: 90, height: 60, resizeMode: "contain" }}
          />
          <View style={{ gap: 10 }}>
            {drivers.map((d: DriverLite) => (
              <View
                key={d.driverId}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={{ fontSize: 38, fontWeight: "900", color: assets.color }}>
                  {d.permanentNumber ?? d.code ?? ""}
                </Text>
                <View>
                  <Text style={{ fontWeight: "800" }}>
                    {d.givenName} {d.familyName}
                  </Text>
                  <Text style={{ opacity: 0.7 }}>
                    {flagFromNationality(d.nationality)} {d.nationality ?? ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Title */}
        <Text style={{ marginTop: 16, fontSize: 24, fontWeight: "800" }}>
          Constructor{"\n"}
          <Text style={{ fontWeight: "900" }}>Stats</Text>
        </Text>

        {/* Stats grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 12 }}>
          <StatPill label="Position" value={`#${standing.position}`} accent={assets.color} />
          <StatPill label="Years in F1" value={`${years}`} accent={assets.color} />
          <StatPill label="Points (2025)" value={`${standing.points}`} accent={assets.color} />
          <StatPill label="Wins (Total)" value={`${totalWins}`} accent={assets.color} />
        </View>

        {/* About */}
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 22, fontWeight: "800" }}>
            About the{"\n"}
            <Text style={{ fontWeight: "900" }}>Constructor</Text>
          </Text>
          {info?.nationality ? (
            <Text style={{ marginTop: 6, opacity: 0.8 }}>Nationality: {info.nationality}</Text>
          ) : null}
          {info?.url ? (
            <Text onPress={() => {}} style={{ marginTop: 4, color: "#2563eb", fontWeight: "600" }}>
              Wikipedia
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 999,
        backgroundColor: "#000",
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontWeight: "900" }}>{value}</Text>
      </View>
      <Text style={{ color: accent, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}
