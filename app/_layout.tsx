import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AdaptiveLayout } from "./components/AdaptiveLayout";
import { getDb, runMigrations, setDeviceConfig } from "./data/Database";
import "./global.css";
import { SyncService } from "./services/SyncService";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    runMigrations()
      .then(async () => {
        // On web, all DB functions are no-ops — skip native-only setup
        const db = await getDb();
        if (db) {
          // Force correct URL and terminal ID into device_config on every launch.
          // Safe to call repeatedly — uses ON CONFLICT DO UPDATE internally.
          await setDeviceConfig(
            "api_base_url",
            "https://frank-loui-lapore-hp-probook-640-g1.tail11c2e9.ts.net",
          );
          await setDeviceConfig("terminal_uuid", "terminal-1");

          // ── One-time cleanup: clear stale sync_errors and reset synced flags ──
          // Remove these lines after first successful sync.
          await db.execAsync(`DELETE FROM sync_errors;`);
          await db.execAsync(`UPDATE Categories      SET synced = 0;`);
          await db.execAsync(`UPDATE Products        SET synced = 0;`);
          await db.execAsync(`UPDATE ProductVariants SET synced = 0;`);
          await db.execAsync(`UPDATE Orders          SET synced = 0;`);
          await db.execAsync(`UPDATE OrderItems      SET synced = 0;`);

          SyncService.start();
        }

        setReady(true);
      })
      .catch((e) => console.error("[DB] Migration failed", e));

    return () => SyncService.stop();
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
