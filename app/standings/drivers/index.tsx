import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDriverStandings } from "../../../lib/api";
import { getConstructorAssets } from "../../../lib/constructorAssets";
import { getDriverPhoto } from "../../../lib/driverAssets";
import { useSeason } from "../../../lib/SeasonContext";
import type { DriverStanding } from "../../../types/standings";

// ─── Driver card ──────────────────────────────────────────────────
function DriverCard({ item }: { item: DriverStanding }) {
  const router = useRouter();
  const constructorId = item.Constructors?.[0]?.constructorId;
  const { color: teamColor } = getConstructorAssets(constructorId);
  const photo = getDriverPhoto(item.Driver.driverId);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/drivers/${item.Driver.driverId}`)}
      activeOpacity={0.85}
    >
      {/* Team color accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: teamColor }]} />

      {/* Team color hue — right side, behind photo */}
      <LinearGradient
        colors={['transparent', `${teamColor}18`, `${teamColor}40`]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Driver photo — absolute, bottom right, bleeds to card edge */}
      {photo && (
        <View style={styles.photoBox}>
          <Image source={photo} style={styles.photo} resizeMode="contain" />
          {/* Left-edge fade — soft, keeps name readable */}
          <LinearGradient
            colors={['rgba(17,17,17,0.75)', 'rgba(17,17,17,0.2)', 'transparent']}
            locations={[0, 0.3, 0.6]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          {/* Vertical spotlight: dark top/bottom, bright centre */}
          <LinearGradient
            colors={['rgba(17,17,17,0.55)', 'transparent', 'transparent', 'rgba(17,17,17,0.45)']}
            locations={[0, 0.28, 0.65, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        </View>
      )}

      {/* Position + name */}
      <View style={styles.cardInner}>
        <Text style={styles.position}>{item.position}</Text>
        <View style={styles.nameBlock}>
          <Text style={styles.firstName}>{item.Driver.givenName}</Text>
          <Text style={styles.lastName}>{item.Driver.familyName}</Text>
        </View>
      </View>

      {/* Footer: points only — arrow is absolute */}
      <View style={styles.footer}>
        <View style={styles.pointsRow}>
          <Text style={styles.pointsNumber}>{item.points}</Text>
          <Text style={styles.pointsLabel}>PTS</Text>
        </View>
      </View>

      {/* Arrow — bottom right, shadow, no circle */}
      <Ionicons
        name="arrow-forward"
        size={20}
        color="rgba(255,255,255,0.85)"
        style={styles.arrowIcon}
      />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export default function DriverStandingsScreen() {
  const { season } = useSeason();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["driver-standings", season],
    queryFn: () => getDriverStandings(season),
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
      {data.map(item => <DriverCard key={item.Driver.driverId} item={item} />)}
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
  accentStrip: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
  },

  // Driver photo — large, bottom-right, no box
  photoBox: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 160,
    height: 125,
  },
  photo: {
    width: '100%',
    height: '100%',
  },

  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
    paddingTop: 18,
    paddingBottom: 6,
    gap: 14,
  },
  position: {
    fontSize: 34,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.1)',
    minWidth: 44,
    textAlign: 'center',
  },
  nameBlock: { flex: 1 },
  firstName: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 1,
  },
  lastName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 2,
  },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  pointsNumber: { fontSize: 26, fontWeight: '900', color: '#ffffff', letterSpacing: -1 },
  pointsLabel:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 },

  arrowIcon: {
    position: 'absolute',
    bottom: 14,
    right: 18,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#ffffff' },
  errorText: { fontSize: 14, color: '#888' },
  retryText:  { fontSize: 14, fontWeight: '700', color: '#111' },
});
