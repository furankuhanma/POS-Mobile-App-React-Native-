import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AdaptiveLayout } from "./components/AdaptiveLayout";
import { runMigrations } from "./data/Database";
import "./global.css";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    runMigrations()
      .then(() => setReady(true))
      .catch((e) => console.error("[DB] Migration failed", e));
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AdaptiveLayout>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="pages/ProductScreen" />
          <Stack.Screen name="pages/OrderHistoryScreen" />
          <Stack.Screen name="pages/AnalyticsScreen" />
          <Stack.Screen name="pages/InventoryScreen" />
        </Stack>
      </AdaptiveLayout>
    </SafeAreaProvider>
  );
}
