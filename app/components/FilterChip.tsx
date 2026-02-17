import { Pressable, Text } from "react-native";

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-xl border-2 mr-2 mb-1
        ${
          active
            ? "bg-blue-600 border-blue-600"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        }`}
    >
      <Text
        className={`text-xs font-semibold ${active ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
