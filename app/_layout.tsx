// app/_layout.tsx
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <SafeAreaView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: true }} />
      </SafeAreaView>
    </QueryClientProvider>
  );
}
