import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Easing, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { FantasyCardView, CARD_W, CARD_H } from '../../components/FantasyCard';
import { RARITY_COLORS, getFlagUrl, type FantasyCard, type DriverCard, type ConstructorCard, type CardRarity } from '../../lib/fantasy';
import { getConstructorAssets } from '../../lib/constructorAssets';
import { PACK_TYPES, type PackType } from '../../lib/packs';
import { getBalance, buyAndOpenPack, type OpenPackResult } from '../../lib/fantasyStorage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCoins(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Card back ────────────────────────────────────────────────────────────────

function CardBack() {
  return (
    <View style={cb.card}>
      <LinearGradient colors={['#1c1030', '#0a0814']} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['transparent', 'rgba(160,128,240,0.14)', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={cb.inner}>
        <Text style={cb.logo}>APEX</Text>
        <Text style={cb.sub}>FANTASY</Text>
      </View>
    </View>
  );
}

// ─── Flag reveal step ─────────────────────────────────────────────────────────

function FlagReveal({ card }: { card: FantasyCard }) {
  const nationality = card.type === 'driver'
    ? (card as DriverCard).nationality
    : (card as ConstructorCard).nationality;
  const flagUrl = getFlagUrl(nationality)?.replace('w40', 'w160');

  return (
    <View style={[cb.card, fv.wrap]}>
      <LinearGradient colors={['#0e0c18', '#07060f']} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['transparent', 'rgba(200,170,80,0.12)', 'transparent']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {flagUrl && (
        <View style={fv.flagWrap}>
          <Image source={{ uri: flagUrl }} style={fv.flag} resizeMode="cover" />
        </View>
      )}
      <Text style={fv.label}>{nationality.toUpperCase()}</Text>
      <Text style={fv.hint}>Tap to continue</Text>
    </View>
  );
}

// ─── Team reveal step ─────────────────────────────────────────────────────────

function TeamReveal({ card }: { card: FantasyCard }) {
  const constructorId = card.type === 'driver'
    ? (card as DriverCard).constructorId
    : (card as ConstructorCard).constructorId;
  const teamName = card.type === 'driver'
    ? (card as DriverCard).teamName
    : (card as ConstructorCard).name;
  const { icon: teamIcon, color: teamColor } = getConstructorAssets(constructorId);

  return (
    <View style={[cb.card, fv.wrap]}>
      <LinearGradient colors={['#0e0c18', '#07060f']} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['transparent', teamColor + '40', 'transparent']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      {teamIcon && (
        <View style={fv.teamWrap}>
          <Image source={teamIcon} style={fv.teamLogo} resizeMode="contain" />
        </View>
      )}
      <Text style={fv.label}>{teamName.toUpperCase()}</Text>
      <Text style={fv.hint}>Tap to reveal card</Text>
    </View>
  );
}

// ─── Flippable card (3-step: flag → team → card) ──────────────────────────────

type RevealStep = 'back' | 'flag' | 'team' | 'card';

function FlippableCard({ card, onFlipped }: { card: FantasyCard; onFlipped: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState<RevealStep>('back');
  const busy = useRef(false);

  const advance = () => {
    if (busy.current || step === 'card') return;
    busy.current = true;

    Animated.timing(anim, {
      toValue: 1, duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      const next: RevealStep =
        step === 'back' ? 'flag' :
        step === 'flag' ? 'team' : 'card';
      setStep(next);
      Animated.timing(anim, {
        toValue: 0, duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        busy.current = false;
        if (next === 'card') onFlipped();
      });
    });
  };

  const scaleX = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const content =
    step === 'back' ? <CardBack /> :
    step === 'flag' ? <FlagReveal card={card} /> :
    step === 'team' ? <TeamReveal card={card} /> :
    <FantasyCardView card={card} />;

  return (
    <TouchableOpacity onPress={advance} activeOpacity={step === 'card' ? 1 : 0.88}>
      <Animated.View style={{ transform: [{ scaleX }] }}>
        {content}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Pack artwork ─────────────────────────────────────────────────────────────

function PackArtwork({ pack, size = 1 }: { pack: PackType; size?: number }) {
  const w = CARD_W * 0.82 * size;
  const h = CARD_H * 0.92 * size;
  return (
    <View style={[pa.pack, { width: w, height: h, borderColor: pack.color + '55' }]}>
      <LinearGradient colors={pack.gradientColors} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['transparent', pack.color + '30', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Shine stripe */}
      <LinearGradient
        colors={[pack.color + '00', pack.color + '22', pack.color + '00']}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={pa.content}>
        <Text style={[pa.packName, { color: pack.color }]}>{pack.name.toUpperCase()}</Text>
        <Text style={pa.packSub}>{pack.cardCount} CARDS</Text>
        <View style={[pa.costChip, { borderColor: pack.color + '55', backgroundColor: pack.color + '18' }]}>
          <Ionicons name="wallet-outline" size={11} color={pack.color} />
          <Text style={[pa.costText, { color: pack.color }]}>{formatCoins(pack.cost)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Phase = 'select' | 'reveal' | 'summary';

export default function PacksScreen() {
  const insets = useSafeAreaInsets();

  const [phase, setPhase]             = useState<Phase>('select');
  const [balance, setBalance]         = useState(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [selectedPack, setSelectedPack]   = useState<PackType | null>(null);
  const [result, setResult]               = useState<OpenPackResult | null>(null);
  const [cardIndex, setCardIndex]         = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading]             = useState(false);

  // Rarity flash overlay
  const flashAnim  = useRef(new Animated.Value(0)).current;
  const [flashColor, setFlashColor] = useState('#ffffff');

  // Card slide-in animation
  const slideAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    getBalance().then(b => { setBalance(b); setBalanceLoaded(true); });
  }, []);

  const triggerFlash = useCallback((color: string) => {
    setFlashColor(color);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [flashAnim]);

  const animateCardIn = useCallback(() => {
    slideAnim.setValue(80);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleOpen = useCallback(async (pack: PackType) => {
    if (loading) return;
    setLoading(true);
    setSelectedPack(pack);

    const res = await buyAndOpenPack(pack);
    if (res === 'insufficient_funds') {
      setLoading(false);
      setSelectedPack(null);
      return;
    }

    setResult(res);
    setBalance(res.newBalance);
    setCardIndex(0);
    setRevealedCount(0);
    setPhase('reveal');
    setLoading(false);
    setTimeout(animateCardIn, 50);
  }, [loading, animateCardIn]);

  const handleFlipped = useCallback(() => {
    if (!result) return;
    const card = result.cards[cardIndex];
    const { accent } = RARITY_COLORS[card.rarity];
    triggerFlash(accent);
    setRevealedCount(c => c + 1);
  }, [result, cardIndex, triggerFlash]);

  const handleNext = useCallback(() => {
    if (!result) return;
    if (cardIndex + 1 >= result.cards.length) {
      setPhase('summary');
      return;
    }
    setCardIndex(i => i + 1);
    setTimeout(animateCardIn, 30);
  }, [cardIndex, result, animateCardIn]);

  const handleOpenAnother = useCallback(() => {
    setPhase('select');
    setResult(null);
    setSelectedPack(null);
    setCardIndex(0);
    setRevealedCount(0);
  }, []);

  // ── Select phase ─────────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
        <LinearGradient
          colors={['#1c0200', '#0f0800', '#0D0D0D']}
          locations={[0, 0.5, 1]}
          style={[s.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={s.title}>Packs</Text>
            <View style={s.balanceChip}>
              <Ionicons name="wallet-outline" size={13} color="#d4a017" />
              <Text style={s.balanceText}>
                {balanceLoaded ? formatCoins(balance) : '—'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100, gap: 16 }}>
          {PACK_TYPES.map(pack => {
            const canAfford = balance >= pack.cost;
            return (
              <View key={pack.id} style={[ps.card, { borderColor: pack.color + '33' }]}>
                <LinearGradient
                  colors={[pack.color + '10', 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />

                <View style={ps.left}>
                  <PackArtwork pack={pack} />
                </View>

                <View style={ps.right}>
                  <Text style={[ps.packName, { color: pack.color }]}>{pack.name}</Text>
                  <Text style={ps.subtitle}>{pack.subtitle}</Text>

                  {/* Odds */}
                  <View style={ps.odds}>
                    {(Object.entries(pack.odds) as [CardRarity, number][])
                      .filter(([, p]) => p > 0)
                      .map(([rarity, prob]) => (
                        <View key={rarity} style={ps.oddRow}>
                          <View style={[ps.oddDot, { backgroundColor: RARITY_COLORS[rarity].accent }]} />
                          <Text style={ps.oddLabel}>{rarity.toUpperCase()}</Text>
                          <Text style={[ps.oddPct, { color: RARITY_COLORS[rarity].accent }]}>
                            {(prob * 100).toFixed(0)}%
                          </Text>
                        </View>
                      ))}
                    {pack.guaranteed && (
                      <View style={[ps.oddRow, { marginTop: 4 }]}>
                        <Ionicons name="checkmark-circle" size={10} color={pack.color} />
                        <Text style={[ps.oddLabel, { color: pack.color }]}>
                          Guaranteed {Object.keys(pack.guaranteed)[0]}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[ps.btn, { borderColor: pack.color }, !canAfford && ps.btnDisabled]}
                    onPress={() => canAfford && handleOpen(pack)}
                    activeOpacity={canAfford ? 0.75 : 1}
                    disabled={loading}
                  >
                    {loading && selectedPack?.id === pack.id ? (
                      <ActivityIndicator size="small" color={pack.color} />
                    ) : (
                      <>
                        <LinearGradient
                          colors={canAfford ? [pack.color + '22', pack.color + '0a'] : ['transparent', 'transparent']}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <Text style={[ps.btnText, canAfford ? { color: pack.color } : ps.btnTextDisabled]}>
                          {canAfford ? `Open · ${formatCoins(pack.cost)}` : 'Not enough coins'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ── Reveal phase ──────────────────────────────────────────────────────────────
  if (phase === 'reveal' && result) {
    const card        = result.cards[cardIndex];
    const isDuplicate = result.duplicateIds.has(card.id);
    const { accent }  = RARITY_COLORS[card.rarity];
    const isRevealed  = revealedCount > cardIndex;
    const isLast      = cardIndex + 1 >= result.cards.length;

    return (
      <View style={{ flex: 1, backgroundColor: '#080810' }}>
        {/* Rarity flash */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: flashColor, opacity: flashAnim }]}
        />

        {/* Background glow when revealed */}
        {isRevealed && (
          <LinearGradient
            colors={['transparent', accent + '18', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        )}

        {/* Header */}
        <View style={[rv.header, { paddingTop: insets.top + 16 }]}>
          <Text style={rv.counter}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>{cardIndex + 1}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.35)' }}> / {result.cards.length}</Text>
          </Text>
          <View style={rv.dots}>
            {result.cards.map((_, i) => (
              <View
                key={i}
                style={[rv.dot, {
                  backgroundColor: i < revealedCount
                    ? RARITY_COLORS[result.cards[i].rarity].accent
                    : i === cardIndex
                    ? 'rgba(255,255,255,0.6)'
                    : 'rgba(255,255,255,0.15)',
                  width: i === cardIndex ? 20 : 8,
                }]}
              />
            ))}
          </View>
          <View style={rv.balChip}>
            <Ionicons name="wallet-outline" size={11} color="#d4a017" />
            <Text style={rv.balText}>{formatCoins(balance)}</Text>
          </View>
        </View>

        {/* Card */}
        <View style={rv.cardArea}>
          <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
            {/* Glow behind revealed card */}
            {isRevealed && (
              <View style={[rv.cardGlow, { shadowColor: accent }]} />
            )}
            <FlippableCard key={cardIndex} card={card} onFlipped={handleFlipped} />
            {/* Duplicate badge */}
            {isRevealed && isDuplicate && (
              <View style={rv.dupBadge}>
                <LinearGradient colors={['rgba(0,0,0,0.88)', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFillObject} />
                <Ionicons name="copy-outline" size={18} color="#d4a017" />
                <Text style={rv.dupTitle}>DUPLICATE</Text>
                <Text style={rv.dupCoins}>+{formatCoins(Math.floor(card.price * 0.12))} coins</Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Tap hint or Next button */}
        {isRevealed && (
          <View style={[rv.footer, { paddingBottom: insets.bottom + 24 }]}>
            <TouchableOpacity
              style={[rv.nextBtn, { borderColor: accent, backgroundColor: accent + '18' }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[rv.nextBtnText, { color: accent }]}>
                {isLast ? 'See All Cards' : 'Next Card'}
              </Text>
              <Ionicons name={isLast ? 'grid' : 'chevron-forward'} size={16} color={accent} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Summary phase ─────────────────────────────────────────────────────────────
  if (phase === 'summary' && result) {
    const totalNew = result.cards.length - result.duplicateIds.size;
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
        <LinearGradient
          colors={['#1a0a00', '#0D0D0D']}
          style={[s.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={s.eyebrow}>PACK OPENED</Text>
            <Text style={[s.title, { textAlign: 'center' }]}>
              {totalNew} New Card{totalNew !== 1 ? 's' : ''}
            </Text>
            {result.duplicateCoins > 0 && (
              <View style={su.coinRow}>
                <Ionicons name="wallet-outline" size={13} color="#d4a017" />
                <Text style={su.coinText}>+{formatCoins(result.duplicateCoins)} from duplicates</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}>
          <View style={su.grid}>
            {result.cards.map((card, i) => {
              const isDup = result.duplicateIds.has(card.id);
              return (
                <View key={i} style={{ width: CARD_W, alignItems: 'center', gap: 6 }}>
                  <View>
                    <FantasyCardView card={card} />
                    {isDup && (
                      <View style={su.dupOverlay}>
                        <LinearGradient colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFillObject} />
                        <Ionicons name="copy-outline" size={16} color="#d4a017" />
                        <Text style={su.dupLabel}>DUPLICATE</Text>
                        <Text style={su.dupCoins}>+{formatCoins(Math.floor(card.price * 0.12))}</Text>
                      </View>
                    )}
                    {!isDup && (
                      <View style={su.newBadge}>
                        <Text style={su.newText}>NEW</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom actions */}
        <View style={[su.actions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={su.anotherBtn} onPress={handleOpenAnother} activeOpacity={0.8}>
            <Text style={su.anotherText}>Open Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={su.doneBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={su.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#E10600', marginBottom: 2, textAlign: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
  balanceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(212,160,23,0.12)', borderColor: 'rgba(212,160,23,0.4)',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  balanceText: { color: '#d4a017', fontSize: 14, fontWeight: '900' },
});

const cb = StyleSheet.create({
  card: {
    width: CARD_W, height: CARD_H, borderRadius: 11,
    borderWidth: 1.5, borderColor: 'rgba(160,128,240,0.25)',
    overflow: 'hidden',
  },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  logo: { fontSize: 13, fontWeight: '900', letterSpacing: 5, color: 'rgba(255,255,255,0.09)' },
  sub: { fontSize: 8, fontWeight: '700', letterSpacing: 3, color: 'rgba(255,255,255,0.06)' },
});

const pa = StyleSheet.create({
  pack: {
    borderRadius: 10, borderWidth: 1.5, overflow: 'hidden',
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  packName: { fontSize: 9, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  packSub: { fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: '600', letterSpacing: 1 },
  costChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  costText: { fontSize: 10, fontWeight: '800' },
});

const ps = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 16, flexDirection: 'row', gap: 16,
    overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  left: { alignItems: 'center', justifyContent: 'center' },
  right: { flex: 1, gap: 8, justifyContent: 'center' },
  packName: { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: -4 },
  odds: { gap: 3 },
  oddRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  oddDot: { width: 6, height: 6, borderRadius: 3 },
  oddLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600', flex: 1, letterSpacing: 0.5 },
  oddPct: { fontSize: 10, fontWeight: '800' },
  btn: {
    borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1.5, overflow: 'hidden',
    marginTop: 4,
  },
  btnDisabled: { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent' },
  btnText: { fontSize: 14, fontWeight: '800' },
  btnTextDisabled: { color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: '800' },
});

const fv = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  flagWrap: {
    borderRadius: 6, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  flag: { width: 130, height: 88 },
  teamWrap: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  teamLogo: { width: 88, height: 88 },
  label: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '500', letterSpacing: 0.5, marginTop: -4 },
});

const rv = StyleSheet.create({
  header: {
    paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  counter: { fontSize: 16 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { height: 8, borderRadius: 4 },
  balChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balText: { color: '#d4a017', fontSize: 12, fontWeight: '800' },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardGlow: {
    position: 'absolute',
    width: CARD_W + 40, height: CARD_H + 40,
    borderRadius: 20, shadowRadius: 32, shadowOpacity: 0.65,
    shadowOffset: { width: 0, height: 0 }, top: -20, left: -20,
  },
  dupBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: CARD_H * 0.4, borderBottomLeftRadius: 11, borderBottomRightRadius: 11,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  dupTitle: { fontSize: 11, fontWeight: '900', color: '#d4a017', letterSpacing: 2 },
  dupCoins: { fontSize: 15, fontWeight: '900', color: '#fff' },
  footer: { paddingHorizontal: 40, alignItems: 'center' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 14, width: '100%', justifyContent: 'center',
  },
  nextBtnText: { fontSize: 15, fontWeight: '800' },
});

const su = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coinText: { color: '#d4a017', fontSize: 13, fontWeight: '700' },
  dupOverlay: {
    position: 'absolute', inset: 0, borderRadius: 11,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  dupLabel: { fontSize: 10, fontWeight: '900', color: '#d4a017', letterSpacing: 2 },
  dupCoins: { fontSize: 13, fontWeight: '900', color: '#fff' },
  newBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#E10600', borderRadius: 5,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  newText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12, paddingHorizontal: 20,
    backgroundColor: '#0D0D0D',
    paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  anotherBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  anotherText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    backgroundColor: '#E10600',
  },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
