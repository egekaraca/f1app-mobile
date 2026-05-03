// app/_layout.tsx
import { Stack, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { View, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FavoritesProvider } from "../lib/FavoritesContext";
import { SeasonProvider } from "../lib/SeasonContext";
import { BottomNavBar } from "../components/BottomNavBar";
import {
  hasSeenNotificationPrompt,
  markNotificationPromptSeen,
  setNotificationsEnabled,
} from "../lib/storage";
import { requestNotificationPermission } from "../lib/notifications";

// Keys that are no longer used — clean up on startup
const STALE_CACHE_KEYS = ['apex_ml_model_v1', 'apex_ml_model_v2'];

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());

  useEffect(() => {
    AsyncStorage.multiRemove(STALE_CACHE_KEYS).catch(() => {});
    promptForNotificationsIfNeeded();
  }, []);

  const promptForNotificationsIfNeeded = async () => {
    const seen = await hasSeenNotificationPrompt();
    if (seen) return;

    await markNotificationPromptSeen();

    Alert.alert(
      'Stay in the Loop',
      'Allow APEX to send you notifications for race results, standings updates, and more.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => setNotificationsEnabled(false),
        },
        {
          text: 'Allow',
          onPress: async () => {
            await requestNotificationPermission();
          },
        },
      ],
    );
  };

  const pathname = usePathname();
  const hideNav  = pathname === '/fantasy/packs';

  return (
    <QueryClientProvider client={client}>
      <FavoritesProvider>
        <SeasonProvider>
          <StatusBar style="auto" />
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, animation: 'none' }} />
            {!hideNav && <BottomNavBar />}
          </View>
        </SeasonProvider>
      </FavoritesProvider>
    </QueryClientProvider>
  );
}
