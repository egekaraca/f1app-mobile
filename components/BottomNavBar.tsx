import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { setNavAnimation } from '../lib/navDirection';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type NavItem = {
  icon: IoniconName;
  activeIcon: IoniconName;
  label: string;
  route: string;
};

const NAV_ITEMS: NavItem[] = [
  { icon: 'home-outline',      activeIcon: 'home',      label: 'Home',      route: '/' },
  { icon: 'podium-outline',    activeIcon: 'podium',    label: 'Standings', route: '/standings' },
  { icon: 'flag-outline',      activeIcon: 'flag',      label: 'Races',     route: '/races' },
  { icon: 'trophy-outline',    activeIcon: 'trophy',    label: 'Fantasy',   route: '/fantasy' },
  { icon: 'analytics-outline', activeIcon: 'analytics', label: 'Predict',   route: '/predictions' },
  { icon: 'person-outline',    activeIcon: 'person',    label: 'Profile',   route: '/profile' },
];

export function BottomNavBar() {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/';
    return pathname?.startsWith(route) ?? false;
  };

  const currentIndex = NAV_ITEMS.findIndex(item => isActive(item.route));
  const isHidden     = currentIndex === -1;

  const navigate = (route: string, targetIndex: number) => {
    setNavAnimation(targetIndex > currentIndex ? 'slide_from_right' : 'slide_from_left');
    router.push(route);
  };

  if (isHidden) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Soft scrim so page content fades into the bar */}
      <LinearGradient
        colors={['rgba(13,13,13,0)', 'rgba(13,13,13,0.6)', 'rgba(13,13,13,0)']}
        style={styles.scrim}
        pointerEvents="none"
      />

      <View style={[styles.bar, { paddingBottom: insets.bottom + 4 }]}>
        {NAV_ITEMS.map((item, index) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={styles.item}
              onPress={() => navigate(item.route, index)}
              activeOpacity={0.65}
            >
              {active && <View style={styles.indicator} />}
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={22}
                color={active ? '#E10600' : 'rgba(255,255,255,0.32)'}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },

  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
    pointerEvents: 'none',
  } as any,

  bar: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },

  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    gap: 3,
  },

  indicator: {
    position: 'absolute',
    top: -10,
    width: 24,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#E10600',
  },

  label: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.32)',
    letterSpacing: 0.1,
  },

  labelActive: {
    color: '#E10600',
    fontWeight: '700',
  },
});
