import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalItems: number;
  isDark: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageSize?: number;
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  isDark,
  onPrev,
  onNext,
  pageSize = 50,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <Pressable
        disabled={page <= 1}
        onPress={onPrev}
        className={`flex-row items-center gap-1.5 px-5 py-2.5 rounded-xl
          ${page <= 1 ? "bg-gray-100 dark:bg-gray-800" : "bg-gray-900 dark:bg-white"}`}
      >
        <Ionicons
          name="arrow-back"
          size={14}
          color={
            page <= 1
              ? isDark
                ? "#4B5563"
                : "#9CA3AF"
              : isDark
                ? "#111827"
                : "#fff"
          }
        />
        <Text
          className={`font-bold text-sm ${page <= 1 ? "text-gray-400 dark:text-gray-600" : "text-white dark:text-gray-900"}`}
        >
          Prev
        </Text>
      </Pressable>

      <View className="items-center">
        <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm">
          {page} / {totalPages}
        </Text>
        <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
          {startItem}–{endItem} of {totalItems}
        </Text>
      </View>

      <Pressable
        disabled={page >= totalPages}
        onPress={onNext}
        className={`flex-row items-center gap-1.5 px-5 py-2.5 rounded-xl
          ${page >= totalPages ? "bg-gray-100 dark:bg-gray-800" : "bg-gray-900 dark:bg-white"}`}
      >
        <Text
          className={`font-bold text-sm ${page >= totalPages ? "text-gray-400 dark:text-gray-600" : "text-white dark:text-gray-900"}`}
        >
          Next
        </Text>
        <Ionicons
          name="arrow-forward"
          size={14}
          color={
            page >= totalPages
              ? isDark
                ? "#4B5563"
                : "#9CA3AF"
              : isDark
                ? "#111827"
                : "#fff"
          }
        />
      </Pressable>
    </View>
  );
}
