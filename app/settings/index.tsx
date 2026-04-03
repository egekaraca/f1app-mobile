import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavorites } from '../../lib/FavoritesContext';
import { getDriverStandings, getConstructorStandings } from '../../lib/api';

const SEASON = '2025';

// ─── Design tokens ─────────────────────────────────────────────────
const D = {
  bg:      '#ffffff',
  card:    '#111111',
  text:    '#ffffff',
  sub:     'rgba(255,255,255,0.45)',
  dark:    '#111111',
  mid:     '#888888',
  light:   '#f5f5f5',
  border:  'rgba(255,255,255,0.08)',
  accent:  '#E10600',
  padH:    20,
} as const;

const PLACEHOLDER = require('../../assets/images/pia_placeholder.jpeg');

// ─── Screen ────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { favoriteDrivers, favoriteConstructors, toggleFavoriteDriver, toggleFavoriteConstructor } = useFavorites();
  const [pickerMode, setPickerMode] = useState<'drivers' | 'constructors' | null>(null);
  const insets = useSafeAreaInsets();

  const { data: drivers, isLoading: dl } = useQuery({
    queryKey: ['driver-standings', SEASON],
    queryFn: () => getDriverStandings(SEASON),
    staleTime: 1000 * 60 * 5,
  });

  const { data: constructors, isLoading: cl } = useQuery({
    queryKey: ['constructor-standings', SEASON],
    queryFn: () => getConstructorStandings(SEASON),
    staleTime: 1000 * 60 * 5,
  });

  const favDriverData   = drivers?.filter(d => favoriteDrivers.includes(d.Driver.driverId)) ?? [];
  const favConstructorData = constructors?.filter(c => favoriteConstructors.includes(c.Constructor.constructorId)) ?? [];

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.pageTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
            <Ionicons name="settings" size={28} color={D.dark} />
          </TouchableOpacity>
        </View>

        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroEyebrow}>APEX FAN · {SEASON}</Text>
            <Text style={styles.heroName}>F1 Fan</Text>
            <View style={styles.heroTagRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{favoriteDrivers.length} Drivers</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{favoriteConstructors.length} Teams</Text>
              </View>
            </View>
          </View>
          {/* Photo — McLaren orange bg as placeholder team color */}
          <View style={styles.heroPhotoWrap}>
            <Image source={PLACEHOLDER} style={styles.heroPhoto} resizeMode="cover" />
          </View>
        </View>

        {/* ── My Drivers ── */}
        <View style={styles.section}>
          <SectionHeader label="My" bold="Drivers" />
          {dl ? (
            <ActivityIndicator color={D.accent} style={styles.loader} />
          ) : favDriverData.length === 0 ? (
            <EmptyCard label="No favorite drivers yet" />
          ) : (
            favDriverData.map(d => (
              <DriverFavCard
                key={d.Driver.driverId}
                position={Number(d.position)}
                firstName={d.Driver.givenName}
                lastName={d.Driver.familyName}
                team={d.Constructors?.[0]?.name ?? '—'}
                points={d.points}
                onRemove={() => toggleFavoriteDriver(d.Driver.driverId)}
              />
            ))
          )}
          <AddButton label="Add drivers" onPress={() => setPickerMode('drivers')} />
        </View>

        {/* ── My Teams ── */}
        <View style={styles.section}>
          <SectionHeader label="My" bold="Teams" />
          {cl ? (
            <ActivityIndicator color={D.accent} style={styles.loader} />
          ) : favConstructorData.length === 0 ? (
            <EmptyCard label="No favorite teams yet" />
          ) : (
            favConstructorData.map(c => (
              <TeamFavCard
                key={c.Constructor.constructorId}
                position={Number(c.position)}
                name={c.Constructor.name}
                nationality={c.Constructor.nationality ?? '—'}
                points={c.points}
                onRemove={() => toggleFavoriteConstructor(c.Constructor.constructorId)}
              />
            ))
          )}
          <AddButton label="Add teams" onPress={() => setPickerMode('constructors')} />
        </View>

        {/* ── App info ── */}
        <View style={styles.section}>
          <SectionHeader label="App" bold="Info" />
          <View style={styles.infoCard}>
            <InfoRow label="Version"  value="1.0.0" />
            <InfoRow label="Season"   value={SEASON} />
            <InfoRow label="Data"     value="Ergast API" last />
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Favorites picker modal ── */}
      <Modal
        visible={pickerMode !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerMode(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {pickerMode === 'drivers' ? 'Select Drivers' : 'Select Teams'}
            </Text>
            <TouchableOpacity onPress={() => setPickerMode(null)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={D.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {pickerMode === 'drivers' && drivers?.map(d => {
              const selected = favoriteDrivers.includes(d.Driver.driverId);
              return (
                <TouchableOpacity
                  key={d.Driver.driverId}
                  style={[styles.pickerRow, selected && styles.pickerRowSelected]}
                  onPress={() => toggleFavoriteDriver(d.Driver.driverId)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerPos}>{d.position}</Text>
                  <View style={styles.pickerInfo}>
                    <Text style={styles.pickerName}>
                      {d.Driver.givenName}{' '}
                      <Text style={styles.pickerNameBold}>{d.Driver.familyName}</Text>
                    </Text>
                    <Text style={styles.pickerSub}>{d.Constructors?.[0]?.name ?? '—'} · {d.points} pts</Text>
                  </View>
                  <View style={[styles.pickerCheck, selected && styles.pickerCheckSelected]}>
                    {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}

            {pickerMode === 'constructors' && constructors?.map(c => {
              const selected = favoriteConstructors.includes(c.Constructor.constructorId);
              return (
                <TouchableOpacity
                  key={c.Constructor.constructorId}
                  style={[styles.pickerRow, selected && styles.pickerRowSelected]}
                  onPress={() => toggleFavoriteConstructor(c.Constructor.constructorId)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerPos}>{c.position}</Text>
                  <View style={styles.pickerInfo}>
                    <Text style={styles.pickerNameBold}>{c.Constructor.name}</Text>
                    <Text style={styles.pickerSub}>{c.Constructor.nationality} · {c.points} pts</Text>
                  </View>
                  <View style={[styles.pickerCheck, selected && styles.pickerCheckSelected]}>
                    {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function SectionHeader({ label, bold }: { label: string; bold: string }) {
  return (
    <Text style={styles.sectionTitle}>
      {label} <Text style={styles.sectionBold}>{bold}</Text>
    </Text>
  );
}

function DriverFavCard({ position, firstName, lastName, team, points, onRemove }: {
  position: number;
  firstName: string;
  lastName: string;
  team: string;
  points: number;
  onRemove: () => void;
}) {
  return (
    <View style={styles.favCard}>
      <Text style={styles.favPosition}>{position}</Text>
      <View style={styles.favNameBlock}>
        <Text style={styles.favFirst}>{firstName}</Text>
        <Text style={styles.favLast}>{lastName}</Text>
      </View>
      <View style={styles.favPills}>
        <Pill label={`${points} PTS`} />
        <Pill label={team} dim />
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={14} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
    </View>
  );
}

function TeamFavCard({ position, name, nationality, points, onRemove }: {
  position: number;
  name: string;
  nationality: string;
  points: number;
  onRemove: () => void;
}) {
  return (
    <View style={styles.favCard}>
      <Text style={styles.favPosition}>{position}</Text>
      <View style={styles.favNameBlock}>
        <Text style={styles.favFirst}>{nationality}</Text>
        <Text style={styles.favLast}>{name}</Text>
      </View>
      <View style={styles.favPills}>
        <Pill label={`${points} PTS`} />
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={14} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
    </View>
  );
}

function Pill({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <View style={[styles.pill, dim && styles.pillDim]}>
      <Text style={styles.pillText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.addBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="add" size={16} color={D.dark} />
      <Text style={styles.addBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: D.bg },
  content:    { paddingBottom: 110 },
  loader:     { marginTop: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: D.padH,
    paddingTop: 20,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: D.dark,
    letterSpacing: -2,
  },
  settingsBtn: {
    padding: 4,
  },

  // Hero card
  heroCard: {
    marginHorizontal: D.padH,
    backgroundColor: D.card,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  heroLeft: { flex: 1 },
  heroEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: D.sub,
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  heroName: {
    fontSize: 30,
    fontWeight: '800',
    color: D.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  heroTagRow:  { flexDirection: 'row', gap: 8 },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: D.sub },
  heroPhotoWrap: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: '#FF8000', // placeholder team color — swap per user's team
    overflow: 'hidden',
    marginLeft: 16,
  },
  heroPhoto: { width: '100%', height: '100%' },

  // Sections
  section: {
    marginTop: 36,
    paddingHorizontal: D.padH,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '300',
    color: D.dark,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  sectionBold: { fontWeight: '800' },

  // Fav cards
  favCard: {
    backgroundColor: D.card,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  favPosition: {
    fontSize: 26,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.12)',
    width: 30,
    textAlign: 'center',
  },
  favNameBlock: { flex: 1 },
  favFirst: {
    fontSize: 11,
    fontWeight: '300',
    color: D.sub,
    marginBottom: 1,
  },
  favLast: {
    fontSize: 16,
    fontWeight: '800',
    color: D.text,
    letterSpacing: -0.3,
  },
  favPills: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 90,
  },
  pillDim: { backgroundColor: 'rgba(255,255,255,0.05)' },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: D.text,
    letterSpacing: 0.2,
  },
  removeBtn: { padding: 4 },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: D.light,
    borderRadius: 14,
    marginTop: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: D.dark,
  },

  // Empty card
  emptyCard: {
    backgroundColor: D.light,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: D.mid,
    fontWeight: '500',
  },

  // Info card
  infoCard: {
    backgroundColor: D.card,
    borderRadius: 18,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  infoLabel: {
    fontSize: 14,
    color: D.sub,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: D.text,
  },

  // Picker modal
  modalContainer: {
    flex: 1,
    backgroundColor: D.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: D.padH,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: D.dark,
    letterSpacing: -0.5,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: D.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: D.padH,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 14,
  },
  pickerRowSelected: {
    backgroundColor: '#fafafa',
  },
  pickerPos: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ccc',
    width: 28,
    textAlign: 'center',
  },
  pickerInfo: { flex: 1 },
  pickerName: {
    fontSize: 15,
    fontWeight: '300',
    color: D.dark,
  },
  pickerNameBold: {
    fontWeight: '800',
    color: D.dark,
  },
  pickerSub: {
    fontSize: 11,
    color: D.mid,
    marginTop: 2,
  },
  pickerCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCheckSelected: {
    backgroundColor: D.dark,
    borderColor: D.dark,
  },
});
