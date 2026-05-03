import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';

import { FantasyCardView, CARD_W, CARD_H } from '../../components/FantasyCard';
import {
  ALL_CARDS, CONTRACT_TIERS, getContractCost, getTerminationPenalty, getRacesRemaining,
  STARTING_BALANCE, RARITY_COLORS,
  type FantasyCard, type DriverCard, type ConstructorCard, type CardRarity,
  type Contract, type ContractTier, type DriverStats, type ConstructorStats,
} from '../../lib/fantasy';
import {
  getBalance, getActiveContractCards, getContracts, signContract, terminateContract,
  getLeaderboardScore,
  type ContractMap,
} from '../../lib/fantasyStorage';

// ─── Constants ────────────────────────────────────────────────────────────────

const BUDGET_CAP            = STARTING_BALANCE;
const MAX_DRIVER_SLOTS      = 5;
const MAX_CONSTRUCTOR_SLOTS = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCoins(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function LeagueFlag({ iso2 }: { iso2: string }) {
  return (
    <Image
      source={{ uri: `https://flagcdn.com/w40/${iso2}.png` }}
      style={{ width: 26, height: 18, borderRadius: 2 }}
      resizeMode="cover"
    />
  );
}

const RIVALS = [
  { name: 'SchumiFan99',   country: 'de', score: 4_820_000 },
  { name: 'SennaDiehard',  country: 'br', score: 4_210_000 },
  { name: 'MaxAttack33',   country: 'nl', score: 3_990_000 },
  { name: 'PitLanePro',    country: 'gb', score: 3_670_000 },
  { name: 'FerrariTifosi', country: 'it', score: 3_450_000 },
  { name: 'ApexHunter',    country: 'es', score: 2_980_000 },
  { name: 'DrsZone',       country: 'fr', score: 2_640_000 },
  { name: 'FastLapMike',   country: 'us', score: 2_310_000 },
  { name: 'GridQueen',     country: 'au', score: 1_990_000 },
  { name: 'PodiumChaser',  country: 'mx', score: 1_750_000 },
];

const RARITY_ORDER: CardRarity[] = ['legend', 'elite', 'gold', 'silver', 'bronze'];

const RARITY_GLOW: Record<CardRarity, string> = {
  legend: '#c8a000', elite: '#a080f0', gold: '#d4a017', silver: '#9aaab8', bronze: '#bf8050',
};

const RARITY_LABEL: Record<CardRarity, string> = {
  legend: '✦ LEGEND TIER', elite: 'ELITE TIER', gold: 'GOLD TIER', silver: 'SILVER TIER', bronze: 'BRONZE TIER',
};

const TIER_ACCENT: Record<ContractTier, string> = {
  short: '#9aaab8', mid: '#d4a017', long: '#a080f0',
};

const TAB_ICONS: Record<Tab, React.ComponentProps<typeof Ionicons>['name']> = {
  squad: 'shield', market: 'storefront', league: 'trophy',
};

const DRIVER_STAT_NAMES: Record<keyof DriverStats, string> = {
  pac: 'Pace', rac: 'Racecraft', con: 'Consistency',
  exp: 'Experience', def: 'Defence', atk: 'Attack',
};

const CONSTRUCTOR_STAT_NAMES: Record<keyof ConstructorStats, string> = {
  car: 'Car Performance', rel: 'Reliability', str: 'Strategy',
  pit: 'Pit Stops', dev: 'Development', bgt: 'Budget',
};

type Tab = 'squad' | 'market' | 'league';
type MarketFilter = 'all' | 'drivers' | 'constructors';

// ─── Card detail modal ────────────────────────────────────────────────────────

function CardDetailModal({ card, contract, balance, onSign, onTerminate, onClose }: {
  card: FantasyCard | null;
  contract: Contract | null;
  balance: number;
  onSign: () => void;
  onTerminate: () => void;
  onClose: () => void;
}) {
  if (!card) return null;

  const { accent, bg } = RARITY_COLORS[card.rarity];
  const glowColor      = RARITY_GLOW[card.rarity];
  const isDriver       = card.type === 'driver';
  const dCard          = card as DriverCard;
  const cCard          = card as ConstructorCard;

  const displayName    = isDriver ? `${dCard.firstName} ${dCard.lastName}` : cCard.name;
  const teamName       = isDriver ? dCard.teamName : cCard.name;
  const nationality    = card.nationality;
  const statEntries    = isDriver
    ? (Object.entries(dCard.stats) as [keyof DriverStats, number][])
    : (Object.entries(cCard.stats) as [keyof ConstructorStats, number][]);
  const statNames      = isDriver ? DRIVER_STAT_NAMES : CONSTRUCTOR_STAT_NAMES;

  const isContracted   = !!contract && contract.racesCompleted < contract.racesTotal;
  const remaining      = contract ? getRacesRemaining(contract) : 0;
  const progress       = contract ? contract.racesCompleted / contract.racesTotal : 0;
  const tierAccent     = contract ? TIER_ACCENT[contract.tier] : '#fff';
  const tierDef        = contract ? CONTRACT_TIERS.find(d => d.tier === contract.tier)! : null;
  const canAfford      = balance >= getContractCost(card.price, 'short');

  return (
    <Modal transparent animationType="slide" visible={!!card} onRequestClose={onClose}>
      <Pressable style={cd.backdrop} onPress={onClose}>
        <Pressable style={cd.sheet} onPress={e => e.stopPropagation()}>
          <View style={cd.handle} />

          {/* Top glow band */}
          <LinearGradient
            colors={[glowColor + '22', 'transparent']}
            style={cd.glowBand}
            pointerEvents="none"
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={cd.scrollContent}
          >
            {/* Rarity eyebrow */}
            <Text style={[cd.rarityEyebrow, { color: glowColor }]}>{RARITY_LABEL[card.rarity]}</Text>

            {/* Card with glow shadow */}
            <View style={cd.cardWrap}>
              <View style={[cd.cardGlow, {
                shadowColor: glowColor,
                shadowRadius: 28,
                shadowOpacity: 0.55,
                shadowOffset: { width: 0, height: 0 },
              }]}>
                <FantasyCardView card={card} />
              </View>
            </View>

            {/* Name + meta */}
            <Text style={cd.displayName}>{displayName.toUpperCase()}</Text>
            <View style={cd.metaRow}>
              <View style={[cd.teamChip, { borderColor: glowColor + '44', backgroundColor: glowColor + '12' }]}>
                <Text style={[cd.teamChipText, { color: glowColor }]}>{teamName}</Text>
              </View>
              <Text style={cd.nationality}>{nationality}</Text>
              <View style={[cd.ovrBadge, { borderColor: glowColor + '66' }]}>
                <Text style={[cd.ovrNum, { color: glowColor }]}>{card.overall}</Text>
                <Text style={[cd.ovrLabel, { color: glowColor + 'aa' }]}>OVR</Text>
              </View>
            </View>

            {/* Price row */}
            <View style={cd.priceRow}>
              <Ionicons name="wallet-outline" size={13} color="#d4a017" />
              <Text style={cd.price}>{formatCoins(card.price)}</Text>
              <Text style={cd.priceSub}>market value</Text>
            </View>

            {/* Divider */}
            <View style={[cd.divider, { backgroundColor: glowColor + '28' }]} />

            {/* Stats */}
            <Text style={cd.statsHeader}>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontWeight: '300' }}>Card </Text>
              <Text style={{ color: '#fff', fontWeight: '900' }}>Stats</Text>
            </Text>

            <View style={cd.statsGrid}>
              {statEntries.map(([key, value]) => (
                <View key={key} style={cd.statRow}>
                  <Text style={cd.statKey}>{(key as string).toUpperCase()}</Text>
                  <View style={cd.statBarTrack}>
                    <LinearGradient
                      colors={[accent, glowColor]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[cd.statBarFill, { width: `${value}%` as any }]}
                    />
                  </View>
                  <Text style={[cd.statValue, { color: accent }]}>{value}</Text>
                  <Text style={cd.statName}>{(statNames as any)[key]}</Text>
                </View>
              ))}
            </View>

            {/* Contract section */}
            {isContracted && tierDef && (
              <>
                <View style={[cd.divider, { backgroundColor: glowColor + '28' }]} />
                <Text style={cd.statsHeader}>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontWeight: '300' }}>Active </Text>
                  <Text style={{ color: '#fff', fontWeight: '900' }}>Contract</Text>
                </Text>
                <View style={[cd.contractCard, { borderColor: tierAccent + '44' }]}>
                  <LinearGradient
                    colors={[tierAccent + '12', 'transparent']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={cd.contractTop}>
                    <View style={[cd.contractBadge, { backgroundColor: tierAccent + '20', borderColor: tierAccent + '55' }]}>
                      <Text style={[cd.contractTier, { color: tierAccent }]}>{tierDef.label.toUpperCase()}</Text>
                    </View>
                    <Text style={cd.contractRaces}>{remaining} races remaining</Text>
                  </View>
                  <View style={cd.contractBarTrack}>
                    <View style={[cd.contractBarFill, { width: `${progress * 100}%` as any, backgroundColor: tierAccent }]} />
                  </View>
                  <View style={cd.contractMeta}>
                    <Text style={cd.contractMetaItem}>
                      <Text style={{ color: 'rgba(255,255,255,0.35)' }}>Multiplier </Text>
                      <Text style={{ color: tierAccent, fontWeight: '800' }}>{tierDef.multiplier}×</Text>
                    </Text>
                    <Text style={cd.contractMetaItem}>
                      <Text style={{ color: 'rgba(255,255,255,0.35)' }}>Penalty </Text>
                      <Text style={{ color: '#ff5555', fontWeight: '800' }}>
                        {formatCoins(getTerminationPenalty(contract!))}
                      </Text>
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Spacer for button */}
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Action button — sticky outside scroll */}
          {isContracted ? (
            <TouchableOpacity style={cd.actionBtnDestructive} onPress={onTerminate} activeOpacity={0.75}>
              <Ionicons name="close-circle-outline" size={16} color="#ff4444" />
              <Text style={cd.actionBtnDestructiveText}>
                Terminate · {formatCoins(getTerminationPenalty(contract!))}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[cd.actionBtn, !canAfford && cd.actionBtnDisabled, canAfford && { borderColor: glowColor }]}
              onPress={canAfford ? onSign : undefined}
              activeOpacity={canAfford ? 0.75 : 1}
            >
              <LinearGradient
                colors={canAfford ? [glowColor + '28', glowColor + '10'] : ['transparent', 'transparent']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={[cd.actionBtnText, canAfford ? { color: glowColor } : { color: 'rgba(255,255,255,0.25)' }]}>
                {canAfford ? `Sign Contract · ${formatCoins(getContractCost(card.price, 'short'))}+` : 'Not enough funds'}
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Contract signing modal ───────────────────────────────────────────────────

function ContractModal({ card, balance, onSign, onClose }: {
  card: FantasyCard | null;
  balance: number;
  onSign: (card: FantasyCard, tier: ContractTier) => void;
  onClose: () => void;
}) {
  if (!card) return null;
  const name = card.type === 'driver' ? (card as DriverCard).lastName : (card as any).name;

  return (
    <Modal transparent animationType="slide" visible={!!card} onRequestClose={onClose}>
      <Pressable style={cm.backdrop} onPress={onClose}>
        <Pressable style={cm.sheet} onPress={e => e.stopPropagation()}>
          <View style={cm.handle} />
          <Text style={cm.eyebrow}>SIGN CONTRACT</Text>
          <Text style={cm.subName}>{name.toUpperCase()}</Text>
          <View style={cm.balanceRow}>
            <Ionicons name="wallet-outline" size={12} color="#d4a017" />
            <Text style={cm.balance}>{formatCoins(balance)} available</Text>
          </View>

          <View style={cm.tiers}>
            {CONTRACT_TIERS.map(def => {
              const cost      = getContractCost(card.price, def.tier);
              const canAfford = balance >= cost;
              const accent    = TIER_ACCENT[def.tier];
              const isRec     = def.tier === 'mid';
              return (
                <View key={def.tier} style={[cm.tierCard, { borderColor: isRec ? accent : accent + '40' }, isRec && { borderWidth: 1.5 }]}>
                  <LinearGradient
                    colors={isRec ? [accent + '18', accent + '06'] : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  {isRec && (
                    <View style={[cm.recBadge, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
                      <Text style={[cm.recText, { color: accent }]}>BEST VALUE</Text>
                    </View>
                  )}
                  <View style={cm.tierTop}>
                    <View>
                      <Text style={[cm.tierLabel, { color: accent }]}>{def.label.toUpperCase()}</Text>
                      <Text style={cm.tierRaces}>{def.races} races</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[cm.tierCost, { color: canAfford ? '#fff' : '#ff4444' }]}>{formatCoins(cost)}</Text>
                      <Text style={cm.tierCostLabel}>signing fee</Text>
                    </View>
                  </View>

                  <View style={cm.tierStats}>
                    <View style={cm.tierStat}>
                      <Text style={cm.tierStatLabel}>EARNINGS</Text>
                      <Text style={[cm.tierStatVal, { color: accent }]}>{def.multiplier}×</Text>
                    </View>
                    <View style={cm.tierStatDivider} />
                    <View style={cm.tierStat}>
                      <Text style={cm.tierStatLabel}>EARLY EXIT</Text>
                      <Text style={[cm.tierStatVal, { color: 'rgba(255,80,80,0.85)' }]}>–{formatCoins(cost)}</Text>
                    </View>
                    <View style={cm.tierStatDivider} />
                    <View style={cm.tierStat}>
                      <Text style={cm.tierStatLabel}>DURATION</Text>
                      <Text style={[cm.tierStatVal, { color: 'rgba(255,255,255,0.7)' }]}>{def.races}R</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[cm.signBtn, canAfford && { backgroundColor: accent + '20', borderColor: accent }, !canAfford && cm.signBtnDisabled]}
                    onPress={() => canAfford && onSign(card, def.tier)}
                    activeOpacity={canAfford ? 0.75 : 1}
                    disabled={!canAfford}
                  >
                    <Text style={[cm.signBtnText, canAfford && { color: accent }, !canAfford && { color: 'rgba(255,255,255,0.25)' }]}>
                      {canAfford ? `Sign · ${formatCoins(cost)}` : 'Not enough funds'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={cm.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={cm.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Empty slot ───────────────────────────────────────────────────────────────

function EmptySlot({ label }: { label: string }) {
  return (
    <View style={[esl.container, { width: CARD_W, height: CARD_H }]}>
      <LinearGradient
        colors={['rgba(225,6,0,0.04)', 'transparent']}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <Ionicons name="add-circle-outline" size={30} color="rgba(255,255,255,0.12)" />
      <Text style={esl.label}>{label}</Text>
    </View>
  );
}

// ─── Market tile ──────────────────────────────────────────────────────────────

function MarketTile({ card, contracted, canAfford, onSign, onDetail }: {
  card: FantasyCard;
  contracted: boolean;
  canAfford: boolean;
  onSign: () => void;
  onDetail: () => void;
}) {
  return (
    <View style={t.tile}>
      <TouchableOpacity onPress={onDetail} activeOpacity={0.88}>
        <FantasyCardView card={card} />
      </TouchableOpacity>
      <View style={t.priceRow}>
        <Ionicons name="wallet-outline" size={12} color="#d4a017" />
        <Text style={t.priceText}>{formatCoins(card.price)}</Text>
      </View>
      {contracted ? (
        <View style={t.ownedBadge}>
          <Ionicons name="document-text" size={13} color="#a080f0" />
          <Text style={[t.ownedText, { color: '#a080f0' }]}>Under Contract</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[t.buyBtn, !canAfford && t.buyBtnDisabled]}
          onPress={onSign}
          activeOpacity={canAfford ? 0.75 : 1}
          disabled={!canAfford}
        >
          <Text style={[t.buyText, !canAfford && t.buyTextDisabled]}>
            {canAfford ? 'Sign Contract' : 'Not enough funds'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Squad tile ───────────────────────────────────────────────────────────────

function SquadTile({ card, contract, onTerminate, onDetail }: {
  card: FantasyCard;
  contract: Contract;
  onTerminate: () => void;
  onDetail: () => void;
}) {
  const remaining = getRacesRemaining(contract);
  const penalty   = getTerminationPenalty(contract);
  const accent    = TIER_ACCENT[contract.tier];
  const def       = CONTRACT_TIERS.find(d => d.tier === contract.tier)!;
  const progress  = contract.racesCompleted / contract.racesTotal;

  return (
    <View style={t.tile}>
      <TouchableOpacity onPress={onDetail} activeOpacity={0.88}>
        <FantasyCardView card={card} />
      </TouchableOpacity>
      <View style={[sq.contractBadge, { borderColor: accent + '55' }]}>
        <Text style={[sq.tierLabel, { color: accent }]}>{def.label.toUpperCase()}</Text>
        <Text style={sq.racesText}>{remaining} races left</Text>
      </View>
      <View style={sq.barTrack}>
        <View style={[sq.barFill, { width: `${progress * 100}%` as any, backgroundColor: accent }]} />
      </View>
      <TouchableOpacity style={sq.terminateBtn} onPress={onTerminate} activeOpacity={0.75}>
        <Ionicons name="close-circle-outline" size={12} color="#ff4444" />
        <Text style={sq.terminateText}>
          {penalty > 0 ? `Terminate · ${formatCoins(penalty)}` : 'Release (free)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const parts = title.split(' ');
  return (
    <View style={sec.wrap}>
      <Text style={sec.text}>
        <Text style={sec.light}>{parts[0]} </Text>
        <Text style={sec.bold}>{parts.slice(1).join(' ')}</Text>
      </Text>
      <View style={sec.line} />
    </View>
  );
}

// ─── Rarity section header ────────────────────────────────────────────────────

function RarityHeader({ rarity }: { rarity: CardRarity }) {
  const color = RARITY_GLOW[rarity];
  return (
    <View style={[rh.wrap, { borderLeftColor: color }]}>
      <Text style={[rh.label, { color }]}>{RARITY_LABEL[rarity]}</Text>
      <View style={[rh.line, { backgroundColor: color + '28' }]} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FantasyScreen() {
  const insets = useSafeAreaInsets();

  const [tab, setTab]                   = useState<Tab>('squad');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [balance, setBalanceState]      = useState(0);
  const [squadItems, setSquadItems]     = useState<Array<{ card: FantasyCard; contract: Contract }>>([]);
  const [contractMap, setContractMap]   = useState<ContractMap>({});
  const [score, setScore]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [signingCard, setSigningCard]   = useState<FantasyCard | null>(null);
  const [detailCard, setDetailCard]     = useState<FantasyCard | null>(null);

  const load = useCallback(async () => {
    const [bal, items, contracts, sc] = await Promise.all([
      getBalance(), getActiveContractCards(), getContracts(), getLeaderboardScore(),
    ]);
    setBalanceState(bal);
    setSquadItems(items);
    setContractMap(contracts);
    setScore(sc);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSign = useCallback((card: FantasyCard, tier: ContractTier) => {
    const name = card.type === 'driver' ? (card as DriverCard).lastName : (card as any).name;
    const def  = CONTRACT_TIERS.find(d => d.tier === tier)!;
    const cost = getContractCost(card.price, tier);
    Alert.alert(
      `Sign ${name}?`,
      `${def.label} contract · ${def.races} races\nSigning fee: ${formatCoins(cost)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          onPress: async () => {
            setSigningCard(null);
            const result = await signContract(card, tier);
            if (result === 'ok') {
              await load();
            } else if (result === 'insufficient_funds') {
              Alert.alert('Not enough funds', 'You cannot afford this signing fee.');
            } else {
              Alert.alert('Already contracted', 'This driver is already under contract.');
            }
          },
        },
      ],
    );
  }, [load]);

  const handleTerminate = useCallback((card: FantasyCard, contract: Contract) => {
    const name    = card.type === 'driver' ? (card as DriverCard).lastName : (card as any).name;
    const penalty = getTerminationPenalty(contract);
    const msg     = penalty > 0
      ? `Termination penalty: ${formatCoins(penalty)}\nThis cannot be undone.`
      : 'Contract has expired — releasing for free.';
    Alert.alert(`Terminate ${name}?`, msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Terminate',
        style: 'destructive',
        onPress: async () => {
          const result = await terminateContract(card.id);
          if (result === 'insufficient_funds') {
            Alert.alert('Not enough funds', 'You cannot afford the termination penalty.');
          } else {
            setDetailCard(null);
            await load();
          }
        },
      },
    ]);
  }, [load]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const ownedDrivers      = squadItems.filter(({ card }) => card.type === 'driver');
  const ownedConstructors = squadItems.filter(({ card }) => card.type === 'constructor');
  const squadValue        = squadItems.reduce((s, { card }) => s + card.price, 0);
  const avgOvr            = squadItems.length > 0
    ? Math.round(squadItems.reduce((s, { card }) => s + card.overall, 0) / squadItems.length)
    : 0;
  const budgetRatio       = Math.min(squadValue / BUDGET_CAP, 1);
  const budgetOverWarning = budgetRatio > 0.85;

  const filteredCards = ALL_CARDS.filter(c => {
    if (marketFilter === 'drivers')      return c.type === 'driver';
    if (marketFilter === 'constructors') return c.type === 'constructor';
    return true;
  });

  const marketByRarity: Record<CardRarity, FantasyCard[]> = {
    legend: filteredCards.filter(c => c.rarity === 'legend'),
    elite:  filteredCards.filter(c => c.rarity === 'elite'),
    gold:   filteredCards.filter(c => c.rarity === 'gold'),
    silver: filteredCards.filter(c => c.rarity === 'silver'),
    bronze: filteredCards.filter(c => c.rarity === 'bronze'),
  };

  const featuredCards = [...ALL_CARDS].sort((a, b) => b.overall - a.overall).slice(0, 5);

  const leaderboard = [...RIVALS, { name: 'You', country: 'f1', score }]
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const userEntry  = leaderboard.find(e => e.name === 'You')!;
  const entryAbove = leaderboard.find(e => e.rank === userEntry.rank - 1);
  const gapToNext  = entryAbove ? entryAbove.score - userEntry.score : 0;

  // Detail modal helpers
  const detailContract = detailCard
    ? (contractMap[detailCard.id] ?? null)
    : null;
  const detailIsContracted = !!detailContract && detailContract.racesCompleted < detailContract.racesTotal;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#E10600" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>

      {/* ── Card detail modal ───────────────────────────────────────────────── */}
      <CardDetailModal
        card={detailCard}
        contract={detailIsContracted ? detailContract : null}
        balance={balance}
        onSign={() => { setDetailCard(null); setTimeout(() => setSigningCard(detailCard), 300); }}
        onTerminate={() => detailCard && handleTerminate(detailCard, detailContract!)}
        onClose={() => setDetailCard(null)}
      />

      {/* ── Contract signing modal ──────────────────────────────────────────── */}
      <ContractModal
        card={signingCard}
        balance={balance}
        onSign={handleSign}
        onClose={() => setSigningCard(null)}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#1c0200', '#0f0800', '#0D0D0D']}
        locations={[0, 0.55, 1]}
        style={[h.header, { paddingTop: insets.top + 14 }]}
      >
        <Text style={h.title}>Fantasy</Text>

        <View style={h.utilRow}>
          <View style={h.balanceChip}>
            <Ionicons name="wallet-outline" size={13} color="#d4a017" />
            <Text style={h.balanceText}>{formatCoins(balance)}</Text>
          </View>
          <TouchableOpacity
            style={h.packsBtn}
            onPress={() => router.push('/fantasy/packs')}
            activeOpacity={0.8}
          >
            <Ionicons name="gift" size={13} color="#E10600" />
            <Text style={h.packsBtnText}>Packs</Text>
          </TouchableOpacity>
        </View>

        <View style={h.chips}>
          <View style={[h.chip, { borderColor: 'rgba(225,6,0,0.3)' }]}>
            <Ionicons name="people-outline" size={15} color="#E10600" style={{ marginBottom: 4 }} />
            <Text style={h.chipVal}>{squadItems.length}</Text>
            <Text style={h.chipLabel}>Contracts</Text>
          </View>
          <View style={[h.chip, { borderColor: 'rgba(212,160,23,0.3)' }]}>
            <Ionicons name="bar-chart-outline" size={15} color="#d4a017" style={{ marginBottom: 4 }} />
            <Text style={h.chipVal}>{formatCoins(squadValue)}</Text>
            <Text style={h.chipLabel}>Squad Value</Text>
          </View>
          <View style={[h.chip, { borderColor: 'rgba(160,128,240,0.3)' }]}>
            <Ionicons name="star-outline" size={15} color="#a080f0" style={{ marginBottom: 4 }} />
            <Text style={h.chipVal}>{formatCoins(score)}</Text>
            <Text style={h.chipLabel}>Points</Text>
          </View>
        </View>

        <View style={h.tabBar}>
          {(['squad', 'market', 'league'] as Tab[]).map(tb => (
            <TouchableOpacity
              key={tb}
              style={[h.tabItem, tab === tb && h.tabActive]}
              onPress={() => setTab(tb)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={TAB_ICONS[tb]}
                size={14}
                color={tab === tb ? '#ffffff' : 'rgba(255,255,255,0.35)'}
              />
              <Text style={[h.tabText, tab === tb && h.tabTextActive]}>
                {tb === 'squad' ? 'Squad' : tb === 'market' ? 'Market' : 'League'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ── My Squad ───────────────────────────────────────────────────────── */}
      {tab === 'squad' && (
        <ScrollView
          contentContainerStyle={[g.scroll, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E10600" />}
        >
          <View style={bd.card}>
            <LinearGradient
              colors={['rgba(212,160,23,0.07)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            <View style={bd.topRow}>
              <Text style={bd.label}>BUDGET CAP</Text>
              <Text style={bd.values}>
                <Text style={{ color: budgetOverWarning ? '#ff5555' : '#d4a017', fontWeight: '800' }}>
                  {formatCoins(squadValue)}
                </Text>
                <Text style={bd.sep}> / </Text>
                <Text style={bd.max}>{formatCoins(BUDGET_CAP)}</Text>
              </Text>
            </View>
            <View style={bd.track}>
              <LinearGradient
                colors={budgetOverWarning ? ['#ff4444', '#ff2020'] : ['#d4a017', '#f0c030']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[bd.fill, { width: `${budgetRatio * 100}%` as any }]}
              />
            </View>
            <View style={bd.stats}>
              {squadItems.length > 0 && (
                <Text style={bd.stat}>
                  AVG OVR <Text style={{ color: '#fff', fontWeight: '800' }}>{avgOvr}</Text>
                </Text>
              )}
              <Text style={bd.stat}>
                <Text style={{ color: ownedDrivers.length >= MAX_DRIVER_SLOTS ? '#d4a017' : 'rgba(255,255,255,0.5)' }}>
                  {ownedDrivers.length}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)' }}>/{MAX_DRIVER_SLOTS} </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Drivers</Text>
              </Text>
              <Text style={bd.stat}>
                <Text style={{ color: ownedConstructors.length >= MAX_CONSTRUCTOR_SLOTS ? '#d4a017' : 'rgba(255,255,255,0.5)' }}>
                  {ownedConstructors.length}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)' }}>/{MAX_CONSTRUCTOR_SLOTS} </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Teams</Text>
              </Text>
            </View>
          </View>

          {squadItems.length === 0 ? (
            <View style={g.empty}>
              <Ionicons name="shield-outline" size={52} color="rgba(255,255,255,0.1)" />
              <Text style={g.emptyTitle}>Your squad is empty</Text>
              <Text style={g.emptySub}>
                Sign up to {MAX_DRIVER_SLOTS} drivers and {MAX_CONSTRUCTOR_SLOTS} constructors to build your team
              </Text>
              <TouchableOpacity style={g.goBtn} onPress={() => setTab('market')}>
                <Text style={g.goBtnText}>Browse Market</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <SectionHeader title="Driver Contracts" />
              <View style={g.grid}>
                {ownedDrivers.map(({ card, contract }) => (
                  <SquadTile
                    key={card.id}
                    card={card}
                    contract={contract}
                    onTerminate={() => handleTerminate(card, contract)}
                    onDetail={() => setDetailCard(card)}
                  />
                ))}
                {Array.from({ length: Math.max(0, MAX_DRIVER_SLOTS - ownedDrivers.length) }).map((_, i) => (
                  <EmptySlot key={`drv-${i}`} label="Driver Slot" />
                ))}
              </View>

              <SectionHeader title="Constructor Contracts" />
              <View style={g.grid}>
                {ownedConstructors.map(({ card, contract }) => (
                  <SquadTile
                    key={card.id}
                    card={card}
                    contract={contract}
                    onTerminate={() => handleTerminate(card, contract)}
                    onDetail={() => setDetailCard(card)}
                  />
                ))}
                {Array.from({ length: Math.max(0, MAX_CONSTRUCTOR_SLOTS - ownedConstructors.length) }).map((_, i) => (
                  <EmptySlot key={`con-${i}`} label="Constructor Slot" />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ── Market ─────────────────────────────────────────────────────────── */}
      {tab === 'market' && (
        <View style={{ flex: 1 }}>
          <View style={m.filterRow}>
            {(['all', 'drivers', 'constructors'] as MarketFilter[]).map(f => (
              <TouchableOpacity
                key={f}
                style={[m.pill, marketFilter === f && m.pillActive]}
                onPress={() => setMarketFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[m.pillText, marketFilter === f && m.pillTextActive]}>
                  {f === 'all' ? 'All' : f === 'drivers' ? 'Drivers' : 'Constructors'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E10600" />}
          >
            <View style={feat.section}>
              <View style={feat.headerRow}>
                <View style={feat.eyebrowPill}>
                  <Ionicons name="flash" size={10} color="#E10600" />
                  <Text style={feat.eyebrow}>FEATURED</Text>
                </View>
                <View style={feat.divider} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={feat.scroll}>
                {featuredCards.map(card => {
                  const existing   = contractMap[card.id];
                  const contracted = !!existing && existing.racesCompleted < existing.racesTotal;
                  const canAfford  = balance >= getContractCost(card.price, 'short');
                  return (
                    <View key={card.id} style={feat.item}>
                      <TouchableOpacity onPress={() => setDetailCard(card)} activeOpacity={0.88}>
                        <FantasyCardView card={card} />
                      </TouchableOpacity>
                      <View style={t.priceRow}>
                        <Ionicons name="wallet-outline" size={11} color="#d4a017" />
                        <Text style={t.priceText}>{formatCoins(card.price)}</Text>
                      </View>
                      {contracted ? (
                        <View style={[t.ownedBadge, { width: CARD_W }]}>
                          <Ionicons name="document-text" size={12} color="#a080f0" />
                          <Text style={[t.ownedText, { color: '#a080f0' }]}>Contracted</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[t.buyBtn, { width: CARD_W }, !canAfford && t.buyBtnDisabled]}
                          onPress={() => setSigningCard(card)}
                          activeOpacity={0.75}
                        >
                          <Text style={[t.buyText, !canAfford && t.buyTextDisabled]}>Sign</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <View style={{ paddingHorizontal: 16 }}>
              {RARITY_ORDER.map(rarity => {
                const cards = marketByRarity[rarity];
                if (!cards.length) return null;
                return (
                  <View key={rarity} style={{ marginBottom: 6 }}>
                    <RarityHeader rarity={rarity} />
                    <View style={[g.grid, { marginBottom: 20 }]}>
                      {cards.map(card => {
                        const existing   = contractMap[card.id];
                        const contracted = !!existing && existing.racesCompleted < existing.racesTotal;
                        return (
                          <MarketTile
                            key={card.id}
                            card={card}
                            contracted={contracted}
                            canAfford={balance >= getContractCost(card.price, 'short')}
                            onSign={() => setSigningCard(card)}
                            onDetail={() => setDetailCard(card)}
                          />
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── League ─────────────────────────────────────────────────────────── */}
      {tab === 'league' && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 16, paddingTop: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E10600" />}
        >
          <Text style={lb.title}>
            <Text style={lb.titleLight}>Global </Text>
            <Text style={lb.titleBold}>Leaderboard</Text>
          </Text>
          <Text style={lb.sub}>Updated after each race weekend</Text>

          {userEntry.rank > 1 && entryAbove && (
            <View style={lb.progressCard}>
              <LinearGradient
                colors={['rgba(225,6,0,0.12)', 'rgba(225,6,0,0.04)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={lb.progressLeft}>
                <Text style={lb.progressRank}>#{userEntry.rank}</Text>
                <Text style={lb.progressRankLabel}>YOUR RANK</Text>
              </View>
              <View style={lb.progressDivider} />
              <View style={lb.progressCenter}>
                <Text style={lb.progressGap}>+{formatCoins(gapToNext)} pts</Text>
                <Text style={lb.progressGapSub}>needed to reach #{userEntry.rank - 1}</Text>
              </View>
              <Ionicons name="chevron-up-circle" size={22} color="#E10600" />
            </View>
          )}

          <View style={{ gap: 6, marginTop: 16 }}>
            {leaderboard.map(entry => {
              const isUser   = entry.name === 'You';
              const isPodium = entry.rank <= 3;
              const PODIUM_COLORS: Record<number, string> = { 1: '#d4a017', 2: '#9aaab8', 3: '#bf8050' };
              const podiumColor = PODIUM_COLORS[entry.rank] ?? '';
              const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null;

              return (
                <View
                  key={entry.name}
                  style={[
                    lb.row,
                    isPodium && { borderColor: podiumColor + '55', backgroundColor: podiumColor + '10', paddingVertical: 14 },
                    isUser && lb.rowUser,
                  ]}
                >
                  {isPodium && (
                    <LinearGradient
                      colors={[podiumColor + '1a', 'transparent']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFillObject}
                      pointerEvents="none"
                    />
                  )}
                  <Text style={[lb.rank, isPodium && { color: podiumColor, fontSize: 17, minWidth: 36 }, isUser && { color: '#E10600' }]}>
                    {medal ?? `#${entry.rank}`}
                  </Text>
                  <View style={lb.flagBox}>
                    {entry.country === 'f1' ? (
                      <Text style={{ fontSize: 14 }}>🏁</Text>
                    ) : (
                      <LeagueFlag iso2={entry.country} />
                    )}
                  </View>
                  <Text
                    style={[lb.name, isPodium && { color: 'rgba(255,255,255,0.85)', fontWeight: '700' }, isUser && { color: '#fff', fontWeight: '800' }]}
                    numberOfLines={1}
                  >
                    {entry.name}
                  </Text>
                  <Text style={[lb.score, isPodium && { color: podiumColor, fontWeight: '800' }, isUser && { color: '#d4a017' }]}>
                    {formatCoins(entry.score)} pts
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const h = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  title: { fontSize: 48, fontWeight: '800', color: '#ffffff', letterSpacing: -2, marginBottom: 10 },
  utilRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
  },
  balanceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,160,23,0.12)', borderColor: 'rgba(212,160,23,0.4)',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  balanceText: { color: '#d4a017', fontSize: 14, fontWeight: '900' },
  packsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(225,6,0,0.1)', borderColor: 'rgba(225,6,0,0.35)',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  packsBtnText: { color: '#E10600', fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10,
    alignItems: 'center', borderWidth: 1,
  },
  chipLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, marginTop: 2 },
  chipVal: { fontSize: 18, fontWeight: '900', color: '#ffffff', fontStyle: 'italic' },
  tabBar: {
    flexDirection: 'row', gap: 4,
    paddingHorizontal: 6, paddingTop: 8, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  tabItem: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, flexDirection: 'row', gap: 5,
  },
  tabActive: { backgroundColor: '#E10600' },
  tabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
  tabTextActive: { color: '#ffffff', fontWeight: '800' },
});

const g = StyleSheet.create({
  scroll: { paddingTop: 20, paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.35)', marginTop: 8 },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.22)', textAlign: 'center', lineHeight: 19 },
  goBtn: { marginTop: 16, backgroundColor: '#E10600', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 22 },
  goBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});

const bd = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 14, marginBottom: 20, gap: 10,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)' },
  values: { fontSize: 14 },
  sep: { color: 'rgba(255,255,255,0.25)' },
  max: { color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  stats: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  stat: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
});

const t = StyleSheet.create({
  tile: { width: CARD_W, alignItems: 'center', gap: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceText: { color: '#d4a017', fontSize: 15, fontWeight: '800' },
  buyBtn: { width: CARD_W, borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#E10600' },
  buyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.07)' },
  buyText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  buyTextDisabled: { color: 'rgba(255,255,255,0.3)' },
  ownedBadge: {
    width: CARD_W, borderRadius: 8, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5,
    backgroundColor: 'rgba(160,128,240,0.1)', borderWidth: 1, borderColor: 'rgba(160,128,240,0.3)',
  },
  ownedText: { fontSize: 13, fontWeight: '700' },
});

const sq = StyleSheet.create({
  contractBadge: {
    width: CARD_W, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tierLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  racesText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  barTrack: { width: CARD_W, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  barFill: { height: 3, borderRadius: 2 },
  terminateBtn: {
    width: CARD_W, borderRadius: 8, paddingVertical: 9,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5,
    backgroundColor: 'rgba(255,68,68,0.07)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.25)',
  },
  terminateText: { color: '#ff4444', fontSize: 12, fontWeight: '700' },
});

const m = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  pillActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  pillText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  pillTextActive: { color: '#ffffff' },
});

const feat = StyleSheet.create({
  section: { marginBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  eyebrowPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(225,6,0,0.1)', borderWidth: 1, borderColor: 'rgba(225,6,0,0.28)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: '#E10600' },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  scroll: { paddingLeft: 16, paddingRight: 8 },
  item: { alignItems: 'center', gap: 6, marginRight: 10 },
});

const rh = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 12, marginTop: 4, borderLeftWidth: 3, paddingLeft: 10,
  },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  line: { flex: 1, height: 1 },
});

const sec = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 8 },
  text: { fontSize: 16 },
  light: { color: 'rgba(255,255,255,0.4)', fontWeight: '300' },
  bold: { color: '#ffffff', fontWeight: '900' },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
});

const esl = StyleSheet.create({
  container: {
    borderWidth: 1.5, borderColor: 'rgba(225,6,0,0.15)', borderStyle: 'dashed',
    borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 8,
    overflow: 'hidden',
  },
  label: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.18)', letterSpacing: 0.5 },
});

const lb = StyleSheet.create({
  title: { fontSize: 22 },
  titleLight: { color: 'rgba(255,255,255,0.4)', fontWeight: '300', fontStyle: 'italic' },
  titleBold: { color: '#ffffff', fontWeight: '900' },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 },
  progressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 16, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(225,6,0,0.3)', overflow: 'hidden',
  },
  progressLeft: { alignItems: 'center', minWidth: 48 },
  progressRank: { fontSize: 22, fontWeight: '900', color: '#E10600' },
  progressRankLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  progressDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.1)' },
  progressCenter: { flex: 1 },
  progressGap: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  progressGapSub: { fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  rowUser: { backgroundColor: 'rgba(225,6,0,0.07)', borderColor: 'rgba(225,6,0,0.3)' },
  rank: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.38)', minWidth: 32 },
  flagBox: { width: 28, height: 20, borderRadius: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  score: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
});

const cm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.09)',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#E10600', marginBottom: 4 },
  subName: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 4 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 20 },
  balance: { fontSize: 13, color: '#d4a017', fontWeight: '600' },
  tiers: { gap: 10 },
  tierCard: { borderRadius: 12, borderWidth: 1, padding: 14, overflow: 'hidden' },
  recBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, marginBottom: 10 },
  recText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  tierTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  tierLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 },
  tierRaces: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  tierCost: { fontSize: 18, fontWeight: '900', textAlign: 'right' },
  tierCostLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, textAlign: 'right', marginTop: 1 },
  tierStats: { flexDirection: 'row', marginBottom: 14, alignItems: 'center' },
  tierStat: { flex: 1, alignItems: 'center' },
  tierStatLabel: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.32)', letterSpacing: 1, marginBottom: 3 },
  tierStatVal: { fontSize: 15, fontWeight: '900' },
  tierStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  signBtn: { borderRadius: 8, paddingVertical: 11, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  signBtnDisabled: { borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.03)' },
  signBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  cancelBtn: { marginTop: 16, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.38)' },
});

const cd = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%',
    borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
  },
  glowBand: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 180,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  rarityEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2.5, textAlign: 'center', marginBottom: 18 },
  cardWrap: { alignItems: 'center', marginBottom: 20 },
  cardGlow: { borderRadius: 11 },
  displayName: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 0.5, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  teamChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  teamChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  nationality: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  ovrBadge: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'baseline', gap: 3,
  },
  ovrNum: { fontSize: 18, fontWeight: '900' },
  ovrLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 18 },
  price: { fontSize: 16, fontWeight: '900', color: '#d4a017' },
  priceSub: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
  divider: { height: 1, marginVertical: 18 },
  statsHeader: { fontSize: 16, marginBottom: 14 },
  statsGrid: { gap: 10 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statKey: { width: 30, fontSize: 9, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.4)' },
  statBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  statBarFill: { height: 6, borderRadius: 3 },
  statValue: { width: 26, fontSize: 13, fontWeight: '900', textAlign: 'right' },
  statName: { width: 110, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  contractCard: { borderWidth: 1, borderRadius: 12, padding: 14, overflow: 'hidden', gap: 10 },
  contractTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contractBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  contractTier: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  contractRaces: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  contractBarTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  contractBarFill: { height: 4, borderRadius: 2 },
  contractMeta: { flexDirection: 'row', gap: 20 },
  contractMetaItem: { fontSize: 13 },
  actionBtn: {
    margin: 16, marginTop: 0, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actionBtnDisabled: { borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  actionBtnText: { fontSize: 15, fontWeight: '800' },
  actionBtnDestructive: {
    margin: 16, marginTop: 0, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(255,68,68,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,68,68,0.35)',
  },
  actionBtnDestructiveText: { fontSize: 15, fontWeight: '800', color: '#ff4444' },
});
