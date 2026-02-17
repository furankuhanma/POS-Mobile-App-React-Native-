import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, View } from "react-native";

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Pressable
      onPress={toggleColorScheme}
      className="p-3 rounded-full active:opacity-70 bg-slate-200 dark:bg-slate-800"
    >
      <Ionicons
        name={isDark ? "moon" : "sunny"}
        size={22}
        color={isDark ? "#F59E0B" : "#6366F1"}
      />
    </Pressable>
  );
}
