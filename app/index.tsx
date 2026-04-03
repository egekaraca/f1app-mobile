import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getTopDrivers, getTopConstructors, getNextRace, formatRaceDateTimeLocal,
} from '../lib/api';
import { fetchF1News } from '../lib/news';
import { CURRENT_SEASON } from '../lib/SeasonContext';
import { getDriverPhoto } from '../lib/driverAssets';
import { getConstructorAssets } from '../lib/constructorAssets';
import type { DriverStanding } from '../types/standings';
import type { Race } from '../types/race';
import type { NewsItem } from '../lib/news';

const SEASON = CURRENT_SEASON;

// ─── Circuit images ───────────────────────────────────────────────
const CIRCUIT_IMAGES: Record<string, any> = {
  bahrain:       require('../assets/images/circuit/bahrain_gp_image.jpg'),
  jeddah:        require('../assets/images/circuit/saudi_arabia_gp_image.jpg'),
  albert_park:   require('../assets/images/circuit/australia_gp_image.jpg'),
  suzuka:        require('../assets/images/circuit/japan_gp_image.jpg'),
  shanghai:      require('../assets/images/circuit/china_gp_image.jpg'),
  miami:         require('../assets/images/circuit/miami_gp_image.jpg'),
  imola:         require('../assets/images/circuit/emilia_romagna_gp_image.jpg'),
  monaco:        require('../assets/images/circuit/monaco_gp_image.jpg'),
  villeneuve:    require('../assets/images/circuit/canada_gp_image.jpg'),
  catalunya:     require('../assets/images/circuit/spain_gp_image.jpg'),
  red_bull_ring: require('../assets/images/circuit/austria_gp_image.jpg'),
  silverstone:   require('../assets/images/circuit/british_gp_image.jpg'),
  hungaroring:   require('../assets/images/circuit/hungary_gp_image.jpg'),
  spa:           require('../assets/images/circuit/belgium_gp_image.jpg'),
  zandvoort:     require('../assets/images/circuit/netherlands_gp_image.jpg'),
  monza:         require('../assets/images/circuit/italy_gp_image.jpg'),
  baku:          require('../assets/images/circuit/azerbaijan_gp_image.jpg'),
  marina_bay:    require('../assets/images/circuit/singapore_gp_image.jpg'),
  americas:      require('../assets/images/circuit/usa_gp_image.jpg'),
  rodriguez:     require('../assets/images/circuit/mexico_gp_image.jpg'),
  interlagos:    require('../assets/images/circuit/brazil_gp_image.jpg'),
  vegas:         require('../assets/images/circuit/las_vegas_gp_image.jpg'),
  losail:        require('../assets/images/circuit/qatar_gp_image.jpg'),
  yas_marina:    require('../assets/images/circuit/abu_dhabi_gp_image.jpg'),
};

// ─── 2026 car images ──────────────────────────────────────────────
const CAR_IMAGES: Record<string, any> = {
  alpine:       require('../assets/f1_2026_cars/2026alpinecarright.avif'),
  aston_martin: require('../assets/f1_2026_cars/2026astonmartincarright.avif'),
  audi:         require('../assets/f1_2026_cars/2026audicarright.avif'),
  sauber:       require('../assets/f1_2026_cars/2026audicarright.avif'),
  cadillac:     require('../assets/f1_2026_cars/2026cadillaccarright.avif'),
  ferrari:      require('../assets/f1_2026_cars/2026ferraricarright.avif'),
  haas:         require('../assets/f1_2026_cars/2026haascarright.avif'),
  mclaren:      require('../assets/f1_2026_cars/2026mclarencarright.avif'),
  mercedes:     require('../assets/f1_2026_cars/2026mercedescarright.avif'),
  rb:           require('../assets/f1_2026_cars/2026racingbullscarright.avif'),
  racing_bulls: require('../assets/f1_2026_cars/2026racingbullscarright.avif'),
  red_bull:     require('../assets/f1_2026_cars/2026redbullracingcarright.avif'),
  williams:     require('../assets/f1_2026_cars/2026williamscarright.avif'),
};

// ─── Countdown hook ───────────────────────────────────────────────
function useCountdown(dateStr: string, timeStr?: string) {
  const [parts, setParts] = React.useState({ d: 0, h: 0, m: 0, s: 0 });
  React.useEffect(() => {
    const target = new Date(`${dateStr}T${timeStr ?? '00:00:00'}`);
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setParts({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dateStr, timeStr]);
  return parts;
}

// ─── Screen ───────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: topDrivers, isLoading: dl } = useQuery({
    queryKey: ['top-drivers', SEASON],
    queryFn:  () => getTopDrivers(SEASON, 5),
    staleTime: 1000 * 60 * 5,
  });

  const { data: topConstructors } = useQuery({
    queryKey: ['top-constructors', SEASON],
    queryFn:  () => getTopConstructors(SEASON, 1),
    staleTime: 1000 * 60 * 5,
  });

  const { data: nextRace, isLoading: rl } = useQuery({
    queryKey: ['next-race', SEASON],
    queryFn:  () => getNextRace(SEASON),
    staleTime: 1000 * 60 * 5,
  });

  const { data: news } = useQuery({
    queryKey: ['f1-news'],
    queryFn:  fetchF1News,
    staleTime: 1000 * 60 * 10,
  });

  if (dl || rl) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#E10600" />
      </View>
    );
  }

  const driverLeader       = topDrivers?.[0];
  const constructorLeader  = topConstructors?.[0];
  const driverId           = driverLeader?.Driver?.driverId;
  const driverConstrId     = driverLeader?.Constructors?.[0]?.constructorId;
  const { color: driverTeamColor } = getConstructorAssets(driverConstrId);
  const driverPhoto        = getDriverPhoto(driverId);

  const constrId           = constructorLeader?.Constructor?.constructorId;
  const { color: constrColor } = getConstructorAssets(constrId);
  const carImage           = constrId ? CAR_IMAGES[constrId] : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.wordmark}>APEX</Text>
      </View>

      {/* ── Next Race ── */}
      {nextRace && (
        <NextRaceCard race={nextRace} onPress={() => router.push('/races')} />
      )}

      {/* ── Driver Championship Leader ── */}
      {driverLeader && (
        <TouchableOpacity
          style={styles.driverLeaderCard}
          onPress={() => router.push(`/drivers/${driverId}`)}
          activeOpacity={0.88}
        >
          {/* Team colour glow */}
          <View style={[styles.leaderGlow, { backgroundColor: driverTeamColor }]} />

          {/* Driver photo bleeding off right */}
          {driverPhoto && (
            <Image source={driverPhoto} style={styles.leaderPhoto} resizeMode="contain" />
          )}

          {/* Left-to-transparent gradient keeps text readable */}
          <LinearGradient
            colors={['#111111', '#111111', 'transparent']}
            locations={[0, 0.28, 0.52]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Text content */}
          <View style={styles.leaderContent}>
            <Text style={styles.leaderEyebrow}>CHAMPIONSHIP LEADER</Text>
            <Text style={styles.leaderGiven}>{driverLeader.Driver.givenName}</Text>
            <Text style={styles.leaderFamily}>
              {driverLeader.Driver.familyName.toUpperCase()}
            </Text>
            <View style={styles.leaderStatsRow}>
              <View style={styles.leaderStat}>
                <Text style={[styles.leaderStatVal, { color: driverTeamColor }]}>
                  P{driverLeader.position}
                </Text>
                <Text style={styles.leaderStatLbl}>POS</Text>
              </View>
              <View style={styles.leaderStatDiv} />
              <View style={styles.leaderStat}>
                <Text style={[styles.leaderStatVal, { color: driverTeamColor }]}>
                  {driverLeader.points}
                </Text>
                <Text style={styles.leaderStatLbl}>PTS</Text>
              </View>
              <View style={styles.leaderStatDiv} />
              <View style={styles.leaderStat}>
                <Text style={[styles.leaderStatVal, { color: driverTeamColor }]}>
                  {driverLeader.wins}
                </Text>
                <Text style={styles.leaderStatLbl}>WINS</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Constructor Championship Leader ── */}
      {constructorLeader && carImage && (
        <TouchableOpacity
          style={styles.constrCard}
          onPress={() => router.push('/standings')}
          activeOpacity={0.88}
        >
          <View style={[styles.constrBar, { backgroundColor: constrColor }]} />
          <View style={styles.constrInfo}>
            <Text style={styles.constrEyebrow}>CONSTRUCTOR LEADER</Text>
            <Text style={styles.constrName}>{constructorLeader.Constructor.name}</Text>
            <View style={styles.constrPtsRow}>
              <Text style={[styles.constrPts, { color: constrColor }]}>
                {constructorLeader.points}
              </Text>
              <Text style={styles.constrPtsLbl}>PTS</Text>
            </View>
          </View>
          {/* Car anchored left so front wing is visible */}
          <Image source={carImage} style={styles.constrCar} resizeMode="contain" />
        </TouchableOpacity>
      )}

      {/* ── Driver Standings ── */}
      {topDrivers && topDrivers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>
              Driver <Text style={styles.sectionBold}>Standings</Text>
            </Text>
            <TouchableOpacity onPress={() => router.push('/standings')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.standingsCard}>
            {topDrivers.slice(0, 5).map((d, i) => (
              <DriverRow
                key={d.Driver.driverId}
                driver={d}
                rank={i + 1}
                isLast={i === 4}
                onPress={() => router.push(`/drivers/${d.Driver.driverId}`)}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── News ── */}
      {news && news.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>
              Latest <Text style={styles.sectionBold}>News</Text>
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsScroll}
          >
            {news.slice(0, 6).map((item, i) => (
              <NewsCard key={i} item={item} />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Next Race Card ───────────────────────────────────────────────
function NextRaceCard({ race, onPress }: { race: Race; onPress: () => void }) {
  const { d, h, m, s } = useCountdown(race.date, race.time);
  const { dateStr } = formatRaceDateTimeLocal(race.date, race.time);
  const round = race.round ?? '?';
  const circuitImage = CIRCUIT_IMAGES[race.Circuit.circuitId ?? ''];

  const stripped = race.raceName.replace(' Grand Prix', '');
  const words = stripped.split(' ');
  const lastWord = words.pop() ?? '';
  const rest = words.join(' ');

  return (
    <TouchableOpacity style={styles.nextRaceCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.nextRaceTop}>

        {/* Left: text */}
        <View style={styles.nextRaceLeft}>
          <Text style={styles.nextRaceEyebrow}>ROUND {round} · NEXT RACE</Text>
          <Text style={styles.nextRaceName}>
            {rest ? `${rest} ` : ''}
            <Text style={styles.nextRaceNameBold}>{lastWord}</Text>
          </Text>
          <Text style={styles.nextRaceGP}>Grand Prix</Text>
          <Text style={styles.nextRaceCircuit}>{race.Circuit.circuitName}</Text>
          <Text style={styles.nextRaceDate}>{dateStr}</Text>
        </View>

        {/* Right: circuit layout image */}
        {circuitImage ? (
          <View style={styles.circuitBox}>
            <Image source={circuitImage} style={styles.circuitImage} resizeMode="contain" />
          </View>
        ) : (
          <View style={[styles.circuitBox, styles.circuitBoxEmpty]} />
        )}
      </View>

      {/* Countdown */}
      <View style={styles.cdRow}>
        <CdUnit value={d} unit="DAYS" />
        <Text style={styles.cdSep}>:</Text>
        <CdUnit value={h} unit="HRS" />
        <Text style={styles.cdSep}>:</Text>
        <CdUnit value={m} unit="MIN" />
        <Text style={styles.cdSep}>:</Text>
        <CdUnit value={s} unit="SEC" />
      </View>
    </TouchableOpacity>
  );
}

function CdUnit({ value, unit }: { value: number; unit: string }) {
  return (
    <View style={styles.cdUnit}>
      <Text style={styles.cdValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.cdLabel}>{unit}</Text>
    </View>
  );
}

// ─── Driver Row ───────────────────────────────────────────────────
function DriverRow({
  driver, rank, isLast, onPress,
}: { driver: DriverStanding; rank: number; isLast: boolean; onPress: () => void }) {
  const { color } = getConstructorAssets(driver.Constructors?.[0]?.constructorId);
  return (
    <TouchableOpacity
      style={[styles.driverRow, !isLast && styles.driverRowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.drRank}>{rank}</Text>
      <View style={[styles.drTeamBar, { backgroundColor: color }]} />
      <View style={styles.drInfo}>
        <Text style={styles.drName}>
          {driver.Driver.givenName}{' '}
          <Text style={styles.drNameBold}>{driver.Driver.familyName}</Text>
        </Text>
        <Text style={styles.drTeam}>{driver.Constructors[0]?.name ?? '—'}</Text>
      </View>
      <View style={styles.drPtsWrap}>
        <Text style={styles.drPoints}>{driver.points}</Text>
        <Text style={styles.drPtsSuffix}>PTS</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── News Card ────────────────────────────────────────────────────
function NewsCard({ item }: { item: NewsItem }) {
  const dateLabel = item.pubDate
    ? new Date(item.pubDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })
    : '';
  return (
    <View style={styles.newsCard}>
      <View style={styles.newsAccent} />
      <Text style={styles.newsTitle} numberOfLines={4}>{item.title}</Text>
      <Text style={styles.newsMeta}>{dateLabel}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f2f2f2' },
  loader: { flex: 1, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#f2f2f2',
  },
  wordmark: {
    fontSize: 52,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -2,
    lineHeight: 54,
  },

  // Next Race Card
  nextRaceCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  nextRaceTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  nextRaceLeft: {
    flex: 1,
  },
  nextRaceEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E10600',
    letterSpacing: 2,
    marginBottom: 10,
  },
  nextRaceName: {
    fontSize: 28,
    fontWeight: '300',
    color: '#111111',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  nextRaceNameBold: {
    fontWeight: '900',
  },
  nextRaceGP: {
    fontSize: 13,
    fontWeight: '300',
    color: '#999999',
    marginTop: 2,
    marginBottom: 10,
  },
  nextRaceCircuit: {
    fontSize: 11,
    color: '#aaaaaa',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  nextRaceDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
  },

  // Circuit image box
  circuitBox: {
    width: 130,
    height: 130,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  circuitBoxEmpty: {
    backgroundColor: '#e8e8e8',
  },
  circuitImage: {
    width: '100%',
    height: '100%',
  },

  // Countdown
  cdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cdUnit: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 10,
  },
  cdValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.5,
  },
  cdLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: '#aaaaaa',
    letterSpacing: 1.5,
    marginTop: 3,
  },
  cdSep: {
    fontSize: 18,
    fontWeight: '300',
    color: '#cccccc',
    marginBottom: 8,
  },

  // Driver leader card — stays dark so the no-bg photo reads well
  driverLeaderCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    height: 190,
    backgroundColor: '#111111',
    borderRadius: 24,
    overflow: 'hidden',
  },
  leaderGlow: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.2,
  },
  leaderPhoto: {
    position: 'absolute',
    right: -25,
    bottom: -35,
    width: 230,
    height: 255,
  },
  leaderContent: {
    position: 'absolute',
    left: 20,
    top: 20,
    bottom: 20,
    justifyContent: 'space-between',
  },
  leaderEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },
  leaderGiven: {
    fontSize: 13,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  leaderFamily: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 34,
  },
  leaderStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  leaderStat: {
    alignItems: 'center',
    minWidth: 48,
  },
  leaderStatVal: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  leaderStatLbl: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    marginTop: 2,
  },
  leaderStatDiv: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 8,
  },

  // Constructor leader card
  constrCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    height: 110,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  constrBar: {
    width: 4,
    height: '60%',
    borderRadius: 2,
    marginLeft: 20,
    marginRight: 16,
    flexShrink: 0,
  },
  constrInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  constrEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: '#aaaaaa',
    letterSpacing: 2,
    marginBottom: 4,
  },
  constrName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
  },
  constrPtsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  constrPts: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
  },
  constrPtsLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#aaaaaa',
  },
  constrCar: {
    position: 'absolute',
    left: 160,
    bottom: -5,
    width: 360,
    height: 100,
  },

  // Section wrapper
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: '#111111',
    letterSpacing: -0.3,
  },
  sectionBold: {
    fontWeight: '800',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E10600',
  },

  // Driver standings list
  standingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  driverRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drRank: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cccccc',
    width: 22,
    textAlign: 'center',
    marginRight: 8,
  },
  drTeamBar: {
    width: 3,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  drInfo: { flex: 1 },
  drName: {
    fontSize: 13,
    fontWeight: '300',
    color: '#111111',
  },
  drNameBold: { fontWeight: '700' },
  drTeam: {
    fontSize: 10,
    color: '#aaaaaa',
    marginTop: 2,
  },
  drPtsWrap: {
    alignItems: 'flex-end',
  },
  drPoints: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -0.5,
  },
  drPtsSuffix: {
    fontSize: 9,
    fontWeight: '700',
    color: '#bbbbbb',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // News horizontal scroll
  newsScroll: {
    gap: 10,
    paddingRight: 4,
  },
  newsCard: {
    width: 200,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
  },
  newsAccent: {
    width: 24,
    height: 3,
    backgroundColor: '#E10600',
    borderRadius: 2,
    marginBottom: 10,
  },
  newsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    lineHeight: 18,
    flex: 1,
  },
  newsMeta: {
    fontSize: 10,
    color: '#aaaaaa',
    marginTop: 10,
    letterSpacing: 0.3,
  },
});
