import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Race } from '../types/race';
import { formatRaceDateTimeLocal } from '../lib/api';
import { getCircuitMap } from '../lib/circuitAssets';

type Props = { race: Race; onPress?: () => void };

function isCompleted(dateStr: string) {
  return new Date(dateStr) < new Date();
}

function isThisWeekend(dateStr: string) {
  const race = new Date(dateStr);
  const diff = (race.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= -2 && diff <= 4;
}

export default function RaceListItem({ race, onPress }: Props) {
  const { dateStr }  = formatRaceDateTimeLocal(race.date, race.time);
  const CircuitMap   = getCircuitMap(race.Circuit.circuitId ?? '');
  const completed    = isCompleted(race.date);
  const thisWeekend  = isThisWeekend(race.date) && !completed;

  // ── Visual variant ──────────────────────────────────────────────
  // thisWeekend → dark card   completed → muted card   else → normal
  const cardStyle   = thisWeekend ? styles.cardDark    : completed ? styles.cardMuted    : styles.card;
  const imageStyle  = thisWeekend ? styles.imageBoxDark : completed ? styles.imageBoxMuted : styles.imageBox;
  const localStyle  = thisWeekend ? styles.localityDark : completed ? styles.localityMuted : styles.locality;
  const nameStyle   = thisWeekend ? styles.nameDark     : completed ? styles.nameMuted     : styles.name;
  const dateStyle   = thisWeekend ? styles.dateDark     : completed ? styles.dateMuted     : styles.date;
  const chevronColor = thisWeekend ? 'rgba(255,255,255,0.4)' : completed ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.35)';

  return (
    <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.85}>

      {/* Circuit map box */}
      <View style={imageStyle}>
        {CircuitMap && <CircuitMap width={110} height={110} />}
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>RD {race.round}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.infoLeft}>
          <Text style={localStyle}>
            {race.Circuit.Location.locality}, {race.Circuit.Location.country}
          </Text>
          <Text style={nameStyle} numberOfLines={2}>{race.raceName}</Text>
          <Text style={dateStyle}>{dateStr}</Text>

          {thisWeekend && (
            <View style={styles.weekendBadge}>
              <View style={styles.weekendDot} />
              <Text style={styles.weekendText}>THIS WEEKEND</Text>
            </View>
          )}
        </View>

        {completed
          ? <Ionicons name="checkmark" size={16} color="rgba(0,0,0,0.2)" />
          : <Ionicons name="chevron-forward" size={16} color={chevronColor} />
        }
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Card variants ────────────────────────────────────────────────
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f7f7f7', borderRadius: 22,
    overflow: 'hidden', gap: 16, paddingRight: 16,
  },
  cardDark: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', borderRadius: 22,
    overflow: 'hidden', gap: 16, paddingRight: 16,
  },
  cardMuted: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f0f0', borderRadius: 22,
    overflow: 'hidden', gap: 16, paddingRight: 16,
    opacity: 0.6,
  },

  // ── Image box variants ───────────────────────────────────────────
  imageBox: {
    width: 130, height: 130, flexShrink: 0,
    backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center',
  },
  imageBoxDark: {
    width: 130, height: 130, flexShrink: 0,
    backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center',
  },
  imageBoxMuted: {
    width: 130, height: 130, flexShrink: 0,
    backgroundColor: '#222',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Round badge (same across all variants) ───────────────────────
  roundBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  roundText: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },

  // ── Text — normal ────────────────────────────────────────────────
  locality: { fontSize: 10, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  name:     { fontSize: 15, fontWeight: '900', color: '#111', letterSpacing: -0.4, lineHeight: 19 },
  date:     { fontSize: 11, fontWeight: '500', color: '#888' },

  // ── Text — dark card (this weekend) ─────────────────────────────
  localityDark: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.5 },
  nameDark:     { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: -0.4, lineHeight: 19 },
  dateDark:     { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.45)' },

  // ── Text — muted (completed) ─────────────────────────────────────
  localityMuted: { fontSize: 10, fontWeight: '600', color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.5 },
  nameMuted:     { fontSize: 15, fontWeight: '900', color: '#999', letterSpacing: -0.4, lineHeight: 19 },
  dateMuted:     { fontSize: 11, fontWeight: '500', color: '#bbb' },

  // ── Info row ─────────────────────────────────────────────────────
  info:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLeft: { flex: 1, gap: 3 },

  // ── This weekend badge ───────────────────────────────────────────
  weekendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  weekendDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  weekendText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
});
