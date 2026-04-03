import React, { useState } from 'react';
import {
  View, Text, Image, ActivityIndicator, ScrollView,
  StyleSheet, TouchableOpacity, Modal, Dimensions,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getConstructorAssets } from '../../lib/constructorAssets';
import { getDriverPhoto } from '../../lib/driverAssets';
import { useSeason, AVAILABLE_SEASONS } from '../../lib/SeasonContext';
import {
  getConstructorStandingForSeason,
  getConstructorDrivers,
  getConstructorTotalWins,
  getConstructorInfo,
  getConstructorSeasonsList,
  getConstructorChampionships,
  type DriverLite,
} from '../../lib/api';

// ─── Car images (right-side view) ────────────────────────────────
const CAR_IMAGES: Record<string, any> = {
  alpine:        require('../../assets/f1_2026_cars/2026alpinecarright.avif'),
  aston_martin:  require('../../assets/f1_2026_cars/2026astonmartincarright.avif'),
  audi:          require('../../assets/f1_2026_cars/2026audicarright.avif'),
  sauber:        require('../../assets/f1_2026_cars/2026audicarright.avif'),
  cadillac:      require('../../assets/f1_2026_cars/2026cadillaccarright.avif'),
  ferrari:       require('../../assets/f1_2026_cars/2026ferraricarright.avif'),
  haas:          require('../../assets/f1_2026_cars/2026haascarright.avif'),
  mclaren:       require('../../assets/f1_2026_cars/2026mclarencarright.avif'),
  mercedes:      require('../../assets/f1_2026_cars/2026mercedescarright.avif'),
  rb:            require('../../assets/f1_2026_cars/2026racingbullscarright.avif'),
  racing_bulls:  require('../../assets/f1_2026_cars/2026racingbullscarright.avif'),
  red_bull:      require('../../assets/f1_2026_cars/2026redbullracingcarright.avif'),
  williams:      require('../../assets/f1_2026_cars/2026williamscarright.avif'),
};

// ─── Display names ────────────────────────────────────────────────
const DISPLAY_NAMES: Record<string, string> = {
  mercedes:     'Mercedes',
  ferrari:      'Ferrari',
  mclaren:      'McLaren',
  red_bull:     'Red Bull',
  aston_martin: 'Aston Martin',
  alpine:       'Alpine',
  haas:         'Haas',
  williams:     'Williams',
  rb:           'Racing Bulls',
  racing_bulls: 'Racing Bulls',
  cadillac:     'Cadillac',
  sauber:       'Audi',
  audi:         'Audi',
};

// ─── Icon stat row ────────────────────────────────────────────────
function IconStat({
  icon, value, label, accent,
}: {
  icon: string; value: string; label: string; accent: string;
}) {
  return (
    <View style={styles.iconStatRow}>
      <View style={[styles.iconStatCircle, { borderColor: `${accent}40` }]}>
        <Ionicons name={icon as any} size={16} color={accent} />
      </View>
      <View style={styles.iconStatText}>
        <Text style={styles.iconStatValue}>{value}</Text>
        <Text style={styles.iconStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export default function ConstructorDetailScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { constructorId } = useLocalSearchParams<{ constructorId: string }>();
  const id = constructorId ?? 'mclaren';

  const { season: globalSeason } = useSeason();
  const [localSeason, setLocalSeason] = useState(globalSeason);
  const [showPicker, setShowPicker] = useState(false);

  const { color: teamColor } = getConstructorAssets(id);
  const carImage = CAR_IMAGES[id];

  const { data: standing } = useQuery({
    queryKey: ['c-standing', localSeason, id],
    queryFn: () => getConstructorStandingForSeason(localSeason, id),
    staleTime: 1000 * 60 * 5,
  });
  const { data: drivers } = useQuery({
    queryKey: ['c-drivers', localSeason, id],
    queryFn: () => getConstructorDrivers(localSeason, id),
    staleTime: 1000 * 60 * 5,
  });
  const { data: totalWins } = useQuery({
    queryKey: ['c-wins-total', id],
    queryFn: () => getConstructorTotalWins(id),
    staleTime: 1000 * 60 * 60,
  });
  const { data: championships } = useQuery({
    queryKey: ['c-championships', id],
    queryFn: () => getConstructorChampionships(id),
    staleTime: 1000 * 60 * 60,
  });
  const { data: info, isLoading: infoLoading } = useQuery({
    queryKey: ['c-info', id],
    queryFn: () => getConstructorInfo(id),
    staleTime: 1000 * 60 * 60,
  });
  const { data: seasonsList } = useQuery({
    queryKey: ['c-seasons-list', id],
    queryFn: () => getConstructorSeasonsList(id),
    staleTime: 1000 * 60 * 60,
  });

  if (infoLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#111" size="large" />
      </View>
    );
  }

  const constructorName = DISPLAY_NAMES[id] ?? info?.name ?? id;
  const pickerSeasons   = seasonsList?.length ? seasonsList : [...AVAILABLE_SEASONS].reverse() as unknown as string[];
  const twoColPicker    = pickerSeasons.length > 6;

  const posStr = standing?.position ? String(standing.position).padStart(2, '0') : '—';
  const ptsStr = standing?.points != null ? String(standing.points) : '—';

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >

        {/* ── Hero ──────────────────────────────────────────────── */}
        <View style={styles.hero}>

          {/* Team colour wash — soft corner gradient top-right (no visible blob) */}
          <LinearGradient
            colors={[`${teamColor}30`, `${teamColor}10`, 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.2, y: 0.9 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Car — rendered first so text appears on top */}
          {carImage && (
            <Image source={carImage} style={styles.heroCar} resizeMode="contain" />
          )}

          {/* Ground fade — behind text */}
          <LinearGradient
            colors={['transparent', '#ffffff']}
            locations={[0.3, 1]}
            style={styles.heroGroundFade}
            pointerEvents="none"
          />

          {/* Left text-guard — behind text, in front of car */}
          <LinearGradient
            colors={['#ffffff', '#ffffffCC', '#ffffff55', 'transparent']}
            locations={[0, 0.28, 0.52, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.heroTextGuard}
            pointerEvents="none"
          />

          {/* ── All text content renders last = highest z-order ── */}

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color="#111" />
          </TouchableOpacity>

          {/* Season picker */}
          <TouchableOpacity
            style={[styles.seasonBtn, { top: insets.top + 10 }]}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.seasonBtnText}>{localSeason}</Text>
            <Ionicons name="chevron-down" size={12} color="#888" />
          </TouchableOpacity>

          {/* Constructor name + season subtitle + big stats — flow layout */}
          <View style={[styles.heroContent, { paddingTop: insets.top + 58 }]}>
            <Text style={styles.heroName}>{constructorName}</Text>
            <View style={styles.heroSeasonRow}>
              <View style={[styles.heroAccentBar, { backgroundColor: teamColor }]} />
              <Text style={[styles.heroSeasonText, { color: teamColor }]}>
                {localSeason} Season
              </Text>
            </View>

            <View style={styles.heroBigStats}>
              <View style={styles.bigStat}>
                <Text style={styles.bigStatNum}>{posStr}</Text>
                <Text style={styles.bigStatUnit}>POS</Text>
              </View>
              <View style={styles.bigStat}>
                <Text style={styles.bigStatNum}>{ptsStr}</Text>
                <Text style={styles.bigStatUnit}>PTS</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Season stats ───────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {localSeason} <Text style={styles.cardTitleBold}>Stats</Text>
          </Text>
          <View style={styles.iconStatsCol}>
            <IconStat
              icon="trophy-outline"
              value={standing?.wins != null ? String(standing.wins) : '—'}
              label="Race wins this season"
              accent={teamColor}
            />
            <View style={styles.rowDivider} />
            <IconStat
              icon="stats-chart-outline"
              value={ptsStr}
              label="Championship points"
              accent={teamColor}
            />
            <View style={styles.rowDivider} />
            <IconStat
              icon="flag-outline"
              value={info?.nationality ?? '—'}
              label="Country of origin"
              accent={teamColor}
            />
          </View>
        </View>

        {/* ── All-time highlights ────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            All <Text style={styles.cardTitleBold}>Time</Text>
          </Text>
          <View style={styles.iconStatsCol}>
            <IconStat
              icon="medal-outline"
              value={championships != null ? String(championships) : '—'}
              label="Constructor championships"
              accent={teamColor}
            />
            <View style={styles.rowDivider} />
            <IconStat
              icon="checkmark-circle-outline"
              value={totalWins != null ? String(totalWins) : '—'}
              label="Race wins in total"
              accent={teamColor}
            />
            <View style={styles.rowDivider} />
            <IconStat
              icon="time-outline"
              value={seasonsList?.length ? String(seasonsList.length) : '—'}
              label="Seasons in Formula 1"
              accent={teamColor}
            />
          </View>
        </View>

        {/* ── Drivers ───────────────────────────────────────────── */}
        {drivers && drivers.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {localSeason} <Text style={styles.cardTitleBold}>Drivers</Text>
            </Text>
            <View style={styles.driversCol}>
              {(drivers as DriverLite[]).map(d => {
                const photo = getDriverPhoto(d.driverId);
                return (
                  <TouchableOpacity
                    key={d.driverId}
                    style={styles.driverRow}
                    onPress={() => router.push(`/drivers/${d.driverId}`)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.driverPhotoWrap, { borderColor: teamColor }]}>
                      {photo
                        ? <Image source={photo} style={styles.driverPhoto} resizeMode="contain" />
                        : <Text style={[styles.driverInitial, { color: teamColor }]}>
                            {d.familyName.charAt(0)}
                          </Text>
                      }
                    </View>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverGiven}>{d.givenName}</Text>
                      <Text style={styles.driverFamily}>{d.familyName}</Text>
                    </View>
                    {d.permanentNumber && (
                      <Text style={[styles.driverNumber, { color: teamColor }]}>
                        #{d.permanentNumber}
                      </Text>
                    )}
                    <Ionicons name="arrow-forward" size={16} color="rgba(0,0,0,0.2)" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Season picker modal ───────────────────────────────── */}
      <Modal
        transparent
        visible={showPicker}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={[styles.pickerOverlay, { paddingTop: insets.top + 60 }]}
          onPress={() => setShowPicker(false)}
          activeOpacity={1}
        >
          <View style={[styles.pickerMenu, twoColPicker && styles.pickerMenuWide]}>
            <View style={twoColPicker ? styles.pickerGrid : undefined}>
              {pickerSeasons.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    twoColPicker ? styles.pickerItemCol : styles.pickerItem,
                    s === localSeason && styles.pickerItemActive,
                  ]}
                  onPress={() => { setLocalSeason(s); setShowPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerItemText, s === localSeason && styles.pickerItemTextActive]}>
                    {s}
                  </Text>
                  {s === localSeason && <Ionicons name="checkmark" size={12} color="#111" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f2f2f2' },
  loading: { flex: 1, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' },

  // ── Hero
  hero: {
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    // height determined by content flow + bottom padding for car
    paddingBottom: SCREEN_W * 0.28 + 16,
  },

  backBtn: {
    position: 'absolute', left: 18,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  seasonBtn: {
    position: 'absolute', right: 18,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  seasonBtnText: { fontSize: 13, fontWeight: '700', color: '#111' },

  // Flow content — name, subtitle, stats in a column
  heroContent: {
    paddingHorizontal: 22,
    gap: 0,
  },
  heroName: {
    fontSize: 42, fontWeight: '900',
    color: '#111111', letterSpacing: -2,
  },
  heroSeasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 20,
  },
  heroAccentBar: {
    width: 3, height: 14, borderRadius: 2,
  },
  heroSeasonText: {
    fontSize: 14, fontWeight: '700', letterSpacing: 0.2,
  },

  // Big POS + PTS stacked
  heroBigStats: { gap: 2 },
  bigStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  bigStatNum: {
    fontSize: 52, fontWeight: '900',
    color: '#111111', letterSpacing: -2,
  },
  bigStatUnit: {
    fontSize: 15, fontWeight: '700',
    color: 'rgba(0,0,0,0.28)', letterSpacing: 1.2,
  },

  // Car — bottom-right, anchored to ground line
  heroCar: {
    position: 'absolute',
    right: -20,
    bottom: 0,
    width: SCREEN_W * 0.80,
    height: SCREEN_W * 0.28,
  },

  // Left gradient — keeps text readable when car overlaps
  heroTextGuard: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: SCREEN_W * 0.58,
  },

  // Bottom fade — car "melts into" the white floor
  heroGroundFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 56,
  },

  // ── Cards
  card: {
    backgroundColor: '#ffffff', borderRadius: 20,
    marginHorizontal: 16, marginTop: 12, padding: 20,
  },
  cardTitle:     { fontSize: 16, fontWeight: '300', color: 'rgba(0,0,0,0.4)', marginBottom: 14 },
  cardTitleBold: { fontWeight: '800', color: '#111' },

  // Icon stat rows
  iconStatsCol: { gap: 0 },
  iconStatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12,
  },
  iconStatCircle: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  iconStatText:  { flex: 1 },
  iconStatValue: { fontSize: 20, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  iconStatLabel: { fontSize: 11, fontWeight: '400', color: 'rgba(0,0,0,0.4)', marginTop: 1 },
  rowDivider:    { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginLeft: 54 },

  // Drivers
  driversCol: { gap: 10 },
  driverRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f7f7f7',
    borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12,
  },
  driverPhotoWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#eeeeee',
    overflow: 'hidden',
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  driverPhoto:   { width: '100%', height: '100%' },
  driverInitial: { fontSize: 20, fontWeight: '900' },
  driverInfo:    { flex: 1 },
  driverGiven:   { fontSize: 11, fontWeight: '300', color: 'rgba(0,0,0,0.4)' },
  driverFamily:  { fontSize: 16, fontWeight: '800', color: '#111', letterSpacing: -0.3 },
  driverNumber:  { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },

  // Season picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 18,
  },
  pickerMenu: {
    backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', minWidth: 130,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 16,
  },
  pickerMenuWide:   { minWidth: 230 },
  pickerGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
  pickerItem:       { paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerItemCol:    { width: '50%', paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerItemActive: { backgroundColor: '#f5f5f5' },
  pickerItemText:       { fontSize: 15, fontWeight: '600', color: '#888' },
  pickerItemTextActive: { color: '#111', fontWeight: '800' },
});
