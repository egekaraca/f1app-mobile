import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { setNavAnimation } from '../lib/navDirection';

// Use the device's actual screen corner radius on iOS, fallback to 44 if unavailable
const SCREEN_CORNER_RADIUS =
  Platform.OS === 'ios'
    ? ((Platform.constants as any).iosDisplayCornerRadius ?? 44)
    : 20;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type NavItem = {
  icon: IoniconName;
  activeIcon: IoniconName;
  route: string;
};

const NAV_ITEMS: NavItem[] = [
  { icon: 'home-outline',      activeIcon: 'home',      route: '/' },
  { icon: 'podium-outline',    activeIcon: 'podium',    route: '/standings' },
  { icon: 'flag-outline',      activeIcon: 'flag',      route: '/races' },
  { icon: 'analytics-outline', activeIcon: 'analytics', route: '/predictions' },
  { icon: 'person-outline',    activeIcon: 'person',    route: '/settings' },
];

// Fixed scrim — same on every page, fades to the pill's own color
const SCRIM_COLORS: [string, string, string] = [
  'rgba(20,20,20,0)',
  'rgba(20,20,20,0.28)',
  'rgba(20,20,20,0.72)',
];

export function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/';
    return pathname?.startsWith(route) ?? false;
  };

  const currentIndex = NAV_ITEMS.findIndex(item => isActive(item.route));

  // Hide on sub-pages (driver detail, race detail, constructor detail, etc.)
  if (currentIndex === -1) return null;

  const navigate = (route: string, targetIndex: number) => {
    setNavAnimation(targetIndex > currentIndex ? 'slide_from_right' : 'slide_from_left');
    router.push(route);
  };

  const pillBottom = insets.bottom + 6;
  const scrimHeight = pillBottom + 46 + 48;

  return (
    <>
      {/* Gradient scrim — fades screen content into nothing above the pill */}
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={[0, 0.45, 1]}
        style={[styles.scrim, { height: scrimHeight }]}
        pointerEvents="none"
      />

      {/* Floating pill */}
      <View
        style={[styles.wrapper, { bottom: pillBottom }]}
        pointerEvents="box-none"
      >
        <BlurView intensity={85} tint="systemChromeMaterialDark" style={styles.pill}>
          {NAV_ITEMS.map((item, index) => {
            const active = isActive(item.route);
            return (
              <TouchableOpacity
                key={item.route}
                onPress={() => navigate(item.route, index)}
                style={styles.navItem}
                activeOpacity={0.7}
              >
                {/* Active highlight pill behind the icon */}
                {active && <View style={styles.activePill} />}
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={22}
                  color={active ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                />
              </TouchableOpacity>
            );
          })}
        </BlurView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Gradient scrim — absolute, anchored to bottom, non-interactive
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Pill wrapper — full width but touch-transparent outside the pill
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: SCREEN_CORNER_RADIUS,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 24,
  },

  navItem: {
    width: 54,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activePill: {
    position: 'absolute',
    width: 44,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
