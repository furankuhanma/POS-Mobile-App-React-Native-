import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Pressable
      onPress={toggleColorScheme}
      className="p-2 rounded-full active:opacity-70 bg-slate-200 dark:bg-slate-800"
    >
      <View className="flex-row items-center space-x-2">
        <Ionicons
          name={isDark ? "moon" : "sunny"}
          size={20}
          color={isDark ? "#F59E0B" : "#6366F1"}
        />
        <Text className="ml-5 text-slate-900 dark:text-slate-100 font-medium">
          {isDark ? "Dark Mode" : "Light Mode"}
        </Text>
      </View>
    </Pressable>
  );
}
