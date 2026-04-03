import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import type { DriverStanding } from '../types/standings';

interface DriverCardProps {
  driver: DriverStanding;
}

export function DriverCard({ driver }: DriverCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/drivers/${driver.Driver.driverId}`);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.positionBadge}>
        <Text style={styles.positionText}>{driver.position}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.driverName}>
          {driver.Driver.givenName} {driver.Driver.familyName}
        </Text>
        <Text style={styles.teamName}>
          {driver.Constructors?.[0]?.name || '—'}
        </Text>
        <View style={styles.stats}>
          <Text style={styles.points}>{driver.points} pts</Text>
          <Text style={styles.wins}>{driver.wins} wins</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  positionText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  teamName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  points: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  wins: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});

