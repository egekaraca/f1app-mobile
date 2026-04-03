import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, FlatList, Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateChampionshipPredictions } from '../../lib/predictions';
import type { NextRacePrediction, PodiumPick } from '../../lib/predictions';
import { getDriverStandings, getSeasonRaces, getRaceResults } from '../../lib/api';
import {
  getUserPicks, saveUserPick, updatePickResult,
  type UserPick, type PickResult,
} from '../../lib/storage';
import { useSeason, CURRENT_SEASON } from '../../lib/SeasonContext';

// ─── Design tokens ────────────────────────────────────────────────
const D = {
  bg:     '#ffffff',
  card:   '#111111',
  text:   '#ffffff',
  sub:    'rgba(255,255,255,0.45)',
  dark:   '#111111',
  mid:    '#888888',
  light:  '#f5f5f5',
  border: 'rgba(255,255,255,0.08)',
  green:  '#30D158',
  red:    '#FF453A',
  padH:   20,
} as const;

type SubTab = 'analysis' | 'mypicks';

// ─── Root screen ──────────────────────────────────────────────────
export default function PredictionsScreen() {
  const [subTab, setSubTab] = useState<SubTab>('analysis');
  const { season } = useSeason();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Header + tab switcher — fixed above scroll */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.pageTitle}>Predict</Text>
        <View style={styles.tabRow}>
          {(['analysis', 'mypicks'] as SubTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSubTab(tab)}
              style={styles.tabBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, subTab === tab && styles.tabTextActive]}>
                {tab === 'analysis' ? 'Analysis' : 'My Picks'}
              </Text>
              {subTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {subTab === 'analysis' ? <AnalysisTab season={season} /> : <MyPicksTab />}
    </View>
  );
}

// ─── Analysis tab ─────────────────────────────────────────────────
function AnalysisTab({ season }: { season: string }) {
  const [driverTab, setDriverTab] = useState<'drivers' | 'constructors'>('drivers');

  const { data: predictions, isLoading, error } = useQuery({
    queryKey: ['predictions', season],
    queryFn: () => generateChampionshipPredictions(season),
    staleTime: 1000 * 60 * 15,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={D.dark} />
        <Text style={styles.centeredText}>Running Elo simulation…</Text>
      </View>
    );
  }

  if (error || !predictions) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={44} color="#ccc" />
        <Text style={styles.centeredText}>Analysis unavailable</Text>
      </View>
    );
  }

  const { racesCompleted, racesRemaining, seasonProgress, keyInsights } = predictions.seasonInsights;

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>

      {/* Season overview */}
      <View style={styles.card}>
        <SectionLabel light="Season" bold="Overview" />
        <View style={styles.statsRow}>
          <BigStat value={racesCompleted} label="Done" />
          <View style={styles.statDivider} />
          <BigStat value={racesRemaining} label="Left" />
          <View style={styles.statDivider} />
          <BigStat value={`${seasonProgress}%`} label="Progress" />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${seasonProgress}%` }]} />
        </View>
        {keyInsights.slice(0, 2).map((text, i) => (
          <View key={i} style={styles.insightRow}>
            <View style={styles.insightDot} />
            <Text style={styles.insightText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Next race prediction */}
      {predictions.nextRacePrediction && (
        <NextRaceCard prediction={predictions.nextRacePrediction} />
      )}

      {/* Drivers / Constructors toggle */}
      <View style={styles.toggleRow}>
        {(['drivers', 'constructors'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setDriverTab(tab)}
            style={styles.toggleBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, driverTab === tab && styles.toggleTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {driverTab === tab && <View style={styles.toggleUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Championship odds */}
      {driverTab === 'drivers'
        ? predictions.drivers.map((p, i) => (
            <PredictionCard
              key={p.driverId}
              rank={i + 1}
              firstName={p.driverName.split(' ')[0]}
              lastName={p.driverName.split(' ').slice(1).join(' ')}
              probability={p.championshipProbability}
              currentPoints={p.currentPoints}
              predictedFinish={p.predictedFinish}
              analysis={p.analysis}
              keyFactors={p.keyFactors}
            />
          ))
        : predictions.constructors.map((p, i) => {
            const words = p.constructorName.split(' ');
            return (
              <PredictionCard
                key={p.constructorId}
                rank={i + 1}
                firstName={words[0]}
                lastName={words.slice(1).join(' ') || words[0]}
                probability={p.championshipProbability}
                currentPoints={p.currentPoints}
                predictedFinish={p.predictedFinish}
                analysis={p.analysis}
                keyFactors={p.keyFactors}
              />
            );
          })
      }

      <MethodologyCard />
    </ScrollView>
  );
}

// ─── Next race card ────────────────────────────────────────────────
function NextRaceCard({ prediction }: { prediction: NextRacePrediction }) {
  const [expanded, setExpanded] = useState(false);
  const circuitTypeColor: Record<string, string> = {
    street:    '#FF8000',
    power:     D.green,
    technical: '#0A84FF',
    mixed:     '#BF5AF2',
  };
  const typeColor = circuitTypeColor[prediction.circuitType] ?? D.mid;

  const stripped = prediction.raceName.replace(' Grand Prix', '');
  const words = stripped.split(' ');
  const lastWord = words.pop() ?? '';
  const rest = words.join(' ');

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <SectionLabel light="Next" bold="Race" />
        <View style={[styles.typePill, { backgroundColor: typeColor + '22' }]}>
          <Text style={[styles.typePillText, { color: typeColor }]}>
            {prediction.circuitType.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.raceName}>
        {rest ? `${rest} ` : ''}<Text style={styles.raceNameBold}>{lastWord}</Text>
      </Text>
      <Text style={styles.raceSub}>{prediction.circuitName} · Grand Prix</Text>

      {/* Circuit traits */}
      <View style={styles.traitRow}>
        {prediction.circuitTraits.slice(0, 3).map((t, i) => (
          <View key={i} style={styles.traitPill}>
            <Text style={styles.traitText}>{t}</Text>
          </View>
        ))}
      </View>

      {/* Predicted podium */}
      <Text style={styles.podiumLabel}>PREDICTED PODIUM</Text>
      {prediction.podium.map(pick => (
        <PodiumRow key={pick.position} pick={pick} />
      ))}

      {/* Key factors (expandable) */}
      {prediction.keyFactors.length > 0 && (
        <TouchableOpacity onPress={() => setExpanded(v => !v)} style={styles.expandTrigger} activeOpacity={0.7}>
          <Text style={styles.expandLabel}>KEY FACTORS</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={D.sub} />
        </TouchableOpacity>
      )}
      {expanded && prediction.keyFactors.map((f, i) => (
        <View key={i} style={styles.insightRow}>
          <View style={styles.insightDot} />
          <Text style={styles.insightText}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

function PodiumRow({ pick }: { pick: PodiumPick }) {
  const pct = Math.round(pick.probability * 100);
  const badgeColors = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;
  const color = badgeColors[pick.position - 1];
  const nameParts = pick.driverName.split(' ');
  const lastName = nameParts.slice(-1)[0];
  const firstName = nameParts.slice(0, -1).join(' ');

  return (
    <View style={styles.podiumRow}>
      <View style={[styles.podiumBadge, { borderColor: color + '55' }]}>
        <Text style={[styles.podiumBadgeText, { color }]}>P{pick.position}</Text>
      </View>
      <View style={styles.podiumName}>
        <Text style={styles.podiumFirst}>{firstName}</Text>
        <Text style={styles.podiumLast}>{lastName}</Text>
      </View>
      <View style={[styles.pctPill, { backgroundColor: color + '20' }]}>
        <Text style={[styles.pctPillText, { color }]}>{pct}%</Text>
      </View>
    </View>
  );
}

// ─── Championship prediction card ─────────────────────────────────
type PredictionCardProps = {
  rank: number; firstName: string; lastName: string;
  probability: number; currentPoints: number;
  predictedFinish: number; analysis: string; keyFactors: string[];
};

function PredictionCard({ rank, firstName, lastName, probability, currentPoints, predictedFinish, analysis, keyFactors }: PredictionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(probability * 100);
  const barColor = pct > 40 ? D.green : pct > 15 ? 'rgba(255,255,255,0.55)' : D.red;

  return (
    <TouchableOpacity style={styles.predCard} onPress={() => setExpanded(v => !v)} activeOpacity={0.85}>
      {/* Probability bar across the top */}
      <View style={styles.probTrack}>
        <View style={[styles.probFill, { width: `${Math.max(pct, 1)}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.predRow}>
        <Text style={styles.predRank}>{rank}</Text>
        <View style={styles.predNameBlock}>
          <Text style={styles.predFirst}>{firstName}</Text>
          <Text style={styles.predLast}>{lastName}</Text>
        </View>
        <View style={styles.predRight}>
          <Text style={[styles.predPct, { color: barColor }]}>{pct}%</Text>
          <View style={styles.predPills}>
            <View style={styles.miniPill}><Text style={styles.miniPillText}>{currentPoints} PTS</Text></View>
            <View style={styles.miniPill}><Text style={styles.miniPillText}>P{predictedFinish} →</Text></View>
          </View>
        </View>
      </View>

      {expanded && (
        <View style={styles.expandedBody}>
          <View style={styles.expandDivider} />
          <Text style={styles.expandedText}>{analysis}</Text>
          {keyFactors.length > 0 && (
            <View style={styles.chipRow}>
              {keyFactors.map((f, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.chevronRow}>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color="rgba(255,255,255,0.2)" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Methodology (collapsed by default) ───────────────────────────
function MethodologyCard() {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded(v => !v)} activeOpacity={0.85}>
      <View style={styles.cardTopRow}>
        <SectionLabel light="How we" bold="Predict" />
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={D.sub} />
      </View>
      {expanded && [
        'Multi-season Elo ratings from pairwise race head-to-heads',
        '2,000 Monte Carlo season simulations per prediction',
        'Circuit-specific form: wins, podiums, recency-weighted',
        'Constructor heritage & power unit quality factors',
        'News sentiment analysis (last 7 days)',
      ].map((item, i) => (
        <View key={i} style={styles.insightRow}>
          <View style={styles.insightDot} />
          <Text style={styles.insightText}>{item}</Text>
        </View>
      ))}
    </TouchableOpacity>
  );
}

// ─── My Picks tab ─────────────────────────────────────────────────
function MyPicksTab() {
  const [picks, setPicks] = useState<UserPick[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loadingPicks, setLoadingPicks] = useState(true);
  const [histSeason, setHistSeason] = useState(CURRENT_SEASON);

  const { data: races } = useQuery({
    queryKey: ['races', CURRENT_SEASON],
    queryFn: () => getSeasonRaces(CURRENT_SEASON),
    staleTime: 1000 * 60 * 60,
  });

  const { data: drivers } = useQuery({
    queryKey: ['driver-standings', CURRENT_SEASON],
    queryFn: () => getDriverStandings(CURRENT_SEASON),
    staleTime: 1000 * 60 * 5,
  });

  const now = new Date();
  const nextRace = races
    ?.filter(r => new Date(r.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const nextRaceRound = nextRace?.round ? Number(nextRace.round) : null;
  const nextRaceId = nextRace ? `${CURRENT_SEASON}-${nextRace.round}` : null;

  const loadAndScore = useCallback(async () => {
    setLoadingPicks(true);
    const stored = await getUserPicks();
    const toScore = stored.filter(p => !p.result && new Date(p.raceDate) < now);
    for (const pick of toScore) {
      const podium = await getRaceResults(pick.season, pick.round);
      if (!podium) continue;
      const result: PickResult = {
        actualP1Id: podium.p1.driverId,
        actualP2Id: podium.p2.driverId,
        actualP3Id: podium.p3.driverId,
        p1Correct: pick.p1DriverId === podium.p1.driverId,
        p2Correct: !!pick.p2DriverId && pick.p2DriverId === podium.p2.driverId,
        p3Correct: !!pick.p3DriverId && pick.p3DriverId === podium.p3.driverId,
        score:
          (pick.p1DriverId === podium.p1.driverId ? 3 : 0) +
          (pick.p2DriverId === podium.p2.driverId ? 2 : 0) +
          (pick.p3DriverId === podium.p3.driverId ? 1 : 0),
      };
      await updatePickResult(pick.raceId, result);
      const idx = stored.findIndex(p => p.raceId === pick.raceId);
      if (idx >= 0) stored[idx].result = result;
    }
    setPicks(stored);
    setLoadingPicks(false);
  }, []);

  useEffect(() => { loadAndScore(); }, [loadAndScore]);

  const handleSubmitPick = async (p1Id: string, p1Name: string, p2Id?: string, p2Name?: string, p3Id?: string, p3Name?: string) => {
    if (!nextRace || !nextRaceId || nextRaceRound === null) return;
    const pick: UserPick = {
      raceId: nextRaceId,
      raceName: nextRace.raceName,
      raceDate: nextRace.date,
      round: nextRaceRound,
      season: CURRENT_SEASON,
      p1DriverId: p1Id,
      p1Name,
      p2DriverId: p2Id,
      p2Name,
      p3DriverId: p3Id,
      p3Name,
      submittedAt: new Date().toISOString(),
    };
    await saveUserPick(pick);
    setShowPicker(false);
    loadAndScore();
  };

  const currentSeasonPicks = picks.filter(p => p.season === CURRENT_SEASON);
  const hasPick    = nextRaceId ? currentSeasonPicks.some(p => p.raceId === nextRaceId) : false;
  const existingPick = nextRaceId ? currentSeasonPicks.find(p => p.raceId === nextRaceId) : null;
  const pastPicks  = picks.filter(p => p.season === histSeason && p.raceId !== nextRaceId);
  const totalScore = pastPicks.reduce((sum, p) => sum + (p.result?.score ?? 0), 0);
  const maxPossible = pastPicks.filter(p => p.result).length * 6;
  const pickedSeasons = [...new Set(picks.map(p => p.season))].sort().reverse();

  if (loadingPicks) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={D.dark} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>

      {/* Season score */}
      {pastPicks.some(p => p.result) && (
        <View style={styles.card}>
          <SectionLabel light="Season" bold="Score" />
          <View style={styles.statsRow}>
            <BigStat value={totalScore} label="Points" />
            <View style={styles.statDivider} />
            <BigStat value={maxPossible} label="Possible" />
            <View style={styles.statDivider} />
            <BigStat
              value={maxPossible > 0 ? `${Math.round((totalScore / maxPossible) * 100)}%` : '–'}
              label="Accuracy"
            />
          </View>
        </View>
      )}

      {/* Next race pick */}
      {nextRace ? (
        <View style={styles.card}>
          <SectionLabel light="Next" bold="Race" />
          <Text style={styles.raceName}>
            {nextRace.raceName.replace(' Grand Prix', '')}
          </Text>
          <Text style={styles.raceSub}>
            {nextRace.Circuit.Location.country} · {new Date(nextRace.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </Text>

          {hasPick && existingPick ? (
            <View style={styles.lockedPick}>
              {[
                { label: 'P1', name: existingPick.p1Name },
                existingPick.p2Name ? { label: 'P2', name: existingPick.p2Name } : null,
                existingPick.p3Name ? { label: 'P3', name: existingPick.p3Name } : null,
              ].filter(Boolean).map(row => (
                <View key={row!.label} style={styles.lockedRow}>
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedBadgeText}>{row!.label}</Text>
                  </View>
                  <Text style={styles.lockedName}>{row!.name}</Text>
                </View>
              ))}
              <View style={styles.lockTag}>
                <Ionicons name="lock-closed" size={10} color={D.sub} />
                <Text style={styles.lockTagText}>Pick locked in</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.pickBtn} onPress={() => setShowPicker(true)} activeOpacity={0.85}>
              <Ionicons name="trophy-outline" size={16} color={D.dark} />
              <Text style={styles.pickBtnText}>Make your pick</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 28 }]}>
          <Text style={styles.emptyText}>No upcoming races</Text>
        </View>
      )}

      {/* Pick history */}
      {picks.length > 0 && (
        <>
          <View style={styles.histHeader}>
            <SectionLabel light="Pick" bold="History" />
            {pickedSeasons.length > 1 && (
              <View style={styles.seasonToggleRow}>
                {pickedSeasons.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.seasonPill, histSeason === s && styles.seasonPillActive]}
                    onPress={() => setHistSeason(s)}
                  >
                    <Text style={[styles.seasonPillText, histSeason === s && styles.seasonPillTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {pastPicks.length > 0
            ? pastPicks.map(pick => <PastPickCard key={pick.raceId} pick={pick} />)
            : (
              <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
                <Text style={styles.emptyText}>No picks for {histSeason} yet.</Text>
              </View>
            )
          }
        </>
      )}

      {picks.length === 0 && (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 36 }]}>
          <Ionicons name="trophy-outline" size={40} color="rgba(255,255,255,0.12)" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>No picks yet</Text>
          <Text style={[styles.insightText, { textAlign: 'center', marginTop: 6 }]}>
            Predict the podium for each race and score points
          </Text>
        </View>
      )}

      {showPicker && drivers && nextRace && (
        <DriverPickerModal
          raceName={nextRace.raceName}
          drivers={drivers}
          onSubmit={handleSubmitPick}
          onClose={() => setShowPicker(false)}
        />
      )}
    </ScrollView>
  );
}

// ─── Past pick card ────────────────────────────────────────────────
function PastPickCard({ pick }: { pick: UserPick }) {
  const r = pick.result;
  return (
    <View style={styles.card}>
      <View style={styles.pastPickTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.predLast}>{pick.raceName.replace(' Grand Prix', '')}</Text>
          <Text style={styles.raceSub}>
            {new Date(pick.raceDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        {r ? (
          <View style={[styles.scorePill, { backgroundColor: r.score > 0 ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.12)' }]}>
            <Text style={[styles.scoreText, { color: r.score > 0 ? D.green : D.red }]}>{r.score} / 6</Text>
          </View>
        ) : (
          <View style={[styles.scorePill, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
            <Text style={[styles.scoreText, { color: D.sub }]}>Pending</Text>
          </View>
        )}
      </View>
      <View style={{ gap: 8, marginTop: 14 }}>
        <PickRow label="P1" name={pick.p1Name} correct={r?.p1Correct} pending={!r} />
        {pick.p2Name && <PickRow label="P2" name={pick.p2Name} correct={r?.p2Correct} pending={!r} />}
        {pick.p3Name && <PickRow label="P3" name={pick.p3Name} correct={r?.p3Correct} pending={!r} />}
      </View>
    </View>
  );
}

function PickRow({ label, name, correct, pending }: { label: string; name: string; correct?: boolean; pending: boolean }) {
  return (
    <View style={styles.pickRow}>
      <View style={styles.lockedBadge}><Text style={styles.lockedBadgeText}>{label}</Text></View>
      <Text style={styles.lockedName}>{name}</Text>
      {!pending && (
        <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={18} color={correct ? D.green : D.red} />
      )}
    </View>
  );
}

// ─── Driver picker modal ───────────────────────────────────────────
type DriverPickerProps = {
  raceName: string;
  drivers: import('../../types/standings').DriverStanding[];
  onSubmit: (p1Id: string, p1Name: string, p2Id?: string, p2Name?: string, p3Id?: string, p3Name?: string) => void;
  onClose: () => void;
};

function DriverPickerModal({ raceName, drivers, onSubmit, onClose }: DriverPickerProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [p1, setP1] = useState<{ id: string; name: string } | null>(null);
  const [p2, setP2] = useState<{ id: string; name: string } | null>(null);
  const [p3, setP3] = useState<{ id: string; name: string } | null>(null);

  const stepLabel = step === 1 ? 'Pick the winner' : step === 2 ? 'Pick P2' : 'Pick P3';
  const already   = [p1?.id, p2?.id, p3?.id].filter(Boolean);

  const handleSelect = (id: string, name: string) => {
    if (step === 1) { setP1({ id, name }); setStep(2); }
    else if (step === 2) { setP2({ id, name }); setStep(3); }
    else { setP3({ id, name }); }
  };

  return (
    <Modal visible animationType="slide" transparent presentationStyle="overFullScreen">
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetRace}>{raceName.replace(' Grand Prix', '')} GP</Text>
            <Text style={styles.sheetStep}>{stepLabel}</Text>
          </View>
          {/* Step indicators */}
          <View style={styles.stepIndicators}>
            {([1, 2, 3] as const).map(s => (
              <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>
                  {step > s ? '✓' : `P${s}`}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selections so far */}
        {(p1 || p2 || p3) && (
          <View style={styles.selectionRow}>
            {p1 && <View style={styles.selChip}><Text style={styles.selChipText}>P1 · {p1.name.split(' ').slice(-1)[0]}</Text></View>}
            {p2 && <View style={styles.selChip}><Text style={styles.selChipText}>P2 · {p2.name.split(' ').slice(-1)[0]}</Text></View>}
            {p3 && <View style={styles.selChip}><Text style={styles.selChipText}>P3 · {p3.name.split(' ').slice(-1)[0]}</Text></View>}
          </View>
        )}

        <FlatList
          data={drivers.filter(d => !already.includes(d.Driver.driverId))}
          keyExtractor={d => d.Driver.driverId}
          style={styles.driverList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pickerDriverRow}
              onPress={() => handleSelect(item.Driver.driverId, `${item.Driver.givenName} ${item.Driver.familyName}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerPos}>{item.position}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerFirst}>{item.Driver.givenName}</Text>
                <Text style={styles.pickerLast}>{item.Driver.familyName}</Text>
              </View>
              <Text style={styles.pickerPts}>{item.points} pts</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f0f0f0' }} />}
        />

        {step === 3 && p3 && (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => onSubmit(p1!.id, p1!.name, p2?.id, p2?.name, p3.id, p3.name)}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Lock in picks</Text>
            <Ionicons name="lock-closed" size={14} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
        {step === 3 && !p3 && (
          <TouchableOpacity
            style={styles.submitBtnAlt}
            onPress={() => onSubmit(p1!.id, p1!.name, p2?.id, p2?.name)}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnAltText}>Skip P3 and lock in</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

// ─── Shared components ─────────────────────────────────────────────
function SectionLabel({ light, bold }: { light: string; bold: string }) {
  return (
    <Text style={styles.sectionLabel}>
      {light} <Text style={styles.sectionBold}>{bold}</Text>
    </Text>
  );
}

function BigStat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.bigStat}>
      <Text style={styles.bigStatValue}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

  // Fixed header
  header: {
    paddingHorizontal: D.padH,
    paddingBottom: 0,
    backgroundColor: D.bg,
  },
  pageTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: D.dark,
    letterSpacing: -2,
    marginBottom: 16,
  },

  // Main tabs (Analysis | My Picks)
  tabRow: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  tabBtn: { paddingBottom: 12, position: 'relative' },
  tabText: { fontSize: 15, fontWeight: '500', color: D.mid },
  tabTextActive: { fontWeight: '800', color: D.dark },
  tabUnderline: {
    position: 'absolute', bottom: -1, left: 0, right: 0,
    height: 2, backgroundColor: D.dark, borderRadius: 1,
  },

  // Scroll content
  tabContent: { paddingHorizontal: D.padH, paddingTop: 24, paddingBottom: 120 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: D.bg },
  centeredText: { fontSize: 14, color: D.mid, fontWeight: '500' },

  // Cards
  card: { backgroundColor: D.card, borderRadius: 20, padding: 20, marginBottom: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Section labels
  sectionLabel: { fontSize: 20, fontWeight: '300', color: D.text, marginBottom: 16, letterSpacing: -0.3 },
  sectionBold:  { fontWeight: '800' },

  // Stats row
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bigStat: { flex: 1, alignItems: 'center' },
  bigStatValue: { fontSize: 30, fontWeight: '900', color: D.text, letterSpacing: -0.5 },
  bigStatLabel: { fontSize: 10, fontWeight: '600', color: D.sub, letterSpacing: 1.5, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: D.border },

  // Progress bar
  progressTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1, marginBottom: 16, overflow: 'hidden' },
  progressFill:  { height: 2, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 1 },

  // Insight rows
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  insightDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 8, flexShrink: 0 },
  insightText: { flex: 1, fontSize: 12, color: D.sub, lineHeight: 18 },

  // Drivers/Constructors toggle inside Analysis
  toggleRow: { flexDirection: 'row', gap: 20, marginBottom: 14, paddingHorizontal: 2 },
  toggleBtn:  { paddingBottom: 8, position: 'relative' },
  toggleText: { fontSize: 14, fontWeight: '500', color: D.mid },
  toggleTextActive: { fontWeight: '800', color: D.dark },
  toggleUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, backgroundColor: D.dark, borderRadius: 1,
  },

  // Next race
  raceName:     { fontSize: 24, fontWeight: '300', color: D.text, letterSpacing: -0.5, marginBottom: 2 },
  raceNameBold: { fontWeight: '800' },
  raceSub:      { fontSize: 12, color: D.sub, marginBottom: 16 },
  typePill:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  typePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  traitRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 },
  traitPill:    { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  traitText:    { fontSize: 10, fontWeight: '600', color: D.sub },
  podiumLabel:  { fontSize: 9, fontWeight: '700', color: D.sub, letterSpacing: 2, marginBottom: 12 },
  podiumRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  podiumBadge:  {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  podiumBadgeText: { fontSize: 10, fontWeight: '900' },
  podiumName:   { flex: 1 },
  podiumFirst:  { fontSize: 10, fontWeight: '300', color: D.sub },
  podiumLast:   { fontSize: 15, fontWeight: '800', color: D.text },
  pctPill:      { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  pctPillText:  { fontSize: 11, fontWeight: '800' },
  expandTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  expandLabel:  { fontSize: 9, fontWeight: '700', color: D.sub, letterSpacing: 2 },

  // Championship prediction cards
  predCard: { backgroundColor: D.card, borderRadius: 20, marginBottom: 10, overflow: 'hidden' },
  probTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.06)' },
  probFill:  { height: 2 },
  predRow:   { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  predRank:  { fontSize: 30, fontWeight: '900', color: 'rgba(255,255,255,0.1)', width: 32, textAlign: 'center' },
  predNameBlock: { flex: 1 },
  predFirst: { fontSize: 11, fontWeight: '300', color: D.sub },
  predLast:  { fontSize: 16, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  predRight: { alignItems: 'flex-end', gap: 6 },
  predPct:   { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  predPills: { flexDirection: 'row', gap: 6 },
  miniPill:  { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  miniPillText: { fontSize: 9, fontWeight: '700', color: D.sub },
  expandedBody: { paddingHorizontal: 18, paddingBottom: 12 },
  expandDivider: { height: 1, backgroundColor: D.border, marginBottom: 12 },
  expandedText: { fontSize: 13, color: D.sub, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip:    { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 10, fontWeight: '600', color: D.sub },
  chevronRow: { alignItems: 'center', paddingBottom: 10 },

  // My Picks — next race
  lockedPick: { marginTop: 16, gap: 10 },
  lockedRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockedBadge: {
    width: 34, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  lockedBadgeText: { fontSize: 10, fontWeight: '800', color: D.text },
  lockedName: { fontSize: 15, fontWeight: '700', color: D.text, flex: 1 },
  lockTag:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  lockTagText: { fontSize: 10, fontWeight: '600', color: D.sub },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 16,
    backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 14,
  },
  pickBtnText: { fontSize: 14, fontWeight: '800', color: D.dark },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Past pick card
  pastPickTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  scorePill:   { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  scoreText:   { fontSize: 13, fontWeight: '800' },

  // History
  histHeader: { marginBottom: 4 },
  seasonToggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  seasonPill: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20 },
  seasonPillActive: { backgroundColor: '#ffffff' },
  seasonPillText: { fontSize: 12, fontWeight: '600', color: D.sub },
  seasonPillTextActive: { color: D.dark },

  emptyText: { fontSize: 14, color: D.sub, fontWeight: '500' },

  // Driver picker modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: D.padH,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 20,
  },
  sheetTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  sheetRace: { fontSize: 20, fontWeight: '800', color: D.dark, letterSpacing: -0.5 },
  sheetStep: { fontSize: 13, color: D.mid, marginTop: 4 },
  stepIndicators: { flexDirection: 'row', gap: 6 },
  stepDot: {
    width: 34, height: 28, borderRadius: 8,
    backgroundColor: D.light,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: D.dark },
  stepDotText: { fontSize: 10, fontWeight: '800', color: D.mid },
  stepDotTextActive: { color: '#ffffff' },
  selectionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  selChip: { backgroundColor: D.dark, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  selChipText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  driverList: { flex: 1 },
  pickerDriverRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  pickerPos:   { fontSize: 18, fontWeight: '900', color: '#ccc', width: 28, textAlign: 'center' },
  pickerFirst: { fontSize: 11, fontWeight: '300', color: D.mid },
  pickerLast:  { fontSize: 15, fontWeight: '800', color: D.dark },
  pickerPts:   { fontSize: 13, fontWeight: '700', color: D.mid },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.dark, borderRadius: 16,
    paddingVertical: 16, marginVertical: 16,
  },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  submitBtnAlt:  { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginBottom: 16 },
  submitBtnAltText: { fontSize: 14, fontWeight: '600', color: D.mid },
});
