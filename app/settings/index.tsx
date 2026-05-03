import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  saveUsername,
  getNotificationsEnabled,
  setNotificationsEnabled,
} from '../../lib/storage';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  openNotificationSettings,
} from '../../lib/notifications';
import { useFavorites } from '../../lib/FavoritesContext';

// ─── Design tokens ─────────────────────────────────────────────────
const D = {
  bg:      '#f2f2f2',
  card:    '#ffffff',
  text:    '#111111',
  sub:     'rgba(0,0,0,0.4)',
  dim:     'rgba(0,0,0,0.2)',
  border:  'rgba(0,0,0,0.06)',
  accent:  '#111111',
  padH:    20,
} as const;

// ─── Screen ────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { favoriteDrivers, favoriteConstructors, removeFavoriteDriver, removeFavoriteConstructor } = useFavorites();
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);

  useEffect(() => {
    getNotificationsEnabled().then(setNotificationsEnabledState);
  }, []);

  const handleNotificationsToggle = async (value: boolean) => {
    if (value) {
      const status = await getNotificationPermissionStatus();

      if (status === 'denied') {
        // System permission was denied — can't re-request, send user to settings
        Alert.alert(
          'Notifications Blocked',
          'You\'ve previously denied notifications. To enable them, allow APEX in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openNotificationSettings },
          ],
        );
        return;
      }

      if (status === 'undetermined') {
        // Haven't asked yet — request now
        const result = await requestNotificationPermission();
        const granted = result === 'granted';
        setNotificationsEnabledState(granted);
        return;
      }

      // Permission is granted — just enable the preference
      await setNotificationsEnabled(true);
      setNotificationsEnabledState(true);
    } else {
      await setNotificationsEnabled(false);
      setNotificationsEnabledState(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will clear your favorites, predictions, and display name. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // Remove each favorite (updates both AsyncStorage and in-memory state)
            for (const id of [...favoriteDrivers]) await removeFavoriteDriver(id);
            for (const id of [...favoriteConstructors]) await removeFavoriteConstructor(id);
            // Reset username
            await saveUsername('F1 Fan');
            router.back();
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={D.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      {/* ── Notifications ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSub}>Race results, standings updates, and more</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: 'rgba(0,0,0,0.1)', true: D.accent }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </View>

      {/* ── Data ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.card}>
          <InfoRow label="Source" value="Ergast API" />
          <InfoRow label="Mirror" value="api.jolpi.ca" last />
        </View>
      </View>

      {/* ── About ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <InfoRow label="App" value="APEX" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Platform" value="Expo SDK 54" last />
        </View>
      </View>

      {/* ── Danger zone ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.destructiveRow} onPress={handleResetData} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={D.accent} style={{ marginRight: 12 }} />
            <Text style={styles.destructiveText}>Reset All Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  content:   { paddingBottom: 60, paddingHorizontal: D.padH },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 28,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: D.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: D.text,
    letterSpacing: -0.5,
  },

  // Sections
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: D.sub,
    letterSpacing: 2,
    marginBottom: 10,
  },
  card: {
    backgroundColor: D.card,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: D.text },
  rowSub:   { fontSize: 11, color: D.sub, marginTop: 2 },
  rowValue: { fontSize: 13, fontWeight: '500', color: D.sub },

  // Destructive row
  destructiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  destructiveText: {
    fontSize: 14,
    fontWeight: '600',
    color: D.accent,
  },
});
