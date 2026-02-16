import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AdaptiveLayout } from "./components/AdaptiveLayout";
import "./global.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AdaptiveLayout>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </AdaptiveLayout>
    </SafeAreaProvider>
  );
}
