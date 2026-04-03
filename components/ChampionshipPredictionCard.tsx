import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { generateChampionshipPredictions } from '../lib/predictions';
import type { ChampionshipPrediction, ConstructorPrediction, PredictionAnalysis } from '../lib/predictions';

const SEASON = '2025';

interface ChampionshipPredictionCardProps {
  onViewAll?: () => void;
}

export function ChampionshipPredictionCard({ onViewAll }: ChampionshipPredictionCardProps) {
  const router = useRouter();
  const { data: predictions, isLoading, error } = useQuery({
    queryKey: ['championship-predictions', SEASON],
    queryFn: () => generateChampionshipPredictions(SEASON),
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: 2,
  });

  if (isLoading) {
    return <PredictionLoadingCard />;
  }

  if (error || !predictions) {
    return <PredictionErrorCard />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#8B5CF6']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>🏆 AI Championship Predictions</Text>
          <Text style={styles.subtitle}>Based on season performance & data analysis</Text>
        </View>

        {/* Season Insights */}
        <SeasonInsights insights={predictions.seasonInsights} />

        {/* Top Driver Predictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Championship</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.predictionsRow}>
              {predictions.drivers.slice(0, 5).map((prediction, index) => (
                <DriverPredictionCard key={prediction.driverId} prediction={prediction} rank={index + 1} />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Top Constructor Predictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Constructor Championship</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.predictionsRow}>
              {predictions.constructors.slice(0, 4).map((prediction, index) => (
                <ConstructorPredictionCard key={prediction.constructorId} prediction={prediction} rank={index + 1} />
              ))}
            </View>
          </ScrollView>
        </View>

        <TouchableOpacity 
          style={styles.viewAllButton} 
          onPress={() => router.push('/predictions')}
        >
          <Text style={styles.viewAllText}>View Detailed Analysis</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

function SeasonInsights({ insights }: { insights: PredictionAnalysis['seasonInsights'] }) {
  return (
    <View style={styles.insightsContainer}>
      <Text style={styles.insightsTitle}>Season Analysis</Text>
      <View style={styles.insightsStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{insights.racesCompleted}</Text>
          <Text style={styles.statLabel}>Races Done</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{insights.racesRemaining}</Text>
          <Text style={styles.statLabel}>Races Left</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{insights.seasonProgress}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
      </View>
      {insights.keyInsights.length > 0 && (
        <View style={styles.keyInsights}>
          {insights.keyInsights.slice(0, 2).map((insight, index) => (
            <Text key={index} style={styles.insightText}>• {insight}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function DriverPredictionCard({ prediction, rank }: { prediction: ChampionshipPrediction; rank: number }) {
  const probabilityColor = getProbabilityColor(prediction.championshipProbability);
  
  return (
    <View style={styles.predictionCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.rankBadge, { backgroundColor: probabilityColor }]}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
        <Text style={styles.probabilityText}>
          {Math.round(prediction.championshipProbability * 100)}%
        </Text>
      </View>
      
      <Text style={styles.driverName} numberOfLines={2}>
        {prediction.driverName}
      </Text>
      
      <View style={styles.statsRow}>
        <Text style={styles.currentPoints}>{prediction.currentPoints} pts</Text>
        <Text style={styles.currentPosition}>#{prediction.currentPosition}</Text>
      </View>
      
      <Text style={styles.predictedFinish}>
        Predicted: #{prediction.predictedFinish}
      </Text>
      
      <Text style={styles.analysis} numberOfLines={2}>
        {prediction.analysis}
      </Text>
      
      {prediction.keyFactors.length > 0 && (
        <View style={styles.factorsContainer}>
          {prediction.keyFactors.slice(0, 2).map((factor, index) => (
            <Text key={index} style={styles.factorText}>• {factor}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function ConstructorPredictionCard({ prediction, rank }: { prediction: ConstructorPrediction; rank: number }) {
  const probabilityColor = getProbabilityColor(prediction.championshipProbability);
  
  return (
    <View style={styles.predictionCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.rankBadge, { backgroundColor: probabilityColor }]}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
        <Text style={styles.probabilityText}>
          {Math.round(prediction.championshipProbability * 100)}%
        </Text>
      </View>
      
      <Text style={styles.constructorName} numberOfLines={2}>
        {prediction.constructorName}
      </Text>
      
      <View style={styles.statsRow}>
        <Text style={styles.currentPoints}>{prediction.currentPoints} pts</Text>
        <Text style={styles.currentPosition}>#{prediction.currentPosition}</Text>
      </View>
      
      <Text style={styles.predictedFinish}>
        Predicted: #{prediction.predictedFinish}
      </Text>
      
      <Text style={styles.analysis} numberOfLines={2}>
        {prediction.analysis}
      </Text>
      
      {prediction.keyFactors.length > 0 && (
        <View style={styles.factorsContainer}>
          {prediction.keyFactors.slice(0, 2).map((factor, index) => (
            <Text key={index} style={styles.factorText}>• {factor}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function PredictionLoadingCard() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#8B5CF6']}
        style={styles.gradient}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.title}>🏆 AI Championship Predictions</Text>
          <Text style={styles.loadingText}>Analyzing season data...</Text>
          <View style={styles.loadingDots}>
            <Text style={styles.loadingDot}>●</Text>
            <Text style={styles.loadingDot}>●</Text>
            <Text style={styles.loadingDot}>●</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function PredictionErrorCard() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#8B5CF6']}
        style={styles.gradient}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.title}>🏆 AI Championship Predictions</Text>
          <Text style={styles.errorText}>Unable to generate predictions</Text>
          <Text style={styles.errorSubtext}>Check your connection and try again</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function getProbabilityColor(probability: number): string {
  if (probability > 0.6) return '#10B981'; // Green - High chance
  if (probability > 0.3) return '#F59E0B'; // Yellow - Medium chance
  if (probability > 0.1) return '#EF4444'; // Red - Low chance
  return '#6B7280'; // Gray - Very low chance
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  insightsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  insightsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 2,
  },
  keyInsights: {
    marginTop: 8,
  },
  insightText: {
    fontSize: 12,
    color: '#E0E7FF',
    marginBottom: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
  },
  predictionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  predictionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    width: 180,
    minHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
  },
  probabilityText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  constructorName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  currentPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  currentPosition: {
    fontSize: 12,
    color: '#E0E7FF',
  },
  predictedFinish: {
    fontSize: 11,
    color: '#E0E7FF',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  analysis: {
    fontSize: 11,
    color: '#E0E7FF',
    lineHeight: 16,
    marginBottom: 8,
  },
  factorsContainer: {
    marginTop: 'auto',
  },
  factorText: {
    fontSize: 10,
    color: '#E0E7FF',
    marginBottom: 2,
  },
  viewAllButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#E0E7FF',
    marginBottom: 12,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FEE2E2',
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#FECACA',
  },
});
