import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { getDriverStandingById } from '../../lib/api';
import type { DriverStanding } from '../../types/standings';

const { width: screenWidth } = Dimensions.get('window');

// Driver biography data - in a real app, this would come from an API
const driverBiographies: Record<string, string> = {
  'norris': 'A gifted karter, Lando remains the youngest driver ever to set a pole position at a national meeting. In 2012, he became Formula Kart Stars champion and runner-up in the MSA Super One British Championship. A year later, he won titles in the CIK-FIA KFJ European, CIK-FIA KFJ Super Cup, WSK Euro Series KFJ, CIK-FIA International Super Cup.',
  'verstappen': 'Max Verstappen is a Dutch racing driver who competes in Formula One for Red Bull Racing. He is the son of former Formula One driver Jos Verstappen and Belgian karting champion Sophie Kumpen. Verstappen made his Formula One debut in 2015 with Scuderia Toro Rosso, becoming the youngest driver to compete in Formula One.',
  'hamilton': 'Lewis Hamilton is a British racing driver who competes in Formula One for Mercedes. He is widely regarded as one of the greatest Formula One drivers of all time. Hamilton has won seven World Drivers\' Championship titles, tied with Michael Schumacher for the most championships.',
  'leclerc': 'Charles Leclerc is a Monégasque racing driver who competes in Formula One for Scuderia Ferrari. He won the GP3 Series championship in 2016 and the FIA Formula 2 Championship in 2017. Leclerc made his Formula One debut in 2018 with Sauber.',
};

// Driver years in F1 data
const driverYearsInF1: Record<string, number> = {
  'norris': 6,
  'verstappen': 10,
  'hamilton': 18,
  'leclerc': 7,
  'russell': 6,
  'sainz': 10,
  'alonso': 20,
  'ocon': 8,
  'gasly': 7,
  'tsunoda': 4,
  'hulkenberg': 12,
  'stroll': 8,
  'albon': 5,
  'piastri': 2,
  'lawson': 1,
  'bearman': 1,
  'antonelli': 1,
  'bortoleto': 1,
  'colapinto': 1,
  'doohan': 1,
  'hadjar': 1,
};

export default function DriverDetail() {
  const router = useRouter();
  const { driverId } = useLocalSearchParams<{ driverId: string }>();
  const SEASON = '2025';

  const { data: driverStanding, isLoading } = useQuery({
    queryKey: ['driver-standing', SEASON, driverId],
    queryFn: () => getDriverStandingById(SEASON, driverId || ''),
    enabled: !!driverId,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || !driverStanding) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading driver data...</Text>
      </View>
    );
  }

  const driver = driverStanding.Driver;
  const driverKey = driver.driverId.toLowerCase();
  const biography = driverBiographies[driverKey] || 'Driver information not available.';
  const yearsInF1 = driverYearsInF1[driverKey] || 0;

  const handleBack = () => {
    router.back();
  };

  const handleNavigation = (screen: string) => {
    router.push(`/${screen}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#d1d1d1', '#ffffff']}
        locations={[0, 0.43]}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Image
            source={{ uri: `http://localhost:3845/assets/b107e587a4695aa1ec2553a98b7c4410c8df21a6.png` }}
            style={styles.driverImage}
            resizeMode="cover"
          />
          <View style={styles.nameContainer}>
            <Text style={styles.driverName}>
              {driver.givenName} {driver.familyName}
            </Text>
          </View>
        </View>
      </View>

      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <Image
          source={{ uri: `http://localhost:3845/assets/07d3f986f14ac555fde42244c3e1e2e6c66e22a5.png` }}
          style={styles.patternImage}
          resizeMode="contain"
        />
      </View>

      {/* Driver Stats Section */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Driver Stats</Text>
        
        <View style={styles.statsGrid}>
          {/* Position */}
          <View style={styles.statItem}>
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>#{driverStanding.position}</Text>
            </View>
            <Text style={styles.statLabel}>Position</Text>
          </View>

          {/* Years in F1 */}
          <View style={styles.statItem}>
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{yearsInF1}</Text>
            </View>
            <Text style={styles.statLabel}>Years in F1</Text>
          </View>

          {/* Points */}
          <View style={styles.statItem}>
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{driverStanding.points}</Text>
            </View>
            <Text style={styles.statLabel}>Points</Text>
          </View>

          {/* Wins */}
          <View style={styles.statItem}>
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{driverStanding.wins}</Text>
            </View>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>About the Driver</Text>
        <Text style={styles.biography}>{biography}</Text>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => handleNavigation('')}
        >
          <Text style={styles.navIcon}>🏠</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, styles.activeNavItem]} 
          onPress={() => handleNavigation('standings/drivers')}
        >
          <Text style={[styles.navIcon, styles.activeNavIcon]}>📊</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => handleNavigation('races')}
        >
          <Text style={styles.navIcon}>📅</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => handleNavigation('settings')}
        >
          <Text style={styles.navIcon}>👤</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    fontSize: 16,
    color: '#6B7280',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 853,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 22,
    paddingBottom: 20,
    zIndex: 10,
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverImage: {
    width: 157,
    height: 132,
    borderRadius: 25,
    marginRight: 15,
  },
  nameContainer: {
    flex: 1,
  },
  driverName: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000',
    lineHeight: 38,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 322,
    left: -61,
    width: 417,
    height: 469,
    opacity: 0.15,
    transform: [{ rotate: '344.691deg' }],
  },
  patternImage: {
    width: '100%',
    height: '100%',
  },
  statsSection: {
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 20,
    alignItems: 'center',
  },
  statBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    fontStyle: 'italic',
  },
  statLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff8000',
    textAlign: 'center',
  },
  aboutSection: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  biography: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000',
    textAlign: 'left',
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#e7e7e6',
    opacity: 0.6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 37,
  },
  navItem: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeNavItem: {
    backgroundColor: '#000',
    borderRadius: 8,
  },
  navIcon: {
    fontSize: 20,
    color: '#000',
  },
  activeNavIcon: {
    color: '#fff',
  },
});



