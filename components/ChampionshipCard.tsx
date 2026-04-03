import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { DriverStanding, ConstructorStanding } from '../types/standings';

interface ChampionshipCardProps {
  topDrivers: DriverStanding[];
  topConstructors: ConstructorStanding[];
}

export function ChampionshipCard({ topDrivers, topConstructors }: ChampionshipCardProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Driver Championship */}
      <View style={styles.driverSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Driver Championship</Text>
          <TouchableOpacity onPress={() => router.push('/standings/drivers')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.standingsRow}>
            {topDrivers.map((driver) => (
              <DriverStandingCard key={driver.Driver.driverId} driver={driver} />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Constructor Championship */}
      <View style={styles.constructorSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Constructor Championship</Text>
          <TouchableOpacity onPress={() => router.push('/standings/constructors')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.standingsRow}>
            {topConstructors.map((constructor) => (
              <ConstructorStandingCard key={constructor.Constructor.constructorId} constructor={constructor} />
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function DriverStandingCard({ driver }: { driver: DriverStanding }) {
  const positionColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const positionColor = positionColors[parseInt(driver.position) - 1] || '#6B7280';

  return (
    <View style={styles.card}>
      <View style={[styles.positionBadge, { backgroundColor: positionColor }]}>
        <Text style={styles.positionText}>{driver.position}</Text>
      </View>
      
      <Text style={styles.name} numberOfLines={2}>
        {driver.Driver.givenName} {driver.Driver.familyName}
      </Text>
      
      <Text style={styles.team} numberOfLines={1}>
        {driver.Constructors?.[0]?.name || '—'}
      </Text>
      
      <View style={styles.statsContainer}>
        <Text style={styles.points}>{driver.points}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
      
      {driver.wins > 0 && (
        <View style={styles.winsContainer}>
          <Text style={styles.winsText}>🏁 {driver.wins} wins</Text>
        </View>
      )}
    </View>
  );
}

function ConstructorStandingCard({ constructor }: { constructor: ConstructorStanding }) {
  const positionColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const positionColor = positionColors[parseInt(constructor.position) - 1] || '#6B7280';

  return (
    <View style={styles.card}>
      <View style={[styles.positionBadge, { backgroundColor: positionColor }]}>
        <Text style={styles.positionText}>{constructor.position}</Text>
      </View>
      
      <Text style={styles.name} numberOfLines={2}>
        {constructor.Constructor.name}
      </Text>
      
      <View style={styles.statsContainer}>
        <Text style={styles.points}>{constructor.points}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
      
      {constructor.wins > 0 && (
        <View style={styles.winsContainer}>
          <Text style={styles.winsText}>🏁 {constructor.wins} wins</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  driverSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  constructorSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  standingsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    width: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 18,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  team: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  points: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    marginRight: 4,
  },
  pointsLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  winsContainer: {
    marginTop: 4,
  },
  winsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});

