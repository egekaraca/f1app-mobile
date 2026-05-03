// components/FantasyCard.tsx — FUT-style F1 fantasy card

import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getDriverPhoto } from '../lib/driverAssets';
import { getConstructorAssets } from '../lib/constructorAssets';
import {
  type FantasyCard,
  type DriverCard,
  type ConstructorCard,
  type CardRarity,
  RARITY_COLORS,
  getFlagUrl,
} from '../lib/fantasy';

// ─── Card dimensions ──────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
export const CARD_W = Math.floor((SCREEN_W - 32 - 12) / 2);
export const CARD_H = Math.floor(CARD_W * 1.52);

const RARITY_BORDER: Record<CardRarity, string> = {
  legend: '#c8a000',
  elite:  '#a080f0',
  gold:   '#d4a017',
  silver: '#7a8fa8',
  bronze: '#a06038',
};

// ─── Animated hue layers ──────────────────────────────────────────────────────

function AnimatedHue({ accent }: { accent: string }) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-CARD_W * 0.45, CARD_W * 0.45] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[s.hueSweep, { transform: [{ translateX: sweepX }] }]}
    >
      <LinearGradient
        colors={['transparent', accent + '38', accent + '18', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

// ─── Shared stat item ─────────────────────────────────────────────────────────

function StatItem({ label, value, accent, text }: { label: string; value: number; accent: string; text: string }) {
  return (
    <View style={s.statItem}>
      <Text style={[s.statVal, { color: text }]}>{value}</Text>
      <Text style={[s.statLbl, { color: accent }]}>{label}</Text>
    </View>
  );
}

// ─── Driver Card ──────────────────────────────────────────────────────────────

function DriverCardView({ card }: { card: DriverCard }) {
  const base        = RARITY_COLORS[card.rarity];
  const bg          = card.customBg ?? base.bg;
  const accent      = card.customAccent ?? base.accent;
  const text        = base.text;
  const borderColor = card.customBorderColor ?? RARITY_BORDER[card.rarity];
  const version     = card.cardVersion ?? 'base';

  const photo    = getDriverPhoto(card.driverId);
  const { icon: teamIcon } = getConstructorAssets(card.constructorId);
  const flagUrl  = getFlagUrl(card.nationality);

  // Extract champion title number for watermark (e.g. "7× CHAMPION" → "7")
  const champNum = version === 'champion' && card.versionLabel
    ? card.versionLabel.match(/\d+/)?.[0] ?? ''
    : '';

  const posBadge =
    version === 'legend'      ? 'LEG' :
    version === 'champion'    ? '★'   :
    version === 'race_winner' ? 'WIN' : 'DRV';

  return (
    <View style={[s.card, { borderColor }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={bg}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Champion diagonal stripes */}
      {version === 'champion' && (
        <>
          <View style={[s.champStripe, { backgroundColor: accent + '30', top: CARD_H * 0.28 }]} pointerEvents="none" />
          <View style={[s.champStripe, { backgroundColor: accent + '18', top: CARD_H * 0.28 + 14 }]} pointerEvents="none" />
        </>
      )}

      {/* Race winner top burst */}
      {version === 'race_winner' && (
        <LinearGradient
          colors={[accent + '40', accent + '10', 'transparent']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.65 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      )}

      {/* Legend warm vignette */}
      {version === 'legend' && (
        <LinearGradient
          colors={[accent + '18', 'transparent', accent + '14']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      )}

      {/* Animated hue */}
      <AnimatedHue accent={accent} />

      {/* Champion number watermark */}
      {champNum !== '' && (
        <Text style={[s.champWatermark, { color: accent + '14' }]}>{champNum}</Text>
      )}

      {/* Hero photo */}
      {photo && (
        <Image source={photo} style={s.heroPhoto} resizeMode="contain" />
      )}

      {/* Top fade */}
      <LinearGradient
        colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.28)', 'transparent']}
        locations={[0, 0.42, 0.72]}
        style={s.topFade}
        pointerEvents="none"
      />

      {/* Bottom fade */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
        locations={[0.25, 0.58, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Legend inner frame */}
      {version === 'legend' && (
        <View style={[s.legendFrame, { borderColor: accent + '55' }]} pointerEvents="none" />
      )}

      {/* Top-left: OVR */}
      <View style={s.topLeft}>
        <Text style={[s.overallNum, { color: text }]}>{card.overall}</Text>
        <Text style={[s.posBadge, { color: accent }]}>{posBadge}</Text>
      </View>

      {/* Top-right: flag + team icon */}
      <View style={s.topRight}>
        {flagUrl && (
          <Image source={{ uri: flagUrl }} style={s.flagImg} resizeMode="cover" />
        )}
        {teamIcon && (
          <Image source={teamIcon} style={s.teamBadge} resizeMode="contain" />
        )}
      </View>

      {/* Bottom strip */}
      <View style={s.bottomSection}>
        <View style={[s.stripTop, { backgroundColor: accent }]} />
        <Text style={s.lastName} numberOfLines={1}>{card.lastName.toUpperCase()}</Text>
        {card.versionLabel && (
          <Text style={[s.versionLabel, { color: accent }]}>{card.versionLabel}</Text>
        )}
        <View style={[s.statsDivider, { backgroundColor: accent + '55' }]} />
        <View style={s.statsGrid}>
          <StatItem label="PAC" value={card.stats.pac} accent={accent} text={text} />
          <StatItem label="RAC" value={card.stats.rac} accent={accent} text={text} />
          <StatItem label="CON" value={card.stats.con} accent={accent} text={text} />
          <StatItem label="EXP" value={card.stats.exp} accent={accent} text={text} />
          <StatItem label="DEF" value={card.stats.def} accent={accent} text={text} />
          <StatItem label="ATK" value={card.stats.atk} accent={accent} text={text} />
        </View>
      </View>
    </View>
  );
}

// ─── Constructor Card ─────────────────────────────────────────────────────────

function ConstructorCardView({ card }: { card: ConstructorCard }) {
  const base        = RARITY_COLORS[card.rarity];
  const bg          = card.customBg ?? base.bg;
  const accent      = card.customAccent ?? base.accent;
  const text        = base.text;
  const borderColor = card.customBorderColor ?? RARITY_BORDER[card.rarity];
  const version     = card.cardVersion ?? 'base';
  const { icon: teamIcon, color: teamColor } = getConstructorAssets(card.constructorId);
  const flagUrl = getFlagUrl(card.nationality);

  return (
    <View style={[s.card, { borderColor }]}>
      {/* Static background gradient */}
      <LinearGradient
        colors={bg}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Team color glow */}
      <LinearGradient
        colors={['transparent', teamColor + '38', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Animated hue layers */}
      <AnimatedHue accent={accent} />

      {/* Team logo */}
      {teamIcon && (
        <View style={s.constructorLogoArea}>
          <Image source={teamIcon} style={s.constructorLogo} resizeMode="contain" />
        </View>
      )}

      {/* Top fade */}
      <LinearGradient
        colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.2)', 'transparent']}
        locations={[0, 0.4, 0.7]}
        style={s.topFade}
        pointerEvents="none"
      />

      {/* Bottom fade */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.90)']}
        locations={[0.25, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Legend inner frame */}
      {version === 'legend' && (
        <View style={[s.legendFrame, { borderColor: accent + '55' }]} pointerEvents="none" />
      )}

      {/* Top-left: OVR */}
      <View style={s.topLeft}>
        <Text style={[s.overallNum, { color: text }]}>{card.overall}</Text>
        <Text style={[s.posBadge, { color: accent }]}>
          {version === 'legend' ? 'LEG' : 'CON'}
        </Text>
      </View>

      {/* Top-right: flag */}
      <View style={s.topRight}>
        {flagUrl && (
          <Image source={{ uri: flagUrl }} style={s.flagImg} resizeMode="cover" />
        )}
      </View>

      {/* Bottom strip */}
      <View style={s.bottomSection}>
        <View style={[s.stripTop, { backgroundColor: accent }]} />
        <Text style={[s.lastName, { fontSize: 11 }]} numberOfLines={1}>
          {card.name.toUpperCase()}
        </Text>
        {card.versionLabel && (
          <Text style={[s.versionLabel, { color: accent }]}>{card.versionLabel}</Text>
        )}
        <View style={[s.statsDivider, { backgroundColor: accent + '55' }]} />
        <View style={s.statsGrid}>
          <StatItem label="CAR" value={card.stats.car} accent={accent} text={text} />
          <StatItem label="REL" value={card.stats.rel} accent={accent} text={text} />
          <StatItem label="STR" value={card.stats.str} accent={accent} text={text} />
          <StatItem label="PIT" value={card.stats.pit} accent={accent} text={text} />
          <StatItem label="DEV" value={card.stats.dev} accent={accent} text={text} />
          <StatItem label="BGT" value={card.stats.bgt} accent={accent} text={text} />
        </View>
      </View>
    </View>
  );
}

// ─── Legend animated sheen (light sweep on marble) ───────────────────────────

function LegendAnimatedSheen() {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-CARD_W * 0.6, CARD_W * 0.6] });

  return (
    <Animated.View pointerEvents="none" style={[ls.sheen, { transform: [{ translateX: sweepX }] }]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.5)', 'rgba(255,240,180,0.28)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

// ─── Legend Card ──────────────────────────────────────────────────────────────

function LegendCardView({ card }: { card: DriverCard }) {
  const GOLD   = '#c8a000';
  const GOLD2  = '#d4af37';
  const DARK   = '#1a1008';

  const photo    = getDriverPhoto(card.driverId);
  const { icon: teamIcon } = getConstructorAssets(card.constructorId);
  const flagUrl  = getFlagUrl(card.nationality);

  const STRIP_H = Math.floor(CARD_H * 0.35);
  const PHOTO_H = CARD_H - STRIP_H;

  return (
    <View style={ls.card}>
      {/* Marble base */}
      <LinearGradient
        colors={['#f8f4ec', '#ede5d0', '#f4f0e4']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Marble sheen diagonal */}
      <LinearGradient
        colors={['rgba(255,255,255,0.55)', 'transparent', 'rgba(255,255,255,0.3)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Warm gold tint */}
      <LinearGradient
        colors={['transparent', 'rgba(200,160,0,0.07)', 'transparent']}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Marble veins */}
      <View style={ls.vein1} />
      <View style={ls.vein2} />

      {/* Animated light sheen */}
      <LegendAnimatedSheen />

      {/* Hero photo */}
      {photo && (
        <Image
          source={photo}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: PHOTO_H, width: CARD_W }}
          resizeMode="contain"
        />
      )}

      {/* Sepia overlay on photo */}
      {photo && (
        <LinearGradient
          colors={['rgba(180,140,50,0.22)', 'rgba(160,120,30,0.12)', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: PHOTO_H }}
          pointerEvents="none"
        />
      )}

      {/* Fade into bottom strip */}
      <LinearGradient
        colors={['transparent', 'rgba(245,238,218,0.7)', 'rgba(245,238,218,0.97)']}
        locations={[0.55, 0.75, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CARD_H }}
        pointerEvents="none"
      />

      {/* Inner gold frame */}
      <View style={[ls.innerFrame, { borderColor: GOLD2 + '70' }]} pointerEvents="none" />

      {/* Corner diamonds */}
      <View style={[ls.corner, ls.cornerTL, { borderColor: GOLD }]} />
      <View style={[ls.corner, ls.cornerTR, { borderColor: GOLD }]} />
      <View style={[ls.corner, ls.cornerBL, { borderColor: GOLD }]} />
      <View style={[ls.corner, ls.cornerBR, { borderColor: GOLD }]} />

      {/* Top-left: OVR */}
      <View style={ls.topLeft}>
        <Text style={[ls.overallNum, { color: DARK }]}>{card.overall}</Text>
        <Text style={[ls.posBadge, { color: GOLD }]}>LEG</Text>
      </View>

      {/* Top-right: flag + team badge */}
      <View style={ls.topRight}>
        {flagUrl && (
          <Image source={{ uri: flagUrl }} style={ls.topFlagImg} resizeMode="cover" />
        )}
        {teamIcon && <Image source={teamIcon} style={ls.topTeamBadge} resizeMode="contain" />}
      </View>

      {/* Bottom strip */}
      <View style={ls.strip}>
        {/* Gold top divider */}
        <View style={[ls.stripTop, { backgroundColor: GOLD }]} />

        <Text style={[ls.lastName, { color: DARK }]} numberOfLines={1}>
          {card.lastName}
        </Text>
        <Text style={[ls.versionBadge, { color: GOLD }]}>✦ LEGEND ✦</Text>

        <View style={[ls.statsDivider, { backgroundColor: GOLD + '50' }]} />

        <View style={ls.statsGrid}>
          <StatItem label="PAC" value={card.stats.pac} accent={GOLD} text={DARK} />
          <StatItem label="RAC" value={card.stats.rac} accent={GOLD} text={DARK} />
          <StatItem label="CON" value={card.stats.con} accent={GOLD} text={DARK} />
          <StatItem label="EXP" value={card.stats.exp} accent={GOLD} text={DARK} />
          <StatItem label="DEF" value={card.stats.def} accent={GOLD} text={DARK} />
          <StatItem label="ATK" value={card.stats.atk} accent={GOLD} text={DARK} />
        </View>
      </View>
    </View>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function FantasyCardView({ card }: { card: FantasyCard }) {
  if (card.type === 'driver' && card.rarity === 'legend') return <LegendCardView card={card as DriverCard} />;
  if (card.type === 'driver') return <DriverCardView card={card as DriverCard} />;
  return <ConstructorCardView card={card as ConstructorCard} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 11,
    borderWidth: 1.5,
    overflow: 'hidden',
  },

  // ── Version-specific decorations ──────────────────────────────────────
  champStripe: {
    position: 'absolute',
    left: -CARD_W,
    width: CARD_W * 3,
    height: 10,
    transform: [{ rotate: '-32deg' }],
  },
  champWatermark: {
    position: 'absolute',
    fontSize: CARD_H * 0.52,
    fontWeight: '900',
    right: -CARD_W * 0.08,
    bottom: CARD_H * 0.12,
    lineHeight: CARD_H * 0.52,
  },
  legendFrame: {
    position: 'absolute',
    top: 5, left: 5, right: 5, bottom: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  versionLabel: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── Animated hue ───────────────────────────────────────────────────────
  hueSweep: {
    position: 'absolute',
    top: 0,
    // wider than card so the sweep enters/exits cleanly
    left: -CARD_W * 0.5,
    width: CARD_W * 2,
    height: CARD_H,
  },
  // ── Hero photo ─────────────────────────────────────────────────────────
  heroPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    width: CARD_W,
    height: CARD_H - 80,
  },

  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_H * 0.46,
  },

  // ── Overlays ───────────────────────────────────────────────────────────
  topLeft: {
    position: 'absolute',
    top: 8,
    left: 10,
  },
  overallNum: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  posBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  topRight: {
    position: 'absolute',
    top: 8,
    right: 9,
    alignItems: 'flex-end',
    gap: 5,
  },
  flagImg: {
    width: 26,
    height: 17,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  teamBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },

  // ── Bottom section ─────────────────────────────────────────────────────
  bottomSection: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 9, paddingBottom: 6, paddingTop: 5,
    backgroundColor: 'rgba(8,6,18,0.72)',
  },
  stripTop: { height: 1.5, marginBottom: 3 },
  lastName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 1,
  },
  statsDivider: { height: 0.5, marginBottom: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '33.33%',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 2,
  },
  statVal: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  statLbl: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    lineHeight: 14,
    opacity: 0.85,
  },

  // ── Constructor hero ──────────────────────────────────────────────────
  constructorLogoArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  constructorLogo: {
    width: CARD_W * 0.58,
    height: CARD_W * 0.58,
    borderRadius: 8,
  },
});

// ─── Legend card styles ───────────────────────────────────────────────────────

const STRIP_H = Math.floor(CARD_H * 0.35);

const ls = StyleSheet.create({
  card: {
    width: CARD_W, height: CARD_H,
    borderRadius: 12, borderWidth: 2, borderColor: '#c8a000',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute', top: 0,
    left: -CARD_W * 0.6, width: CARD_W * 2.2, height: CARD_H,
  },
  vein1: {
    position: 'absolute', top: '20%',
    left: -CARD_W, width: CARD_W * 3, height: 1,
    backgroundColor: 'rgba(200,160,0,0.14)',
    transform: [{ rotate: '-9deg' }],
  },
  vein2: {
    position: 'absolute', top: '48%',
    left: -CARD_W, width: CARD_W * 3, height: 0.5,
    backgroundColor: 'rgba(200,160,0,0.09)',
    transform: [{ rotate: '-13deg' }],
  },
  innerFrame: {
    position: 'absolute', top: 5, left: 5, right: 5, bottom: 5,
    borderRadius: 8, borderWidth: 1,
  },
  corner: {
    position: 'absolute', width: 9, height: 9,
    borderWidth: 1, transform: [{ rotate: '45deg' }],
    backgroundColor: '#f4f0e4',
  },
  cornerTL: { top: 2, left: 2 },
  cornerTR: { top: 2, right: 2 },
  cornerBL: { bottom: 2, left: 2 },
  cornerBR: { bottom: 2, right: 2 },
  topLeft: { position: 'absolute', top: 10, left: 12 },
  topRight: { position: 'absolute', top: 10, right: 10 },
  overallNum: {
    fontSize: 30, fontWeight: '900', lineHeight: 32, color: '#1a1008',
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  posBadge: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  topFlagImg: {
    width: 26, height: 17, borderRadius: 2,
    borderWidth: 0.5, borderColor: 'rgba(200,160,0,0.4)',
  },
  topTeamBadge: { width: 22, height: 22 },
  strip: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: STRIP_H,
    backgroundColor: 'rgba(245,238,218,0.96)',
    paddingHorizontal: 9, paddingTop: 5, paddingBottom: 4,
  },
  stripTop: { height: 1.5, marginBottom: 3 },
  lastName: {
    fontSize: 13, fontWeight: '900', textAlign: 'center',
    letterSpacing: 0.3, marginBottom: 1,
  },
  versionBadge: {
    fontSize: 6, fontWeight: '800', letterSpacing: 2,
    textAlign: 'center', marginBottom: 3,
  },
  statsDivider: { height: 0.5, marginBottom: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
});
