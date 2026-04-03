import React from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getSeasonRaces } from '../../lib/api';
import { useSeason } from '../../lib/SeasonContext';
import RaceListItem from '../../components/RaceListItem';

export default function RacesScreen() {
  const insets = useSafeAreaInsets();
  const { season } = useSeason();
  const router = useRouter();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['races', season],
    queryFn: () => getSeasonRaces(season),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Races</Text>
        <View style={styles.seasonBadge}>
          <Text style={styles.seasonText}>{season}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : isError || !data ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load calendar.</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => `${item.season}-${item.round}`}
          renderItem={({ item }) => (
            <RaceListItem
              race={item}
              onPress={() => router.push(`/races/${item.round}`)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#111" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 52,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -2,
  },
  seasonBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  seasonText: { fontSize: 14, fontWeight: '700', color: '#111' },
  list: { paddingHorizontal: 20, paddingBottom: 120, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorText: { fontSize: 14, color: '#888' },
  retryText: { fontSize: 14, fontWeight: '700', color: '#111' },
});
