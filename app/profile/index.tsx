import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Modal, SafeAreaView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useFavorites } from '../../lib/FavoritesContext';
import { getDriverStandings, getConstructorStandings } from '../../lib/api';
import { getUsername, saveUsername } from '../../lib/storage';
import { useSeason } from '../../lib/SeasonContext';

import { Filter as BadWordsFilter } from 'bad-words';
const profanityFilter = new BadWordsFilter();

// ─── Team accent colors ────────────────────────────────────────────
const TEAM_COLORS: Record<string, string> = {
  mclaren:      '#FF8000',
  ferrari:      '#E8002D',
  red_bull:     '#3671C6',
  mercedes:     '#27F4D2',
  aston_martin: '#229971',
  alpine:       '#FF87BC',
  williams:     '#64C4FF',
  haas:         '#B6BABD',
  kick_sauber:  '#52E252',
  sauber:       '#52E252',
  rb:           '#6692FF',
};
const DEFAULT_ACCENT = '#111111';

// ─── Design tokens ─────────────────────────────────────────────────
const D = {
  bg:     '#f2f2f2',
  card:   '#ffffff',
  text:   '#111111',
  sub:    'rgba(0,0,0,0.4)',
  dim:    'rgba(0,0,0,0.2)',
  border: 'rgba(0,0,0,0.06)',
  accent: '#111111',
  padH:   20,
} as const;

// ─── Screen ────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { season } = useSeason();
  const {
    favoriteDrivers, favoriteConstructors,
    toggleFavoriteDriver, toggleFavoriteConstructor,
  } = useFavorites();

  const [pickerMode, setPickerMode] = useState<'drivers' | 'constructors' | null>(null);
  const [displayName, setDisplayName] = useState('F1 Fan');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    getUsername().then(setDisplayName);
  }, []);

  useEffect(() => {
    if (editingName) {
      setNameInput(displayName);
      setNameError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editingName, displayName]);

  const accentColor =
    TEAM_COLORS[favoriteConstructors[0]] ?? DEFAULT_ACCENT;

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  // ── Name save / validation ──────────────────────────────────────
  const commitName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Name can't be empty.");
      return;
    }
    if (trimmed.length > 20) {
      setNameError('Name must be 20 characters or fewer.');
      return;
    }
    if (profanityFilter.isProfane(trimmed)) {
      setNameError("That name isn't allowed.");
      return;
    }
    setDisplayName(trimmed);
    await saveUsername(trimmed);
    setEditingName(false);
    setNameError('');
  };

  const cancelEdit = () => {
    setEditingName(false);
    setNameError('');
  };

  // ── Data queries ───────────────────────────────────────────────
  const { data: drivers, isLoading: dl } = useQuery({
    queryKey: ['driver-standings', season],
    queryFn:  () => getDriverStandings(season),
    staleTime: 1000 * 60 * 5,
  });
  const { data: constructors, isLoading: cl } = useQuery({
    queryKey: ['constructor-standings', season],
    queryFn:  () => getConstructorStandings(season),
    staleTime: 1000 * 60 * 5,
  });

  const favDriverData = drivers?.filter(d =>
    favoriteDrivers.includes(d.Driver.driverId)) ?? [];
  const favConstructorData = constructors?.filter(c =>
    favoriteConstructors.includes(c.Constructor.constructorId)) ?? [];

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.pageTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={24} color="rgba(0,0,0,0.4)" />
          </TouchableOpacity>
        </View>

        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: accentColor + '33', borderColor: accentColor }]}>
            <Text style={[styles.avatarInitials, { color: accentColor }]}>{initials}</Text>
          </View>

          {/* Identity */}
          <View style={styles.heroRight}>
            {editingName ? (
              <View>
                <View style={styles.nameInputRow}>
                  <TextInput
                    ref={inputRef}
                    style={styles.nameInput}
                    value={nameInput}
                    onChangeText={t => { setNameInput(t); setNameError(''); }}
                    onSubmitEditing={commitName}
                    onBlur={commitName}
                    maxLength={22}
                    returnKeyType="done"
                    autoCorrect={false}
                    selectionColor={accentColor}
                  />
                  <TouchableOpacity onPress={cancelEdit} style={styles.cancelBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={D.dim} />
                  </TouchableOpacity>
                </View>
                {!!nameError && <Text style={styles.nameError}>{nameError}</Text>}
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingName(true)} activeOpacity={0.7} style={styles.nameRow}>
                <Text style={styles.heroName}>{displayName}</Text>
                <Ionicons name="pencil" size={13} color={D.dim} style={{ marginLeft: 6, marginTop: 2 }} />
              </TouchableOpacity>
            )}

            <View style={styles.heroTagRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{favoriteDrivers.length} Drivers</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{favoriteConstructors.length} Teams</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── My Drivers ── */}
        <View style={styles.section}>
          <SectionHeader light="My" bold="Drivers" />
          {dl
            ? <ActivityIndicator color={D.accent} style={styles.loader} />
            : favDriverData.length === 0
              ? <EmptyCard label="No favorite drivers yet" />
              : favDriverData.map(d => (
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
          }
          <AddButton label="Add drivers" onPress={() => setPickerMode('drivers')} />
        </View>

        {/* ── My Teams ── */}
        <View style={styles.section}>
          <SectionHeader light="My" bold="Teams" />
          {cl
            ? <ActivityIndicator color={D.accent} style={styles.loader} />
            : favConstructorData.length === 0
              ? <EmptyCard label="No favorite teams yet" />
              : favConstructorData.map(c => (
                <TeamFavCard
                  key={c.Constructor.constructorId}
                  position={Number(c.position)}
                  name={c.Constructor.name}
                  nationality={c.Constructor.nationality ?? '—'}
                  points={c.points}
                  onRemove={() => toggleFavoriteConstructor(c.Constructor.constructorId)}
                />
              ))
          }
          <AddButton label="Add teams" onPress={() => setPickerMode('constructors')} />
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
              <Ionicons name="close" size={20} color="#111" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
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
                    <Text style={styles.pickerSub}>
                      {d.Constructors?.[0]?.name ?? '—'} · {d.points} pts
                    </Text>
                  </View>
                  <View style={[styles.pickerCheck, selected && styles.pickerCheckSelected]}>
                    {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
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
                    <Text style={styles.pickerSub}>
                      {c.Constructor.nationality} · {c.points} pts
                    </Text>
                  </View>
                  <View style={[styles.pickerCheck, selected && styles.pickerCheckSelected]}>
                    {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
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

function SectionHeader({ light, bold }: { light: string; bold: string }) {
  return (
    <Text style={styles.sectionTitle}>
      {light} <Text style={styles.sectionBold}>{bold}</Text>
    </Text>
  );
}

function DriverFavCard({ position, firstName, lastName, team, points, onRemove }: {
  position: number; firstName: string; lastName: string;
  team: string; points: string | number; onRemove: () => void;
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
        <Ionicons name="close" size={14} color={D.dim} />
      </TouchableOpacity>
    </View>
  );
}

function TeamFavCard({ position, name, nationality, points, onRemove }: {
  position: number; name: string; nationality: string;
  points: string | number; onRemove: () => void;
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
        <Ionicons name="close" size={14} color={D.dim} />
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
      <Ionicons name="add" size={16} color="rgba(0,0,0,0.45)" />
      <Text style={styles.addBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  content:   { paddingBottom: 110 },
  loader:    { marginTop: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: D.padH,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: D.text,
    letterSpacing: -2,
  },
  settingsBtn: { padding: 4 },

  // Hero card
  heroCard: {
    marginHorizontal: D.padH,
    backgroundColor: D.card,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroRight: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: D.text,
    letterSpacing: -0.3,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: D.text,
    letterSpacing: -0.3,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.2)',
    marginBottom: 10,
  },
  cancelBtn: { marginLeft: 8, marginBottom: 10 },
  nameError: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '500',
    marginBottom: 10,
  },
  heroTagRow: { flexDirection: 'row', gap: 8 },
  tag: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: D.sub },

  // Sections
  section: {
    marginTop: 36,
    paddingHorizontal: D.padH,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: D.text,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  favPosition: {
    fontSize: 24,
    fontWeight: '900',
    color: 'rgba(0,0,0,0.1)',
    width: 28,
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
    fontSize: 15,
    fontWeight: '800',
    color: D.text,
    letterSpacing: -0.3,
  },
  favPills: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  pill: {
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 90,
  },
  pillDim: { backgroundColor: 'rgba(0,0,0,0.04)' },
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
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 14,
    marginTop: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.45)',
  },

  // Empty card
  emptyCard: {
    backgroundColor: D.card,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 13,
    color: D.sub,
    fontWeight: '500',
  },

  // Picker modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
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
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.5,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: D.padH,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 14,
  },
  pickerRowSelected: { backgroundColor: '#fafafa' },
  pickerPos: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ccc',
    width: 26,
    textAlign: 'center',
  },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 14, fontWeight: '300', color: '#111' },
  pickerNameBold: { fontWeight: '800', color: '#111' },
  pickerSub: { fontSize: 11, color: '#888', marginTop: 2 },
  pickerCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCheckSelected: { backgroundColor: '#111', borderColor: '#111' },
});
