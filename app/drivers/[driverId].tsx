import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  getDriverById,
  getDriverStandingById,
  getDriverSeasonResults,
  getDriverCareerSummary,
  type DriverSeasonResult,
} from '../../lib/api';
import { getDriverPhoto } from '../../lib/driverAssets';
import { getConstructorAssets } from '../../lib/constructorAssets';
import { useSeason, AVAILABLE_SEASONS } from '../../lib/SeasonContext';

// ─── Flag images ──────────────────────────────────────────────────
const FLAG_IMAGES: Record<string, any> = {
  British:          require('../../assets/images/flag/uk_flag.png'),
  Dutch:            require('../../assets/images/flag/netherlands_flag.png'),
  Monegasque:       require('../../assets/images/flag/monaco_flag.png'),
  German:           require('../../assets/images/flag/germany_flag.png'),
  Spanish:          require('../../assets/images/flag/spain_flag.png'),
  French:           require('../../assets/images/flag/france_flag.png'),
  Australian:       require('../../assets/images/flag/australia_flag.png'),
  Canadian:         require('../../assets/images/flag/canada_flag.png'),
  Mexican:          require('../../assets/images/flag/mexico_flag.png'),
  Thai:             require('../../assets/images/flag/thailand_flag.png'),
  Japanese:         require('../../assets/images/flag/japan_flag.png'),
  Italian:          require('../../assets/images/flag/italy_flag.png'),
  Brazilian:        require('../../assets/images/flag/brazil_flag.png'),
  Argentine:        require('../../assets/images/flag/argentina_flag.png'),
  'New Zealander':  require('../../assets/images/flag/newzealand_flag.png'),
  Austrian:         require('../../assets/images/flag/austria_flag.png'),
  American:         require('../../assets/images/flag/usa_flag.png'),
  Belgian:          require('../../assets/images/flag/belgium_flag.png'),
  Chinese:          require('../../assets/images/flag/china_flag.png'),
};

// ─── Driver biographies ───────────────────────────────────────────
const BIOGRAPHIES: Record<string, string> = {
  norris:     'Lando broke into karting at 10 and stormed through British and European junior series, winning Formula Renault Eurocup and the Formula 3 European Championship. He made his F1 debut with McLaren in 2019 at 19, and has been their cornerstone ever since.',
  verstappen: 'Max began karting at four under his father Jos, a former F1 driver. He bypassed Formula 2 entirely, debuting with Toro Rosso at 17 — the youngest ever F1 starter. He joined Red Bull and became a four-time consecutive World Champion from 2021 to 2024.',
  hamilton:   'Lewis was signed by the McLaren programme at 13 after impressing Ron Dennis at an awards dinner. His junior record was flawless — Formula Renault, Formula 3, GP2 — all titles. Seven World Championships make him the most decorated driver in the sport\'s history.',
  leclerc:    'Charles grew up racing in Monaco and lost his father Hervé to illness just days before his Formula 2 debut in 2017. He won GP3 and F2 in consecutive years, then joined Sauber and Ferrari. A raw, emotional racer who sees the title as his destiny.',
  piastri:    'Oscar swept the junior categories — Formula Renault Eurocup, F3 and F2 in three back-to-back seasons — with a precision that felt almost mechanical. Signed by Alpine but controversially placed at McLaren for 2023, he immediately announced himself as a future champion.',
  russell:    'George rose through the Williams academy, spending three seasons in underpowered machinery where he out-qualified his teammates almost every weekend. His performances earned him the call-up to Mercedes in 2022 alongside Hamilton, where he has continued to shine.',
  sainz:      'Carlos is the son of two-time World Rally Champion Carlos Sainz Sr. He earned his place in F1 on pure merit, progressing through Toro Rosso, Renault, McLaren and Ferrari before joining Williams, bringing leadership and consistency wherever he goes.',
  alonso:     'Fernando won back-to-back titles with Renault in 2005 and 2006, becoming the youngest champion at the time. His relentless will to win has kept him at the front of the grid across three decades and four different teams. A living legend.',
  stroll:     'Lance comes from a family that acquired Force India, rebranding it into Racing Point and then Aston Martin. Despite the controversy around his path, he has shown genuine wet-weather pace and secured notable podiums when the car has matched his ambition.',
  gasly:      'Pierre won the GP2 title and earned promotion to Red Bull, but was sent back to Toro Rosso mid-2019. He rebuilt his career there, winning the 2020 Italian Grand Prix in a stunning upset, before eventually joining Alpine as a team leader.',
  albon:      'Alex was released by Red Bull after 2020 but refused to disappear, returning with Williams in 2022. He has consistently outperformed the car, scored the team\'s best results in years, and cemented himself as one of the most likeable figures on the grid.',
  hulkenberg: 'Nico holds the record for the most race starts before a podium finish. A former GP2 champion and Le Mans class winner, he has been a reliable and often underrated performer throughout a career that keeps defying expectations.',
  ocon:       'Esteban rose through the Mercedes junior programme and competed in the toughest possible conditions at Force India and Renault. Despite years of political tension at Alpine, he produced his finest moment at the 2021 Hungarian Grand Prix, winning from P4 in chaos.',
  bearman:    'Oliver was catapulted into the spotlight when he replaced Carlos Sainz at Ferrari on just 45 minutes notice at the 2024 Saudi Arabian GP, finishing P7 on debut. A product of the Ferrari Driver Academy, he joined Haas full-time for 2025.',
  lawson:     'Liam spent two seasons as Red Bull\'s reserve driver, filling in impressively mid-season before earning a full-time seat at RB. Aggressive, composed and fast over a single lap, he is one of the grid\'s most watchable newer talents.',
  hadjar:     'Isack dominated the 2024 F2 championship for the Hitech team and earned his Red Bull seat on merit. The French-Algerian teenager carries an air of quiet confidence that belies his age, and has already shown he belongs at the highest level.',
  bortoleto:  'Gabriel became the back-to-back Formula 3 and Formula 2 champion in 2023 and 2024 under the McLaren junior umbrella. Despite being a McLaren junior, he landed a seat at Sauber/Audi for 2025, signalling his readiness for the top flight.',
  colapinto:  'Franco arrived at Williams mid-2024 as a late replacement and immediately set the paddock alight with his qualifying pace. A bidding war broke out between teams for his 2025 services, testament to the impact he made in just eight races.',
  antonelli:  'Kimi was personally chosen by Lewis Hamilton\'s management as the right successor for his Mercedes seat. The Bologna-born teenager set karting world records before dominating F3 and F4, and carries the weight of arguably the biggest debut opportunity in recent memory.',
  bottas:     'Valtteri won the 2013 GP3 title before a decade in F1, first at Williams and then alongside Hamilton at Mercedes. Five seasons of near-misses at the front gave way to a move to Alfa Romeo/Sauber, where he has been a measured and dependable presence.',
  lindblad:   'Arvid accelerated through the Red Bull junior programme at a remarkable pace, catching the eye in European F3 and Formula 2 before earning one of the youngest F1 call-ups in history. One to watch closely.',
  perez:      'Sergio is a Mexican national hero who spent over a decade proving his worth in midfield machinery before his fairytale 2020 Sakhir GP win with Racing Point. He joined Verstappen at Red Bull and became a genuine title asset during the team\'s dominant years.',
};

// ─── Result dot color ─────────────────────────────────────────────
function dotColor(pos: number | null, status: string, teamColor: string): string {
  if (pos === null || status === 'Retired' || status === 'Accident' || status === 'Collision') return '#E10600';
  if (pos === 1)  return '#FFD700';
  if (pos === 2)  return '#C0C0C0';
  if (pos === 3)  return '#CD7F32';
  if (pos <= 10) return teamColor;
  return 'rgba(255,255,255,0.12)';
}

// ─── Stat cell (reused in strips) ────────────────────────────────
function StatCell({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export default function DriverDetail() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { driverId } = useLocalSearchParams<{ driverId: string }>();
  const { season: globalSeason } = useSeason();
  // Local season — changes here don't affect the global standings/constructors tabs
  const [localSeason, setLocalSeason] = useState(globalSeason);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);

  // Primary query — always resolves if the driver exists, never blocks on season availability
  const { data: driverInfo, isLoading: driverLoading } = useQuery({
    queryKey: ['driver-info', driverId],
    queryFn:  () => getDriverById(driverId ?? ''),
    enabled:  !!driverId,
    staleTime: 1000 * 60 * 60,
  });

  // Season-specific standing — may be null if driver didn't race that year
  const { data: standing } = useQuery({
    queryKey: ['driver-standing', localSeason, driverId],
    queryFn:  () => getDriverStandingById(localSeason, driverId ?? ''),
    enabled:  !!driverId,
    staleTime: 1000 * 60 * 5,
  });

  // Current season standing — always fixed to globalSeason so "Current Team" card never changes
  const { data: currentStanding } = useQuery({
    queryKey: ['driver-standing', globalSeason, driverId],
    queryFn:  () => getDriverStandingById(globalSeason, driverId ?? ''),
    enabled:  !!driverId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: raceResults } = useQuery({
    queryKey: ['driver-results', localSeason, driverId],
    queryFn:  () => getDriverSeasonResults(localSeason, driverId ?? ''),
    enabled:  !!driverId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: career } = useQuery({
    queryKey: ['driver-career', driverId],
    queryFn:  () => getDriverCareerSummary(driverId ?? ''),
    enabled:  !!driverId,
    staleTime: 1000 * 60 * 30,
  });

  if (driverLoading || !driverInfo) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  const driver = driverInfo;

  // Selected-season team — drives accent colors, stats
  const constructorId = standing?.Constructors?.[0]?.constructorId;
  const { color: teamColor } = getConstructorAssets(constructorId);

  // Current team — fixed to globalSeason, falls back to most recent career team
  const currentConstructorId = currentStanding?.Constructors?.[0]?.constructorId
    ?? career?.constructors.reduce<string | undefined>((best, c) => {
      const maxYear = Math.max(...c.yearRange.replace('–', '-').split('-').map(Number).filter(Boolean));
      const bestYear = best
        ? Math.max(...(career.constructors.find(x => x.constructorId === best)?.yearRange.replace('–', '-').split('-').map(Number).filter(Boolean) ?? [0]))
        : 0;
      return maxYear >= bestYear ? c.constructorId : best;
    }, undefined);
  const currentTeamName = currentStanding?.Constructors?.[0]?.name
    ?? career?.constructors.find(c => c.constructorId === currentConstructorId)?.name
    ?? '—';
  const { color: currentTeamColor, logo: CurrentTeamLogo } = getConstructorAssets(currentConstructorId);

  const photo     = getDriverPhoto(driver.driverId);
  const flagImage = FLAG_IMAGES[driver.nationality ?? ''];
  const bio       = BIOGRAPHIES[driver.driverId] ?? 'Biography coming soon.';

  // Previous teams: all career teams except the actual current team
  const previousTeams = career?.constructors.filter(c => c.constructorId !== currentConstructorId) ?? [];

  // Best race this season (best finishing position)
  const bestThisSeason = raceResults?.reduce<DriverSeasonResult | null>((best, r) => {
    if (r.position === null) return best;
    if (!best || r.position < (best.position ?? 99)) return r;
    return best;
  }, null);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >

        {/* ── Hero ────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Team colour glow */}
          <View style={[styles.glow, { backgroundColor: teamColor }]} />

          {/* Driver photo
              TODO: helmet toggle pill — once assets are ready:
                assets/helmets/3d/{driverId}.glb  (expo-three GLView)
                state: 'driver' | 'helmet', toggle via pill below hero
                auto-spin: Animated.loop, pan gesture overrides */}
          {photo && (
            <Image source={photo} style={styles.heroPhoto} resizeMode="contain" />
          )}

          {/* Fade so left text stays readable */}
          <LinearGradient
            colors={['#0D0D0D', '#0D0D0D', 'transparent']}
            locations={[0, 0.42, 0.78]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Season picker button */}
          <TouchableOpacity
            style={[styles.seasonBtn, { top: insets.top + 10 }]}
            onPress={() => setShowSeasonPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.seasonBtnText}>{localSeason}</Text>
            <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Name + badges */}
          <View style={styles.heroMeta}>
            <Text style={styles.givenName}>{driver.givenName}</Text>
            <Text style={styles.familyName}>{driver.familyName}</Text>
            <View style={styles.badges}>
              {driver.code && (
                <View style={[styles.badge, { backgroundColor: teamColor }]}>
                  <Text style={styles.badgeText}>{driver.code}</Text>
                </View>
              )}
              {driver.permanentNumber && (
                <View style={styles.badgeOutline}>
                  <Text style={styles.badgeOutlineText}>#{driver.permanentNumber}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Stats strip ──────────────────────────────────────── */}
        <View style={styles.statsStrip}>
          <StatCell value={standing ? `P${standing.position}` : '—'} label="POSITION" accent={teamColor} />
          <View style={styles.stripDivider} />
          <StatCell value={standing ? String(standing.points) : '—'}  label="POINTS"   accent={teamColor} />
          <View style={styles.stripDivider} />
          <StatCell value={standing ? String(standing.wins) : '—'}    label="WINS"     accent={teamColor} />
          <View style={styles.stripDivider} />
          {/* Flag image cell */}
          <View style={styles.statCell}>
            {flagImage ? (
              <Image source={flagImage} style={styles.flagImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.statValue, { color: teamColor }]}>—</Text>
            )}
            <Text style={styles.statLabel}>{driver.nationality?.toUpperCase() ?? '—'}</Text>
          </View>
        </View>

        {/* ── Race results ─────────────────────────────────────── */}
        {raceResults && raceResults.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Race <Text style={styles.cardTitleBold}>Results</Text>
            </Text>
            <View style={styles.dotsRow}>
              {raceResults.map(r => {
                const bg = dotColor(r.position, r.status, teamColor);
                return (
                  <View key={r.round} style={[styles.dot, { backgroundColor: bg }]}>
                    {r.position !== null && (
                      <Text style={styles.dotText}>{r.position}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── About ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            About the <Text style={styles.cardTitleBold}>Driver</Text>
          </Text>
          <Text style={styles.bio}>{bio}</Text>
        </View>

        {/* ── Career highlights ────────────────────────────────── */}
        {career && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Career <Text style={styles.cardTitleBold}>Highlights</Text>
            </Text>
            <View style={styles.highlightsRow}>
              <HighlightCell
                value={career.bestPosition ? `P${career.bestPosition}` : '—'}
                sub={career.bestSeason ?? ''}
                label="BEST SEASON"
                accent={teamColor}
              />
              <View style={styles.highlightDivider} />
              <HighlightCell
                value={String(career.totalWins)}
                sub="career"
                label="TOTAL WINS"
                accent={teamColor}
              />
              <View style={styles.highlightDivider} />
              <HighlightCell
                value={String(career.seasonsInF1)}
                sub="seasons"
                label="IN F1"
                accent={teamColor}
              />
              {bestThisSeason && (
                <>
                  <View style={styles.highlightDivider} />
                  <HighlightCell
                    value={`P${bestThisSeason.position}`}
                    sub={bestThisSeason.raceName.replace(' Grand Prix', ' GP')}
                    label={`BEST ${localSeason}`}
                    accent={teamColor}
                  />
                </>
              )}
            </View>
          </View>
        )}

        {/* ── Current team ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Current <Text style={styles.cardTitleBold}>Team</Text>
          </Text>
          <View style={styles.teamRow}>
            <View style={[styles.teamColorBar, { backgroundColor: currentTeamColor }]} />
            {CurrentTeamLogo && (
              <View style={styles.teamLogoPill}>
                <CurrentTeamLogo width={32} height={32} />
              </View>
            )}
            <View style={styles.teamText}>
              <Text style={styles.teamName}>{currentTeamName}</Text>
              <Text style={styles.teamSeason}>{globalSeason}</Text>
            </View>
          </View>
        </View>

        {/* ── Previous teams ───────────────────────────────────── */}
        {previousTeams.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Previous <Text style={styles.cardTitleBold}>Teams</Text>
            </Text>
            <View style={styles.teamsGrid}>
              {previousTeams.map(team => {
                const { color, logo: Logo } = getConstructorAssets(team.constructorId);
                return (
                  <View key={team.constructorId} style={styles.pastTeamItem}>
                    <View style={[styles.pastTeamBar, { backgroundColor: color }]} />
                    {Logo && (
                      <View style={styles.pastTeamLogoPill}>
                        <Logo width={20} height={20} />
                      </View>
                    )}
                    <View style={styles.pastTeamText}>
                      <Text style={styles.pastTeamName} numberOfLines={1}>{team.name}</Text>
                      {team.yearRange && (
                        <Text style={styles.pastTeamYears}>{team.yearRange}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Season picker modal ──────────────────────────────── */}
      <Modal
        transparent
        visible={showSeasonPicker}
        animationType="fade"
        onRequestClose={() => setShowSeasonPicker(false)}
      >
        <TouchableOpacity
          style={[styles.pickerOverlay, { paddingTop: insets.top + 60 }]}
          onPress={() => setShowSeasonPicker(false)}
          activeOpacity={1}
        >
          {(() => {
              const seasons = career?.careerSeasons?.length
                ? career.careerSeasons
                : [...AVAILABLE_SEASONS].reverse();
              const twoCol = seasons.length > 6;
              return (
                <View style={[styles.pickerMenu, twoCol && styles.pickerMenuWide]}>
                  <View style={twoCol ? styles.pickerGrid : undefined}>
                    {seasons.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          twoCol ? styles.pickerItemCol : styles.pickerItem,
                          s === localSeason && styles.pickerItemActive,
                        ]}
                        onPress={() => { setLocalSeason(String(s)); setShowSeasonPicker(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pickerItemText, s === localSeason && styles.pickerItemTextActive]}>
                          {s}
                        </Text>
                        {s === localSeason && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })()}
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

function HighlightCell({
  value, sub, label, accent,
}: { value: string; sub: string; label: string; accent: string }) {
  return (
    <View style={styles.highlightCell}>
      <Text style={[styles.highlightValue, { color: accent }]}>{value}</Text>
      <Text style={styles.highlightSub} numberOfLines={1}>{sub}</Text>
      <Text style={styles.highlightLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const HERO_HEIGHT = 360;

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0D0D0D' },
  loading: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: { height: HERO_HEIGHT, backgroundColor: '#0D0D0D', overflow: 'hidden' },
  glow: {
    position: 'absolute', right: -50, top: -50,
    width: 280, height: 280, borderRadius: 140, opacity: 0.18,
  },
  heroPhoto: { position: 'absolute', right: -30, top: -20, bottom: -10, width: 300 },
  backBtn: {
    position: 'absolute', left: 18,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Season picker button (top-right of hero)
  seasonBtn: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  seasonBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Season picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 18,
  },
  pickerMenu: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 130,
  },
  pickerMenuWide:       { minWidth: 220 },
  pickerGrid:           { flexDirection: 'row', flexWrap: 'wrap' },
  pickerItem:           { paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  pickerItemCol:        { width: '50%', paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  pickerItemActive:     { backgroundColor: 'rgba(255,255,255,0.1)' },
  pickerItemText:       { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  pickerItemTextActive: { color: '#fff', fontWeight: '700' },

  heroMeta:   { position: 'absolute', bottom: 28, left: 20 },
  givenName: {
    fontSize: 14, fontWeight: '300', color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2,
  },
  familyName: {
    fontSize: 44, fontWeight: '900', color: '#fff',
    letterSpacing: -1.5, lineHeight: 46, marginBottom: 12,
  },
  badges:      { flexDirection: 'row', gap: 8 },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:   { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  badgeOutline: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  badgeOutlineText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', backgroundColor: '#111',
    marginHorizontal: 16, marginTop: 14, borderRadius: 18, overflow: 'hidden',
  },
  statCell:  { flex: 1, paddingVertical: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8 },
  stripDivider: { width: 1, marginVertical: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  flagImage: { width: 32, height: 22, borderRadius: 3 },

  // Cards
  card: {
    backgroundColor: '#111', borderRadius: 20,
    marginHorizontal: 16, marginTop: 12, padding: 20,
  },
  cardTitle:     { fontSize: 16, fontWeight: '300', color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  cardTitleBold: { fontWeight: '800', color: '#fff' },

  // Season form
  dotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // About
  bio: { fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.6)', fontWeight: '400' },

  // Career highlights
  highlightsRow: { flexDirection: 'row', alignItems: 'stretch' },
  highlightCell: { flex: 1, alignItems: 'center', gap: 3 },
  highlightValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  highlightSub: {
    fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.3, textAlign: 'center',
  },
  highlightLabel: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.25)', letterSpacing: 0.8 },
  highlightDivider: { width: 1, marginVertical: 4, backgroundColor: 'rgba(255,255,255,0.08)' },

  // Previous teams
  teamsGrid: { gap: 10 },
  pastTeamItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
  },
  pastTeamBar:     { width: 3, height: 36, borderRadius: 2 },
  pastTeamLogoPill: { backgroundColor: '#ffffff', borderRadius: 7, padding: 5, alignItems: 'center', justifyContent: 'center' },
  pastTeamText:  { flex: 1 },
  pastTeamName:  { fontSize: 14, fontWeight: '600', color: '#fff' },
  pastTeamYears: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginTop: 2 },

  // Current team
  teamRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  teamLogoPill: { backgroundColor: '#ffffff', borderRadius: 10, padding: 7, alignItems: 'center', justifyContent: 'center' },
  teamColorBar: { width: 4, height: 44, borderRadius: 2 },
  teamText:    { flex: 1 },
  teamName:    { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  teamSeason:  { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
});
