// app/_layout.tsx
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FavoritesProvider } from "../lib/FavoritesContext";
import { SeasonProvider } from "../lib/SeasonContext";
import { BottomNavBar } from "../components/BottomNavBar";

// Keys that are no longer used — clean up on startup
const STALE_CACHE_KEYS = ['apex_ml_model_v1', 'apex_ml_model_v2'];

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());

  useEffect(() => {
    AsyncStorage.multiRemove(STALE_CACHE_KEYS).catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={client}>
      <FavoritesProvider>
        <SeasonProvider>
          <StatusBar style="auto" />
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
            <BottomNavBar />
          </View>
        </SeasonProvider>
      </FavoritesProvider>
    </QueryClientProvider>
  );
}
