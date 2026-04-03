import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet,
  TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSeason } from '../../lib/SeasonContext';
import {
  getSeasonRaces, getFullRaceResults, formatRaceDateTimeLocal,
} from '../../lib/api';
import { getConstructorAssets } from '../../lib/constructorAssets';
import {
  getMeetings, findMeeting, getMeetingSessions,
  getSessionWeather, getSessionStints, getSessionHighlights, getSessionDrivers,
  TYRE_COLORS, OpenF1Stint, OpenF1Driver,
} from '../../lib/openf1';

// ─── Circuit image map ────────────────────────────────────────────
const CIRCUIT_IMAGES: Record<string, any> = {
  bahrain:        require('../../assets/images/circuit/bahrain_gp_image.jpg'),
  jeddah:         require('../../assets/images/circuit/saudi_arabia_gp_image.jpg'),
  albert_park:    require('../../assets/images/circuit/australia_gp_image.jpg'),
  suzuka:         require('../../assets/images/circuit/japan_gp_image.jpg'),
  shanghai:       require('../../assets/images/circuit/china_gp_image.jpg'),
  miami:          require('../../assets/images/circuit/miami_gp_image.jpg'),
  imola:          require('../../assets/images/circuit/emilia_romagna_gp_image.jpg'),
  monaco:         require('../../assets/images/circuit/monaco_gp_image.jpg'),
  villeneuve:     require('../../assets/images/circuit/canada_gp_image.jpg'),
  catalunya:      require('../../assets/images/circuit/spain_gp_image.jpg'),
  red_bull_ring:  require('../../assets/images/circuit/austria_gp_image.jpg'),
  silverstone:    require('../../assets/images/circuit/british_gp_image.jpg'),
  hungaroring:    require('../../assets/images/circuit/hungary_gp_image.jpg'),
  spa:            require('../../assets/images/circuit/belgium_gp_image.jpg'),
  zandvoort:      require('../../assets/images/circuit/netherlands_gp_image.jpg'),
  monza:          require('../../assets/images/circuit/italy_gp_image.jpg'),
  baku:           require('../../assets/images/circuit/azerbaijan_gp_image.jpg'),
  marina_bay:     require('../../assets/images/circuit/singapore_gp_image.jpg'),
  americas:       require('../../assets/images/circuit/usa_gp_image.jpg'),
  rodriguez:      require('../../assets/images/circuit/mexico_gp_image.jpg'),
  interlagos:     require('../../assets/images/circuit/brazil_gp_image.jpg'),
  vegas:          require('../../assets/images/circuit/las_vegas_gp_image.jpg'),
  losail:         require('../../assets/images/circuit/qatar_gp_image.jpg'),
  yas_marina:     require('../../assets/images/circuit/abu_dhabi_gp_image.jpg'),
};

// ─── Driver number → FIA 3-letter code fallback ───────────────────
// Used when OpenF1 /drivers doesn't return data for a session.
// OpenF1's name_acronym field is the same as these codes when available.
const DRIVER_CODES: Record<number, string> = {
  1: 'VER', 4: 'NOR', 16: 'LEC', 81: 'PIA', 44: 'HAM', 63: 'RUS',
  55: 'SAI', 14: 'ALO', 18: 'STR', 10: 'GAS', 22: 'TSU', 23: 'ALB',
  27: 'HUL', 31: 'OCO', 87: 'BEA', 5: 'BOR', 30: 'LAW', 7: 'DOO',
  6: 'HAD', 43: 'COL', 12: 'ANT',
};

/** "Hülkenberg" → "HUL", strips diacritics before slicing */
function familyNameCode(familyName: string): string {
  return familyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 3)
    .toUpperCase();
}

// ─── Helpers ──────────────────────────────────────────────────────

function isCompleted(dateStr: string) {
  return new Date(dateStr) < new Date();
}

function isThisWeekend(dateStr: string) {
  const race = new Date(dateStr);
  const now = new Date();
  const diff = (race.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= -2 && diff <= 4;
}

function windDirLabel(deg: number) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ─── Subcomponents ───────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const words = label.split(' ');
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionLight}>{words.slice(0, -1).join(' ')} </Text>
      <Text style={s.sectionBold}>{words[words.length - 1]}</Text>
    </View>
  );
}

function StatusBadge({ date }: { date: string }) {
  let label = 'Upcoming';
  let bg = '#e8e8e8';
  let color = '#666';

  if (isCompleted(date)) {
    label = 'Completed'; bg = '#111'; color = '#fff';
  } else if (isThisWeekend(date)) {
    label = 'Race Weekend'; bg = '#E10600'; color = '#fff';
  }

  return (
    <View style={[s.statusBadge, { backgroundColor: bg }]}>
      <Text style={[s.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function SessionRow({ name, date, time }: { name: string; date?: string; time?: string }) {
  if (!date) return null;
  const { dateStr, timeStr } = formatRaceDateTimeLocal(date, time);
  const past = isCompleted(date);
  return (
    <View style={s.sessionRow}>
      <Text style={[s.sessionName, past && s.dimText]}>{name}</Text>
      <View style={s.sessionRight}>
        <Text style={[s.sessionDate, past && s.dimText]}>{dateStr}</Text>
        {timeStr ? <Text style={[s.sessionTime, past && s.dimText]}>{timeStr}</Text> : null}
      </View>
    </View>
  );
}

function WeatherCard({ sessionKey }: { sessionKey: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['openf1-weather', sessionKey],
    queryFn: () => getSessionWeather(sessionKey),
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading) return <View style={s.card}><ActivityIndicator color="#111" /></View>;
  if (!data) return null;

  const isWet = data.rainfall > 0;

  return (
    <View style={s.weatherCard}>
      <View style={s.weatherRow}>
        <WeatherStat icon="thermometer" label="Track" value={`${Math.round(data.track_temperature)}°C`} />
        <WeatherStat icon="thermometer-outline" label="Air" value={`${Math.round(data.air_temperature)}°C`} />
        <WeatherStat icon="water" label="Humidity" value={`${Math.round(data.humidity)}%`} />
        <WeatherStat
          icon={isWet ? 'rainy' : 'sunny'}
          label={isWet ? 'Wet' : 'Dry'}
          value={`${data.wind_speed.toFixed(1)} m/s`}
          sub={windDirLabel(data.wind_direction)}
        />
      </View>
    </View>
  );
}

function WeatherStat({ icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <View style={s.weatherStat}>
      <Ionicons name={icon} size={18} color="#111" />
      <Text style={s.weatherValue}>{value}</Text>
      {sub ? <Text style={s.weatherSub}>{sub}</Text> : null}
      <Text style={s.weatherLabel}>{label}</Text>
    </View>
  );
}

// finishInitials: 2-letter initials sorted P1→P20 (from Ergast results), used to order rows
function TyreStrategyCard({ sessionKey, finishInitials }: { sessionKey: number; finishInitials: string[] }) {
  const { data: stints, isLoading: loadingStints } = useQuery({
    queryKey: ['openf1-stints', sessionKey],
    queryFn: () => getSessionStints(sessionKey),
    staleTime: 1000 * 60 * 30,
  });
  const { data: drivers } = useQuery({
    queryKey: ['openf1-drivers', sessionKey],
    queryFn: () => getSessionDrivers(sessionKey),
    staleTime: 1000 * 60 * 30,
  });

  if (loadingStints) return <View style={s.card}><ActivityIndicator color="#111" /></View>;
  if (!stints || stints.length === 0) {
    return (
      <View style={s.card}>
        <Text style={s.emptyText}>Strategy data not yet available for this race.</Text>
      </View>
    );
  }

  // Primary: OpenF1 name_acronym (e.g. "NOR", "PIA") — already the FIA 3-letter code
  const driverMap: Record<number, string> = {};
  drivers?.forEach(d => {
    driverMap[d.driver_number] = d.name_acronym;
  });

  // Group stints by driver_number
  const byDriver: Record<number, OpenF1Stint[]> = {};
  stints.forEach(st => {
    if (!byDriver[st.driver_number]) byDriver[st.driver_number] = [];
    byDriver[st.driver_number].push(st);
  });

  const totalLaps = Math.max(...stints.map(s => s.lap_end));

  // Sort driver numbers by race finish position using initials as the bridge key
  const allNums = Object.keys(byDriver).map(Number);
  const labelOf = (n: number) => driverMap[n] ?? DRIVER_CODES[n] ?? `${n}`;
  const ordered = finishInitials.length > 0
    ? [
        ...finishInitials
          .map(ini => allNums.find(n => labelOf(n) === ini))
          .filter((n): n is number => n !== undefined),
        ...allNums.filter(n => !finishInitials.includes(labelOf(n))),
      ]
    : allNums;

  return (
    <View style={s.card}>
      {/* Legend */}
      <View style={s.tyreLegend}>
        {Object.entries(TYRE_COLORS).map(([compound, color]) => (
          <View key={compound} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: color, borderWidth: color === '#FFFFFF' ? 1 : 0, borderColor: '#ccc' }]} />
            <Text style={s.legendText}>{compound[0]}</Text>
          </View>
        ))}
      </View>

      {ordered.map(num => {
        const driverStints = byDriver[num].sort((a, b) => a.stint_number - b.stint_number);
        const label = labelOf(num);
        return (
          <View key={num} style={s.strategyRow}>
            <Text style={s.strategyDriver}>{label}</Text>
            <View style={s.strategyBar}>
              {driverStints.map((st, i) => {
                const laps = st.lap_end - st.lap_start + 1;
                const width = `${(laps / totalLaps) * 100}%` as any;
                const color = TYRE_COLORS[st.compound] ?? '#888';
                return (
                  <View
                    key={i}
                    style={[s.stintBlock, {
                      width,
                      backgroundColor: color,
                      borderWidth: color === '#FFFFFF' ? 1 : 0,
                      borderColor: '#ccc',
                    }]}
                  >
                    <Text style={[s.stintLaps, { color: color === '#FFFFFF' || color === '#FFF200' ? '#111' : '#fff' }]}>
                      {laps}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RaceControlCard({ sessionKey }: { sessionKey: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['openf1-highlights', sessionKey],
    queryFn: () => getSessionHighlights(sessionKey),
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading) return <View style={s.card}><ActivityIndicator color="#111" /></View>;

  const FLAG_COLORS: Record<string, string> = {
    RED: '#E10600',
    YELLOW: '#FFF200',
    DOUBLE_YELLOW: '#FFF200',
    GREEN: '#39B54A',
    SAFETY_CAR: '#FFF200',
  };

  if (!data || data.length === 0) {
    return (
      <View style={s.card}>
        <Text style={s.emptyText}>No notable incidents in this race.</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {data.map((event, i) => {
        const accent = event.flag ? (FLAG_COLORS[event.flag] ?? '#888') : '#E10600';
        return (
          <View key={i} style={[s.rcRow, i < data.length - 1 && s.rcRowBorder]}>
            <View style={[s.rcAccent, { backgroundColor: accent }]} />
            <View style={s.rcContent}>
              {event.lap_number != null && (
                <Text style={s.rcLap}>LAP {event.lap_number}</Text>
              )}
              <Text style={s.rcMessage}>{event.message}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ResultsCard({ data, isLoading }: { data: import('../lib/api').DriverResult[]; isLoading: boolean }) {
  if (isLoading) return <View style={s.card}><ActivityIndicator color="#111" /></View>;
  if (!data || data.length === 0) return null;

  return (
    <View style={s.card}>
      {data.slice(0, 10).map((r, i) => {
        const { color: teamColor } = getConstructorAssets(r.constructorId);
        const isFinished = r.status === 'Finished' || r.time != null;
        return (
          <View key={r.driverId} style={[s.resultRow, i < 9 && s.resultRowBorder]}>
            <Text style={[s.resultPos, i < 3 && s.resultPosTop]}>{r.position}</Text>
            <View style={[s.resultAccent, { backgroundColor: teamColor }]} />
            <View style={s.resultInfo}>
              <Text style={s.resultName}>{r.familyName}</Text>
              <Text style={s.resultTeam}>{r.constructorName}</Text>
            </View>
            <View style={s.resultRight}>
              <Text style={s.resultTime} numberOfLines={1}>
                {r.time ?? (isFinished ? 'Finished' : r.status)}
              </Text>
              <Text style={s.resultPts}>{r.points} PTS</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────

export default function RaceDetailScreen() {
  const { raceId } = useLocalSearchParams<{ raceId: string }>();
  const { season } = useSeason();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fetch season races (already cached if user came from races list)
  const { data: races } = useQuery({
    queryKey: ['races', season],
    queryFn: () => getSeasonRaces(season),
    staleTime: 1000 * 60 * 5,
  });

  const race = races?.find(r => r.round === raceId);

  // Fetch OpenF1 meetings for this year (to find session keys)
  const { data: meetings } = useQuery({
    queryKey: ['openf1-meetings', season],
    queryFn: () => getMeetings(Number(season)),
    staleTime: 1000 * 60 * 60 * 24,
    enabled: !!race,
  });

  const meeting = useMemo(() => {
    if (!meetings || !race) return undefined;
    return findMeeting(meetings, race.Circuit.Location.locality);
  }, [meetings, race]);

  // Fetch all sessions for this meeting
  const { data: sessions } = useQuery({
    queryKey: ['openf1-sessions', meeting?.meeting_key],
    queryFn: () => getMeetingSessions(meeting!.meeting_key),
    staleTime: 1000 * 60 * 60,
    enabled: !!meeting,
  });

  const raceSession = sessions?.find(s => s.session_name === 'Race');
  const completed = race ? isCompleted(race.date) : false;
  const circuitImage = race ? CIRCUIT_IMAGES[race.Circuit.circuitId ?? ''] : null;

  // Hoist results query so both ResultsCard and TyreStrategyCard can use it
  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ['race-results-full', season, raceId],
    queryFn: () => getFullRaceResults(season, raceId),
    staleTime: 1000 * 60 * 60,
    enabled: completed,
  });

  // Ordered FIA codes (P1 first) derived from Ergast family names.
  // familyNameCode("Norris") → "NOR", "Verstappen" → "VER" — matches OpenF1 name_acronym exactly.
  const finishInitials: string[] = results?.map(r => familyNameCode(r.familyName)) ?? [];

  if (!race) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  const { dateStr: raceDateStr, timeStr: raceTimeStr } = formatRaceDateTimeLocal(race.date, race.time);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

      {/* ── Top bar: back ── */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      {/* ── Hero card: image + info side by side ── */}
      <View style={s.heroCard}>
        {/* Circuit image */}
        <View style={s.heroImageBox}>
          {circuitImage
            ? <Image source={circuitImage} style={s.heroImage} resizeMode="contain" />
            : <View style={[s.heroImage, { backgroundColor: '#ddd' }]} />}
        </View>

        {/* Details */}
        <View style={s.heroInfo}>
          <Text style={s.heroCircuit} numberOfLines={2}>{race.Circuit.circuitName}</Text>
          <Text style={s.heroTitle} numberOfLines={2} adjustsFontSizeToFit>{race.raceName}</Text>
          <Text style={s.heroDate}>{raceDateStr}{raceTimeStr ? `  ·  ${raceTimeStr}` : ''}</Text>
          <StatusBadge date={race.date} />
        </View>
      </View>

      <View style={s.body}>

        {/* ── Session schedule ── */}
        <SectionHeader label="Session Schedule" />
        <View style={s.card}>
          <SessionRow name="Practice 1"    date={race.FirstPractice?.date}      time={race.FirstPractice?.time} />
          <SessionRow name="Practice 2"    date={race.SecondPractice?.date}     time={race.SecondPractice?.time} />
          {race.SprintQualifying && (
            <SessionRow name="Sprint Qualifying" date={race.SprintQualifying.date} time={race.SprintQualifying.time} />
          )}
          {race.Sprint && (
            <SessionRow name="Sprint"      date={race.Sprint.date}              time={race.Sprint.time} />
          )}
          {!race.SprintQualifying && (
            <SessionRow name="Practice 3"  date={race.ThirdPractice?.date}      time={race.ThirdPractice?.time} />
          )}
          <SessionRow name="Qualifying"    date={race.Qualifying?.date}         time={race.Qualifying?.time} />
          <SessionRow name="Race"          date={race.date}                     time={race.time} />
        </View>

        {/* ── Race results (completed only) ── */}
        {completed && (
          <>
            <SectionHeader label="Race Results" />
            <ResultsCard data={results ?? []} isLoading={loadingResults} />
          </>
        )}

        {/* ── Weather (OpenF1 — race session) ── */}
        {raceSession && (
          <>
            <SectionHeader label={completed ? 'Race Conditions' : 'Latest Conditions'} />
            <WeatherCard sessionKey={raceSession.session_key} />
          </>
        )}

        {/* ── Tyre strategy (completed only) ── */}
        {completed && raceSession && (
          <>
            <SectionHeader label="Tyre Strategy" />
            <TyreStrategyCard sessionKey={raceSession.session_key} finishInitials={finishInitials} />
          </>
        )}

        {/* ── Race control highlights (completed only) ── */}
        {completed && raceSession && (
          <>
            <SectionHeader label="Race Incidents" />
            <RaceControlCard sessionKey={raceSession.session_key} />
          </>
        )}

        {/* OpenF1 attribution */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://openf1.org')}
          style={s.attribution}
        >
          <Text style={s.attributionText}>Live timing data via OpenF1</Text>
          <Ionicons name="open-outline" size={12} color="#aaa" />
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  roundBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roundText: { fontSize: 12, fontWeight: '800', color: '#111', letterSpacing: 0.5 },

  // Hero card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 28,
    backgroundColor: '#f7f7f7',
    borderRadius: 22,
    overflow: 'hidden',
    gap: 16,
    paddingRight: 16,
  },
  heroImageBox: {
    width: 130,
    height: 130,
    flexShrink: 0,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#ececec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: { width: '100%', height: '100%' },
  heroInfo: {
    flex: 1,
    paddingVertical: 14,
    gap: 4,
  },
  heroCircuit: { fontSize: 10, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#111', letterSpacing: -0.4, lineHeight: 20 },
  heroDate: { fontSize: 11, fontWeight: '500', color: '#888', marginTop: 2 },

  // Status badge
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Body
  body: { paddingHorizontal: 20, paddingTop: 28 },

  // Section headers
  sectionHeader: { flexDirection: 'row', marginBottom: 12, marginTop: 8 },
  sectionLight:  { fontSize: 18, fontWeight: '300', color: '#111' },
  sectionBold:   { fontSize: 18, fontWeight: '900', color: '#111' },

  // Generic card
  card: { backgroundColor: '#111', borderRadius: 20, overflow: 'hidden', marginBottom: 28, padding: 16 },

  // Session schedule
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  sessionName: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  sessionRight: { alignItems: 'flex-end' },
  sessionDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  sessionTime: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  dimText:     { opacity: 0.4 },

  // Weather
  weatherCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  weatherRow: { flexDirection: 'row', justifyContent: 'space-around' },
  weatherStat: { alignItems: 'center', gap: 4 },
  weatherValue: { fontSize: 16, fontWeight: '800', color: '#111' },
  weatherSub:   { fontSize: 10, fontWeight: '600', color: '#888' },
  weatherLabel: { fontSize: 10, fontWeight: '500', color: '#888' },

  // Tyre strategy
  tyreLegend: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  strategyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  strategyDriver: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', width: 30 },
  strategyBar: { flex: 1, flexDirection: 'row', height: 22, borderRadius: 4, overflow: 'hidden', gap: 1 },
  stintBlock: { borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  stintLaps: { fontSize: 9, fontWeight: '800' },

  // Race control
  rcRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  rcRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rcAccent: { width: 3, borderRadius: 2, flexShrink: 0 },
  rcContent: { flex: 1 },
  rcLap: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', marginBottom: 2, letterSpacing: 0.5 },
  rcMessage: { fontSize: 13, fontWeight: '500', color: '#fff' },

  // Results
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  resultRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  resultPos: { fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.2)', width: 24, textAlign: 'center' },
  resultPosTop: { color: 'rgba(255,255,255,0.8)' },
  resultAccent: { width: 3, height: 36, borderRadius: 2, flexShrink: 0 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  resultTeam: { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  resultRight: { alignItems: 'flex-end' },
  resultTime: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', maxWidth: 100 },
  resultPts: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', marginTop: 1 },

  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Attribution
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: -16,
    marginBottom: 8,
  },
  attributionText: { fontSize: 11, color: '#aaa' },
});
