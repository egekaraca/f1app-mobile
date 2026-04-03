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
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getConstructorAssets } from "../../lib/constructorAssets";
import { ConstructorLogo } from "../../components/ConstructorLogoSVG";
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
          paddingTop: 48,
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
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
            alignItems: "flex-start",
            marginTop: 60,
            marginLeft: -20,
          }}
        >
          <ConstructorLogo source={assets.logo} width={207} height={207} />
          <View style={{ gap: 12, paddingRight: 20 }}>
            {drivers.map((d: DriverLite, idx) => (
              <View
                key={d.driverId}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Image
                  source={{ 
                    uri: idx === 0 
                      ? 'https://via.placeholder.com/54x43' 
                      : 'https://via.placeholder.com/54x43'
                  }}
                  style={{ width: 54, height: 43, borderRadius: 8, marginRight: 8 }}
                />
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700" }}>
                      {d.givenName} {d.familyName}
                    </Text>
                    <Text style={{ fontSize: 8 }}>
                      {flagFromNationality(d.nationality)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 8, color: "#666" }}>
                    {getLocationForDriver(d.familyName)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Title */}
        <Text style={{ marginTop: 40, fontSize: 24, fontWeight: "800" }}>
          <Text style={{ fontSize: 24, fontWeight: "600" }}>Constructor</Text>
          <Text style={{ fontSize: 24, fontWeight: "900" }}> Stats</Text>
        </Text>

        {/* Stats grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20, marginTop: 20, justifyContent: "space-between" }}>
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
        width: 160,
        backgroundColor: "#fff",
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 16,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#000",
          position: "absolute",
          left: 25,
          top: 24,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: accent,
        }}
      >
        <Text style={{ fontWeight: "900", color: accent, fontSize: 20 }}>
          {value.split(' ')[0]}
        </Text>
      </View>
      <View style={{ padding: 24, paddingTop: 60 }}>
        <Text 
          style={{ color: accent, fontWeight: "700", fontSize: 16 }}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function getLocationForDriver(familyName: string): string {
  const locations: Record<string, string> = {
    Norris: "London, UK",
    Piastri: "Sydney, AU",
  };
  return locations[familyName] || "";
}
