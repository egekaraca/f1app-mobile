import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { generateChampionshipPredictions } from '../../lib/predictions';
import type { ChampionshipPrediction, ConstructorPrediction } from '../../lib/predictions';

const SEASON = '2025';

export default function PredictionAnalysisScreen() {
  const router = useRouter();
  const { data: predictions, isLoading, error } = useQuery({
    queryKey: ['detailed-predictions', SEASON],
    queryFn: () => generateChampionshipPredictions(SEASON),
    staleTime: 1000 * 60 * 15,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Analyzing championship data...</Text>
      </View>
    );
  }

  if (error || !predictions) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Analysis Unavailable</Text>
        <Text style={styles.errorText}>Unable to generate predictions</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI Championship Analysis</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Season Overview */}
      <SeasonOverviewCard insights={predictions.seasonInsights} />

      {/* Driver Predictions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver Championship Predictions</Text>
        {predictions.drivers.map((prediction, index) => (
          <DetailedDriverPrediction key={prediction.driverId} prediction={prediction} rank={index + 1} />
        ))}
      </View>

      {/* Constructor Predictions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Constructor Championship Predictions</Text>
        {predictions.constructors.map((prediction, index) => (
          <DetailedConstructorPrediction key={prediction.constructorId} prediction={prediction} rank={index + 1} />
        ))}
      </View>

      {/* Methodology */}
      <MethodologyCard />
    </ScrollView>
  );
}

function SeasonOverviewCard({ insights }: { insights: any }) {
  return (
    <View style={styles.overviewCard}>
      <LinearGradient
        colors={['#7C3AED', '#8B5CF6']}
        style={styles.overviewGradient}
      >
        <Text style={styles.overviewTitle}>Season Analysis</Text>
        <View style={styles.overviewStats}>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatValue}>{insights.racesCompleted}</Text>
            <Text style={styles.overviewStatLabel}>Races Completed</Text>
          </View>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatValue}>{insights.racesRemaining}</Text>
            <Text style={styles.overviewStatLabel}>Races Remaining</Text>
          </View>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatValue}>{insights.seasonProgress}%</Text>
            <Text style={styles.overviewStatLabel}>Season Complete</Text>
          </View>
        </View>
        {insights.keyInsights.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.insightsTitle}>Key Insights:</Text>
            {insights.keyInsights.map((insight: string, index: number) => (
              <Text key={index} style={styles.insightText}>• {insight}</Text>
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function DetailedDriverPrediction({ prediction, rank }: { prediction: ChampionshipPrediction; rank: number }) {
  const probabilityColor = getProbabilityColor(prediction.championshipProbability);
  
  return (
    <View style={styles.predictionCard}>
      <View style={styles.predictionHeader}>
        <View style={styles.rankContainer}>
          <View style={[styles.rankBadge, { backgroundColor: probabilityColor }]}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
          <Text style={styles.driverName}>{prediction.driverName}</Text>
        </View>
        <View style={styles.probabilityContainer}>
          <Text style={styles.probabilityValue}>
            {Math.round(prediction.championshipProbability * 100)}%
          </Text>
          <Text style={styles.probabilityLabel}>Chance</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{prediction.currentPoints}</Text>
          <Text style={styles.statLabel}>Current Points</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>#{prediction.currentPosition}</Text>
          <Text style={styles.statLabel}>Current Position</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>#{prediction.predictedFinish}</Text>
          <Text style={styles.statLabel}>Predicted Finish</Text>
        </View>
      </View>

      <Text style={styles.analysisTitle}>Analysis:</Text>
      <Text style={styles.analysisText}>{prediction.analysis}</Text>

      {prediction.keyFactors.length > 0 && (
        <>
          <Text style={styles.factorsTitle}>Key Factors:</Text>
          {prediction.keyFactors.map((factor, index) => (
            <Text key={index} style={styles.factorText}>• {factor}</Text>
          ))}
        </>
      )}
    </View>
  );
}

function DetailedConstructorPrediction({ prediction, rank }: { prediction: ConstructorPrediction; rank: number }) {
  const probabilityColor = getProbabilityColor(prediction.championshipProbability);
  
  return (
    <View style={styles.predictionCard}>
      <View style={styles.predictionHeader}>
        <View style={styles.rankContainer}>
          <View style={[styles.rankBadge, { backgroundColor: probabilityColor }]}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
          <Text style={styles.constructorName}>{prediction.constructorName}</Text>
        </View>
        <View style={styles.probabilityContainer}>
          <Text style={styles.probabilityValue}>
            {Math.round(prediction.championshipProbability * 100)}%
          </Text>
          <Text style={styles.probabilityLabel}>Chance</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{prediction.currentPoints}</Text>
          <Text style={styles.statLabel}>Current Points</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>#{prediction.currentPosition}</Text>
          <Text style={styles.statLabel}>Current Position</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>#{prediction.predictedFinish}</Text>
          <Text style={styles.statLabel}>Predicted Finish</Text>
        </View>
      </View>

      <Text style={styles.analysisTitle}>Analysis:</Text>
      <Text style={styles.analysisText}>{prediction.analysis}</Text>

      {prediction.keyFactors.length > 0 && (
        <>
          <Text style={styles.factorsTitle}>Key Factors:</Text>
          {prediction.keyFactors.map((factor, index) => (
            <Text key={index} style={styles.factorText}>• {factor}</Text>
          ))}
        </>
      )}
    </View>
  );
}

function MethodologyCard() {
  return (
    <View style={styles.methodologyCard}>
      <Text style={styles.methodologyTitle}>🤖 AI Analysis Methodology</Text>
      <Text style={styles.methodologyText}>
        Our AI analyzes multiple factors to predict championship outcomes:
      </Text>
      <View style={styles.methodologyList}>
        <Text style={styles.methodologyItem}>• Current points and position in standings</Text>
        <Text style={styles.methodologyItem}>• Points gap to championship leader</Text>
        <Text style={styles.methodologyItem}>• Number of race wins and consistency</Text>
        <Text style={styles.methodologyItem}>• Season progress and races remaining</Text>
        <Text style={styles.methodologyItem}>• Historical performance patterns</Text>
        <Text style={styles.methodologyItem}>• Team reliability and development trends</Text>
      </View>
      <Text style={styles.methodologyNote}>
        Predictions are updated after each race and reflect current form and championship dynamics.
      </Text>
    </View>
  );
}

function getProbabilityColor(probability: number): string {
  if (probability > 0.6) return '#10B981';
  if (probability > 0.3) return '#F59E0B';
  if (probability > 0.1) return '#EF4444';
  return '#6B7280';
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 60,
  },
  overviewCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  overviewGradient: {
    padding: 20,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
  },
  overviewStatLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 4,
  },
  insightsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 12,
    color: '#E0E7FF',
    marginBottom: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  predictionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  constructorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  probabilityContainer: {
    alignItems: 'center',
  },
  probabilityValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7C3AED',
  },
  probabilityLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  factorText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 18,
  },
  methodologyCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodologyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  methodologyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  methodologyList: {
    marginBottom: 16,
  },
  methodologyItem: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 20,
  },
  methodologyNote: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
