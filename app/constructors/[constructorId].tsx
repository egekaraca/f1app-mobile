import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Image, ActivityIndicator, ScrollView,
  StyleSheet, TouchableOpacity, Modal, Dimensions, Animated,
} from 'react-native';
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const { width: SCREEN_W } = Dimensions.get('window');
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
import { getConstructorStats } from '../../lib/apiSports';

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

  const { data: standing, isFetching: standingFetching } = useQuery({
    queryKey: ['c-standing', localSeason, id],
    queryFn: () => getConstructorStandingForSeason(localSeason, id),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
  const { data: drivers, isFetching: driversFetching } = useQuery({
    queryKey: ['c-drivers', localSeason, id],
    queryFn: () => getConstructorDrivers(localSeason, id),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
  const isFetching = standingFetching || driversFetching;

  const scrollY = useRef(new Animated.Value(0)).current;

  // Fade in content when a season-switch fetch completes
  const contentFade = useRef(new Animated.Value(1)).current;
  const wasFetching = useRef(false);
  useEffect(() => {
    if (wasFetching.current && !isFetching) {
      contentFade.setValue(0.35);
      Animated.timing(contentFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
    wasFetching.current = isFetching;
  }, [isFetching]);
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
  // DISPLAY_NAMES gives the search-friendly name for API-Sports (e.g. "McLaren")
  const displayName = DISPLAY_NAMES[id];
  const { data: teamProfile } = useQuery({
    queryKey: ['c-apisports', displayName ?? id],
    queryFn: () => getConstructorStats(displayName ?? id),
    staleTime: 1000 * 60 * 60 * 24,
  });

  if (infoLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  const constructorName = DISPLAY_NAMES[id] ?? info?.name ?? id;
  // Filter to 1958+ — the Constructors' Championship started in 1958;
  // earlier entries exist in the API (e.g. Mercedes 1954–55) but have no standings data.
  const pickerSeasons = (seasonsList?.length ? seasonsList : [localSeason])
    .filter(s => Number(s) >= 1958);

  const posStr = standing?.position ? String(standing.position).padStart(2, '0') : '—';
  const ptsStr = standing?.points != null ? String(standing.points) : '—';

  return (
    <View style={styles.root}>
      <AnimatedScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >

        {/* ── Hero ──────────────────────────────────────────────── */}
        <Animated.View style={styles.hero}>

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

          {/* Ground fade — car melts into white floor; rgba avoids dark-band artifact */}
          <LinearGradient
            colors={['rgba(13,13,13,0)', '#0D0D0D']}
            locations={[0.2, 1]}
            style={styles.heroGroundFade}
            pointerEvents="none"
          />


          {/* Spotlight — darken top-left corner (away from car) */}
          <LinearGradient
            colors={['rgba(0,0,0,0.75)', 'transparent']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0.7 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Vignette — left edge dark (text side, away from car) */}
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            locations={[0, 0.5]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Vignette — top edge */}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent']}
            locations={[0, 0.5]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* ── All text content renders last = highest z-order ── */}

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Season picker */}
          <TouchableOpacity
            style={[styles.seasonBtn, { top: insets.top + 10 }]}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.8}
          >
            {isFetching
              ? <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={{ width: 16, height: 16 }} />
              : <Text style={styles.seasonBtnText}>{localSeason}</Text>
            }
            <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.7)" />
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
        </Animated.View>

        {/* ── Season-dependent cards — fade in when fetch completes ── */}
        <Animated.View style={{ opacity: contentFade }}>

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

        {/* ── API-Sports team profile ────────────────────────────── */}
        {teamProfile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Team <Text style={styles.cardTitleBold}>Profile</Text>
            </Text>
            <View style={styles.iconStatsCol}>
              {teamProfile.base && (
                <>
                  <IconStat
                    icon="location-outline"
                    value={teamProfile.base}
                    label="Headquarters"
                    accent={teamColor}
                  />
                  <View style={styles.rowDivider} />
                </>
              )}
              {teamProfile.firstTeamEntry != null && (
                <>
                  <IconStat
                    icon="calendar-outline"
                    value={String(teamProfile.firstTeamEntry)}
                    label="First entry in Formula 1"
                    accent={teamColor}
                  />
                  <View style={styles.rowDivider} />
                </>
              )}
              {teamProfile.chassis && (
                <>
                  <IconStat
                    icon="car-sport-outline"
                    value={teamProfile.chassis}
                    label="Chassis"
                    accent={teamColor}
                  />
                  <View style={styles.rowDivider} />
                </>
              )}
              {teamProfile.technicalChief && (
                <>
                  <IconStat
                    icon="construct-outline"
                    value={teamProfile.technicalChief}
                    label="Technical chief"
                    accent={teamColor}
                  />
                  <View style={styles.rowDivider} />
                </>
              )}
              <IconStat
                icon="podium-outline"
                value={String(teamProfile.polePositions)}
                label="Pole positions (all time)"
                accent={teamColor}
              />
              <View style={styles.rowDivider} />
              <IconStat
                icon="flash-outline"
                value={String(teamProfile.fastestLaps)}
                label="Fastest laps (all time)"
                accent={teamColor}
              />
            </View>
          </View>
        )}

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
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.2)" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        </Animated.View>
      </AnimatedScrollView>

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
          <View style={[styles.pickerMenu, { height: Math.min(pickerSeasons.length, 4) * 46 }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={styles.pickerScroll}
            >
              {pickerSeasons.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pickerItem, s === localSeason && styles.pickerItemActive]}
                  onPress={() => { setLocalSeason(s); setShowPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerItemText, s === localSeason && styles.pickerItemTextActive]}>
                    {s}
                  </Text>
                  {s === localSeason && <Ionicons name="checkmark" size={12} color="#fff" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {pickerSeasons.length > 4 && (
              <LinearGradient
                colors={['rgba(28,28,30,0)', '#1c1c1e']}
                style={styles.pickerFade}
                pointerEvents="none"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0D0D0D' },
  loading: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' },

  // ── Hero
  hero: {
    backgroundColor: '#0D0D0D',
    overflow: 'hidden',
    // height determined by content flow + bottom padding for car
    paddingBottom: SCREEN_W * 0.12 + 16,
  },

  backBtn: {
    position: 'absolute', left: 18,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  seasonBtn: {
    position: 'absolute', right: 18,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  seasonBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Flow content — name, subtitle, stats in a column
  heroContent: {
    paddingHorizontal: 22,
    gap: 0,
  },
  heroName: {
    fontSize: 42, fontWeight: '900',
    color: '#ffffff', letterSpacing: -2,
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
    color: '#ffffff', letterSpacing: -2,
  },
  bigStatUnit: {
    fontSize: 15, fontWeight: '700',
    color: 'rgba(255,255,255,0.28)', letterSpacing: 1.2,
  },

  // Car — bottom-left, aligned with POS/PTS text column
  heroCar: {
    position: 'absolute',
    left: 22,
    bottom: -28,
    width: SCREEN_W * 1.52,
    height: SCREEN_W * 0.53,
  },

  // Right gradient — fades car where it extends past the stats column
  heroTextGuard: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: SCREEN_W * 0.42,
  },

  // Bottom fade — car "melts into" the white floor (use rgba to avoid dark-band artifact)
  heroGroundFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 110,
  },

  // ── Cards
  card: {
    backgroundColor: '#111', borderRadius: 20,
    marginHorizontal: 16, marginTop: 12, padding: 20,
  },
  cardTitle:     { fontSize: 16, fontWeight: '300', color: 'rgba(255,255,255,0.5)', marginBottom: 14 },
  cardTitleBold: { fontWeight: '800', color: '#fff' },

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
  iconStatValue: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  iconStatLabel: { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  rowDivider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 54 },

  // Drivers
  driversCol: { gap: 10 },
  driverRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12,
  },
  driverPhotoWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  driverPhoto:   { width: '100%', height: '100%' },
  driverInitial: { fontSize: 20, fontWeight: '900' },
  driverInfo:    { flex: 1 },
  driverGiven:   { fontSize: 11, fontWeight: '300', color: 'rgba(255,255,255,0.4)' },
  driverFamily:  { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  driverNumber:  { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },

  // Season picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 18,
  },
  pickerMenu: {
    backgroundColor: '#1c1c1e', borderRadius: 16, overflow: 'hidden', minWidth: 150,
  },
  pickerScroll: { flex: 1 },
  pickerFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  pickerItem:       { paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  pickerItemActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  pickerItemText:       { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  pickerItemTextActive: { color: '#fff', fontWeight: '800' },
});
