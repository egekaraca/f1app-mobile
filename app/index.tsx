import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useFavorites } from '../lib/FavoritesContext';
import { fetchF1News } from '../lib/news';
import {
  getTopDrivers,
  getTopConstructors,
  getNextRace,
  getLatestRaceResults,
  getDriverStandingById,
  getConstructorStandingForSeason,
  formatRaceDateTimeLocal,
} from '../lib/api';
import { NewsCard } from '../components/NewsCard';
import { DriverCard } from '../components/DriverCard';
import { ChampionshipCard } from '../components/ChampionshipCard';
import { NextRaceCard } from '../components/NextRaceCard';
import { ChampionshipPredictionCard } from '../components/ChampionshipPredictionCard';
import type { DriverStanding, ConstructorStanding } from '../types/standings';
import type { Race } from '../types/race';

const SEASON = '2025';

export default function Home() {
  const router = useRouter();
  const { favoriteDrivers, favoriteConstructors, isLoading: favoritesLoading } = useFavorites();
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch all data
  const { data: topDrivers, isLoading: driversLoading } = useQuery({
    queryKey: ['top-drivers', SEASON],
    queryFn: () => getTopDrivers(SEASON, 3),
    staleTime: 1000 * 60 * 5,
  });

  const { data: topConstructors, isLoading: constructorsLoading } = useQuery({
    queryKey: ['top-constructors', SEASON],
    queryFn: () => getTopConstructors(SEASON, 3),
    staleTime: 1000 * 60 * 5,
  });

  const { data: nextRace, isLoading: nextRaceLoading } = useQuery({
    queryKey: ['next-race', SEASON],
    queryFn: () => getNextRace(SEASON),
    staleTime: 1000 * 60 * 5,
  });

  const { data: latestRace, isLoading: latestRaceLoading } = useQuery({
    queryKey: ['latest-race', SEASON],
    queryFn: () => getLatestRaceResults(SEASON),
    staleTime: 1000 * 60 * 5,
  });

  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ['f1-news'],
    queryFn: fetchF1News,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch favorite drivers' standings
  const favoriteDriverQueries = useQuery({
    queryKey: ['favorite-drivers-standings', SEASON, favoriteDrivers],
    queryFn: async () => {
      if (favoriteDrivers.length === 0) return [];
      const promises = favoriteDrivers.map(driverId => 
        getDriverStandingById(SEASON, driverId)
      );
      const results = await Promise.all(promises);
      return results.filter(Boolean) as DriverStanding[];
    },
    enabled: favoriteDrivers.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch favorite constructors' standings
  const favoriteConstructorQueries = useQuery({
    queryKey: ['favorite-constructors-standings', SEASON, favoriteConstructors],
    queryFn: async () => {
      if (favoriteConstructors.length === 0) return [];
      const promises = favoriteConstructors.map(constructorId => 
        getConstructorStandingForSeason(SEASON, constructorId)
      );
      return Promise.all(promises);
    },
    enabled: favoriteConstructors.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Trigger refetch for all queries
    await Promise.all([
      // Add refetch calls here if needed
    ]);
    setRefreshing(false);
  }, []);

  const isLoading = driversLoading || constructorsLoading || nextRaceLoading || 
                   latestRaceLoading || newsLoading || favoritesLoading;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading F1 data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>F1 Dashboard</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Season Overview */}
      {topDrivers && topConstructors && (
        <ChampionshipCard topDrivers={topDrivers} topConstructors={topConstructors} />
      )}

      {/* AI Championship Predictions */}
      <ChampionshipPredictionCard />

      {/* Next Race */}
      <NextRaceCard nextRace={nextRace} />

      {/* Followed Drivers */}
      {favoriteDrivers.length > 0 && favoriteDriverQueries.data && favoriteDriverQueries.data.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Drivers</Text>
          <FlatList
            data={favoriteDriverQueries.data}
            keyExtractor={(item) => item.Driver.driverId}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <DriverCard driver={item} />}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      ) : (
        <EmptyFavoritesSection type="drivers" onPress={() => router.push('/settings')} />
      )}

      {/* Followed Teams */}
      {favoriteConstructors.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Teams</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {favoriteConstructors.map((constructorId) => (
                <ConstructorCard key={constructorId} constructorId={constructorId} />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <EmptyFavoritesSection type="teams" onPress={() => router.push('/settings')} />
      )}

      {/* Latest Race Results */}
      {latestRace && (
        <LatestRaceCard race={latestRace} />
      )}

      {/* News Feed */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latest News</Text>
        {news && news.length > 0 ? (
          <>
            {news.slice(0, 5).map((newsItem, index) => (
              <NewsCard key={index} newsItem={newsItem} />
            ))}
            <TouchableOpacity style={styles.seeMoreButton}>
              <Text style={styles.seeMoreText}>See More News</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyNews}>
            <Text style={styles.emptyNewsText}>No news available</Text>
          </View>
        )}
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push('/standings/drivers')}
          >
            <Text style={styles.quickLinkText}>Driver Standings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push('/standings/constructors')}
          >
            <Text style={styles.quickLinkText}>Team Standings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push('/races')}
          >
            <Text style={styles.quickLinkText}>Race Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Helper Components
function EmptyFavoritesSection({ type, onPress }: { type: 'drivers' | 'teams'; onPress: () => void }) {
  return (
    <View style={styles.emptySection}>
      <Text style={styles.emptySectionTitle}>
        No favorite {type} selected
      </Text>
      <Text style={styles.emptySectionDescription}>
        Add your favorite {type} to see their stats here
      </Text>
      <TouchableOpacity style={styles.emptySectionButton} onPress={onPress}>
        <Text style={styles.emptySectionButtonText}>Manage Favorites</Text>
      </TouchableOpacity>
    </View>
  );
}

function ConstructorCard({ constructorId }: { constructorId: string }) {
  const { data: standing } = useQuery({
    queryKey: ['constructor-standing', SEASON, constructorId],
    queryFn: () => getConstructorStandingForSeason(SEASON, constructorId),
    staleTime: 1000 * 60 * 5,
  });

  if (!standing) return null;

  return (
    <View style={styles.constructorCard}>
      <View style={styles.constructorCardContent}>
        <Text style={styles.constructorCardName}>{constructorId}</Text>
        <Text style={styles.constructorCardPosition}>#{standing.position}</Text>
        <Text style={styles.constructorCardPoints}>{standing.points} pts</Text>
      </View>
    </View>
  );
}

function LatestRaceCard({ race }: { race: Race }) {
  const { dateStr } = formatRaceDateTimeLocal(race.date, race.time);
  
  return (
    <View style={styles.latestRaceCard}>
      <LinearGradient
        colors={['#DC2626', '#EF4444']}
        style={styles.latestRaceGradient}
      >
        <Text style={styles.latestRaceTitle}>Latest Race</Text>
        <Text style={styles.latestRaceName}>{race.raceName}</Text>
        <Text style={styles.latestRaceCircuit}>{race.Circuit.circuitName}</Text>
        <Text style={styles.latestRaceDate}>{dateStr}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  emptySection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySectionDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptySectionButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptySectionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  constructorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  constructorCardContent: {
    alignItems: 'center',
  },
  constructorCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  constructorCardPosition: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  constructorCardPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  latestRaceCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  latestRaceGradient: {
    padding: 16,
    alignItems: 'center',
  },
  latestRaceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  latestRaceName: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  latestRaceCircuit: {
    fontSize: 14,
    color: '#FEE2E2',
    textAlign: 'center',
    marginBottom: 8,
  },
  latestRaceDate: {
    fontSize: 12,
    color: '#FEE2E2',
  },
  seeMoreButton: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  seeMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  emptyNews: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyNewsText: {
    fontSize: 16,
    color: '#6B7280',
  },
  quickLinks: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickLink: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});
