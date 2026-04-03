import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { formatRaceDateTimeLocal } from '../lib/api';
import type { Race } from '../types/race';

interface NextRaceCardProps {
  nextRace: Race | null | undefined;
}

export function NextRaceCard({ nextRace }: NextRaceCardProps) {
  const router = useRouter();

  if (!nextRace) {
    return null;
  }

  const { dateStr, timeStr } = formatRaceDateTimeLocal(nextRace.date, nextRace.time);
  const daysUntil = getDaysUntilRace(nextRace.date);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/races')}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.label}>Next Race</Text>
          {daysUntil !== null && (
            <View style={styles.countdown}>
              <Text style={styles.countdownText}>
                {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.raceName}>{nextRace.raceName}</Text>
        <Text style={styles.circuitName}>{nextRace.Circuit.circuitName}</Text>
        
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>
              {nextRace.Circuit.Location.locality}, {nextRace.Circuit.Location.country}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{dateStr}</Text>
          </View>
          {timeStr && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{timeStr}</Text>
            </View>
          )}
        </View>

        <View style={styles.viewDetails}>
          <Text style={styles.viewDetailsText}>View Details →</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function getDaysUntilRace(dateString: string): number | null {
  try {
    const raceDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    raceDate.setHours(0, 0, 0, 0);
    
    const diffTime = raceDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FEE2E2',
    letterSpacing: 0.5,
  },
  countdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  raceName: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
  },
  circuitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FEE2E2',
    marginBottom: 16,
  },
  details: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#FEE2E2',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: 'white',
    fontWeight: '700',
  },
  viewDetails: {
    alignItems: 'flex-end',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
});

