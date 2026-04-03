import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSeason, AVAILABLE_SEASONS } from '../lib/SeasonContext';
import { getDriverStandings, getConstructorStandings } from '../lib/api';
import { getDriverPhoto } from '../lib/driverAssets';
import { getConstructorAssets } from '../lib/constructorAssets';
import DriverStandingsScreen from './standings/drivers';
import ConstructorStandingsScreen from './standings/constructors';

// Constructor car photos keyed by Ergast constructorId — 2026 renders
const CONSTRUCTOR_CAR_IMAGES: Record<string, any> = {
  alpine:        require('../assets/f1_2026_cars/2026alpinecarright.avif'),
  aston_martin:  require('../assets/f1_2026_cars/2026astonmartincarright.avif'),
  audi:          require('../assets/f1_2026_cars/2026audicarright.avif'),
  sauber:        require('../assets/f1_2026_cars/2026audicarright.avif'),
  cadillac:      require('../assets/f1_2026_cars/2026cadillaccarright.avif'),
  ferrari:       require('../assets/f1_2026_cars/2026ferraricarright.avif'),
  haas:          require('../assets/f1_2026_cars/2026haascarright.avif'),
  mclaren:       require('../assets/f1_2026_cars/2026mclarencarright.avif'),
  mercedes:      require('../assets/f1_2026_cars/2026mercedescarright.avif'),
  rb:            require('../assets/f1_2026_cars/2026racingbullscarright.avif'),
  racing_bulls:  require('../assets/f1_2026_cars/2026racingbullscarright.avif'),
  red_bull:      require('../assets/f1_2026_cars/2026redbullracingcarright.avif'),
  williams:      require('../assets/f1_2026_cars/2026williamscarright.avif'),
};

type Category = 'drivers' | 'constructors';

// Mix 15% team colour into black for a dark tinted card background
function teamDarkBg(hex: string): string {
  if (!hex || hex.length < 7) return '#111111';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * 0.15)},${Math.round(g * 0.15)},${Math.round(b * 0.15)})`;
}

// ─── Season dropdown ──────────────────────────────────────────────
function SeasonDropdown() {
  const { season, setSeason } = useSeason();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={styles.dropdownLabel}>{season}</Text>
        <Ionicons name="chevron-down" size={13} color="#888" />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={styles.dropdownMenu}>
            {[...AVAILABLE_SEASONS].reverse().map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.dropdownItem, season === s && styles.dropdownItemActive]}
                onPress={() => { setSeason(s); setOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownItemText, season === s && styles.dropdownItemTextActive]}>
                  {s}
                </Text>
                {season === s && <Ionicons name="checkmark" size={15} color="#111" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Entry screen — two category cards ───────────────────────────
function EntryScreen({ onSelect }: { onSelect: (c: Category) => void }) {
  const insets = useSafeAreaInsets();
  const { season } = useSeason();

  // Fetch standings to resolve the current leader / season champion
  const { data: driverData } = useQuery({
    queryKey: ['driver-standings', season],
    queryFn: () => getDriverStandings(season),
    staleTime: 1000 * 60 * 5,
  });
  const { data: constructorData } = useQuery({
    queryKey: ['constructor-standings', season],
    queryFn: () => getConstructorStandings(season),
    staleTime: 1000 * 60 * 5,
  });

  // Position 1 = index 0 (Ergast returns standings sorted)
  const leadDriverId         = driverData?.[0]?.Driver?.driverId;
  const leadDriverConstrId   = driverData?.[0]?.Constructors?.[0]?.constructorId;
  const leadConstructorId    = constructorData?.[0]?.Constructor?.constructorId;

  const { color: driverTeamColor } = getConstructorAssets(leadDriverConstrId);
  const { color: constrTeamColor  } = getConstructorAssets(leadConstructorId);

  const driverImage      = getDriverPhoto(leadDriverId)
    ?? require('../assets/f1_2026_drivers/26_norris_nobg.png');
  const constructorImage = (leadConstructorId && CONSTRUCTOR_CAR_IMAGES[leadConstructorId])
    ?? require('../assets/f1_2026_cars/2026mclarencarright.avif');

  return (
    <View style={[styles.entryContainer, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.entryHeader}>
        <Text style={styles.pageTitle}>Standings</Text>
        <SeasonDropdown />
      </View>

      {/* Category cards */}
      <View style={styles.cardsContainer}>
        <TouchableOpacity style={[styles.categoryCard, { backgroundColor: teamDarkBg(driverTeamColor) }]} onPress={() => onSelect('drivers')} activeOpacity={0.88}>
          <Image source={driverImage} style={styles.categoryImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.55)']}
            locations={[0, 0.28, 0.72, 1]}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.4)']}
            locations={[0, 0.28, 0.72, 1]}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={styles.categoryLabel}>
            <Text style={styles.categoryLabelText} adjustsFontSizeToFit numberOfLines={1}>Drivers</Text>
            <Ionicons name="arrow-forward" size={22} color="#ffffff" style={styles.arrowIcon} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.categoryCard, { backgroundColor: teamDarkBg(constrTeamColor) }]} onPress={() => onSelect('constructors')} activeOpacity={0.88}>
          <Image source={constructorImage} style={styles.categoryCarImage} resizeMode="contain" />
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.55)']}
            locations={[0, 0.28, 0.72, 1]}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.4)']}
            locations={[0, 0.28, 0.72, 1]}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={styles.categoryLabel}>
            <Text style={styles.categoryLabelText} adjustsFontSizeToFit numberOfLines={1}>Constructors</Text>
            <Ionicons name="arrow-forward" size={22} color="#ffffff" style={styles.arrowIcon} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── List screen — header with back + season dropdown ─────────────
function ListHeader({ category, onBack }: { category: Category; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.listHeader, { paddingTop: insets.top + 8 }]}>
      <View style={styles.listHeaderRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.listTitle} adjustsFontSizeToFit numberOfLines={1}>
          {category === 'drivers' ? 'Drivers' : 'Constructors'}
        </Text>
        <SeasonDropdown />
      </View>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────
export default function StandingsScreen() {
  const [category, setCategory] = useState<Category | null>(null);

  if (!category) {
    return <EntryScreen onSelect={setCategory} />;
  }

  return (
    <View style={styles.listContainer}>
      <ListHeader category={category} onBack={() => setCategory(null)} />
      {category === 'drivers' ? <DriverStandingsScreen /> : <ConstructorStandingsScreen />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Entry screen
  entryContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -2,
  },
  listTitle: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -1,
    marginLeft: 8,
  },

  // Season dropdown
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 120,
    paddingRight: 20,
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemActive: {
    backgroundColor: '#f9f9f9',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  dropdownItemTextActive: {
    color: '#111',
    fontWeight: '800',
  },

  // Category cards
  cardsContainer: {
    flex: 1,
    gap: 14,
    paddingBottom: 110,
  },
  categoryCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  categoryImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  // Car image: anchored at bottom, front wing visible on the left side.
  // Width and height are explicit so the car fills the bottom of the card.
  categoryCarImage: {
    position: 'absolute',
    bottom: -30,
    left: 20,
    width: 880,
    height: 290,
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  categoryLabel: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabelText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    flexShrink: 1,
    marginRight: 10,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  arrowIcon: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // List screen
  listContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
});
