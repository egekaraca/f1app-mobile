import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useFavorites } from '../../lib/FavoritesContext';
import { getDriverStandings, getConstructorStandings } from '../../lib/api';

const SEASON = '2025';

export default function SettingsScreen() {
  const router = useRouter();
  const { favoriteDrivers, favoriteConstructors, toggleFavoriteDriver, toggleFavoriteConstructor } = useFavorites();
  const [saving, setSaving] = useState(false);

  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ['driver-standings', SEASON],
    queryFn: () => getDriverStandings(SEASON),
    staleTime: 1000 * 60 * 5,
  });

  const { data: constructors, isLoading: constructorsLoading } = useQuery({
    queryKey: ['constructor-standings', SEASON],
    queryFn: () => getConstructorStandings(SEASON),
    staleTime: 1000 * 60 * 5,
  });

  const handleDriverToggle = async (driverId: string) => {
    setSaving(true);
    await toggleFavoriteDriver(driverId);
    setSaving(false);
  };

  const handleConstructorToggle = async (constructorId: string) => {
    setSaving(true);
    await toggleFavoriteConstructor(constructorId);
    setSaving(false);
  };

  if (driversLoading || constructorsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading drivers and teams...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Favorites</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Drivers</Text>
        <Text style={styles.sectionDescription}>
          Select drivers to follow on your home screen
        </Text>
        {drivers?.map((driver) => (
          <TouchableOpacity
            key={driver.Driver.driverId}
            style={[
              styles.item,
              favoriteDrivers.includes(driver.Driver.driverId) && styles.itemSelected,
            ]}
            onPress={() => handleDriverToggle(driver.Driver.driverId)}
            disabled={saving}
          >
            <View style={styles.itemContent}>
              <View style={styles.itemLeft}>
                <Text style={styles.driverNumber}>
                  {driver.Driver.permanentNumber || driver.Driver.code || '—'}
                </Text>
                <View>
                  <Text style={styles.driverName}>
                    {driver.Driver.givenName} {driver.Driver.familyName}
                  </Text>
                  <Text style={styles.teamName}>
                    {driver.Constructors?.[0]?.name || '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.position}>#{driver.position}</Text>
                <Text style={styles.points}>{driver.points} pts</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Teams</Text>
        <Text style={styles.sectionDescription}>
          Select teams to follow on your home screen
        </Text>
        {constructors?.map((constructor) => (
          <TouchableOpacity
            key={constructor.Constructor.constructorId}
            style={[
              styles.item,
              favoriteConstructors.includes(constructor.Constructor.constructorId) && styles.itemSelected,
            ]}
            onPress={() => handleConstructorToggle(constructor.Constructor.constructorId)}
            disabled={saving}
          >
            <View style={styles.itemContent}>
              <View style={styles.itemLeft}>
                <View style={styles.teamLogo}>
                  <Text style={styles.teamLogoText}>
                    {constructor.Constructor.name.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.teamName}>
                    {constructor.Constructor.name}
                  </Text>
                  <Text style={styles.teamNationality}>
                    {constructor.Constructor.nationality || '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.position}>#{constructor.position}</Text>
                <Text style={styles.points}>{constructor.points} pts</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your favorites will appear on the home screen
        </Text>
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
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
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
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  item: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    width: 40,
    textAlign: 'center',
    marginRight: 12,
  },
  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamLogoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6B7280',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  teamName: {
    fontSize: 14,
    color: '#6B7280',
  },
  teamNationality: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  position: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  points: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
