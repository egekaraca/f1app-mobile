import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getConstructorStandings } from "../../../lib/api";
import { getConstructorAssets } from "../../../lib/constructorAssets";
import { useSeason } from "../../../lib/SeasonContext";
import type { ConstructorStanding } from "../../../types/standings";

// ─── Display names ────────────────────────────────────────────────
const DISPLAY_NAMES: Record<string, { top: string; bottom: string }> = {
  mercedes:     { top: '', bottom: 'Mercedes'     },
  ferrari:      { top: '', bottom: 'Ferrari'      },
  mclaren:      { top: '', bottom: 'McLaren'      },
  red_bull:     { top: '', bottom: 'Red Bull'     },
  aston_martin: { top: '', bottom: 'Aston Martin' },
  alpine:       { top: '', bottom: 'Alpine'       },
  haas:         { top: '', bottom: 'Haas'         },
  williams:     { top: '', bottom: 'Williams'     },
  rb:           { top: '', bottom: 'Racing Bulls' },
  racing_bulls: { top: '', bottom: 'Racing Bulls' },
  cadillac:     { top: '', bottom: 'Cadillac'     },
  sauber:       { top: '', bottom: 'Audi'         },
  audi:         { top: '', bottom: 'Audi'         },
};

// ─── Constructor card ─────────────────────────────────────────────
function ConstructorCard({ item }: { item: ConstructorStanding }) {
  const router = useRouter();
  const { color: teamColor, icon } = getConstructorAssets(item.Constructor.constructorId);
  const display = DISPLAY_NAMES[item.Constructor.constructorId]
    ?? { top: '', bottom: item.Constructor.name };

  const pos    = Number(item.position);
  const points = Number(item.points);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/constructors/${item.Constructor.constructorId}`)}
      activeOpacity={0.85}
    >
      {/* Team colour glow — soft left fade */}
      <LinearGradient
        colors={[`${teamColor}55`, `${teamColor}22`, `${teamColor}08`, 'transparent']}
        locations={[0, 0.4, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Three-column body: left = position+points, middle = team name, right = logo+arrow */}
      <View style={styles.cardBody}>
        <View style={styles.leftZone}>
          <Text style={styles.position}>{pos}</Text>
          <View style={styles.pointsRow}>
            <Text style={styles.pointsNumber}>{points}</Text>
            <Text style={styles.pointsLabel}>PTS</Text>
          </View>
        </View>

        <View style={styles.nameZone}>
          {display.top ? <Text style={styles.nameTop}>{display.top}</Text> : null}
          <Text style={styles.nameBottom}>{display.bottom}</Text>
        </View>

        {/* Right zone: logo pill stacked above arrow */}
        <View style={styles.rightZone}>
          <View style={styles.logoPill}>
            {icon
              ? <Image source={icon} style={styles.logoIcon} resizeMode="contain" />
              : <Text style={[styles.logoFallback, { color: teamColor }]}>
                  {item.Constructor.name.charAt(0)}
                </Text>
            }
          </View>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="rgba(255,255,255,0.7)"
            style={styles.arrowIcon}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export default function ConstructorStandingsScreen() {
  const { season } = useSeason();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["constructor-standings", season],
    queryFn: () => getConstructorStandings(season),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#111" /></View>;
  }
  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load.</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#111" />}
    >
      {data.map(item => (
        <ConstructorCard key={item.Constructor.constructorId} item={item} />
      ))}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#ffffff' },
  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120, gap: 10 },

  card: {
    backgroundColor: '#111111',
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: 20,
    paddingTop: 18,
    paddingBottom: 18,
    minHeight: 90,
  },
  leftZone: {
    width: 80,
    justifyContent: 'space-between',
  },
  nameZone: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  position: {
    fontSize: 34,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.12)',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pointsNumber: { fontSize: 26, fontWeight: '900', color: '#ffffff', letterSpacing: -1 },
  pointsLabel:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 },
  nameTop: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 1,
  },
  nameBottom: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },

  // Right zone — logo pill + arrow stacked vertically, no absolute positioning
  rightZone: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingRight: 14,
  },
  logoPill: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon:     { width: 38, height: 38 },
  logoFallback: { fontSize: 20, fontWeight: '900' },

  arrowIcon: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#ffffff' },
  errorText: { fontSize: 14, color: '#888' },
  retryText: { fontSize: 14, fontWeight: '700', color: '#111' },
});
