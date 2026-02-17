import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Modal, Pressable, View, Text, TextInput } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "custom";

export interface DateRange {
  from: string;
  to: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DateFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (preset: DatePreset, range?: DateRange) => void;
}

export function DateFilterModal({
  visible,
  onClose,
  onApply,
}: DateFilterModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [selected, setSelected] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const presets: {
    key: DatePreset;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "all", label: "All Time", icon: "calendar-outline" },
    { key: "today", label: "Today", icon: "today-outline" },
    { key: "yesterday", label: "Yesterday", icon: "time-outline" },
    { key: "last7", label: "Last 7 Days", icon: "calendar-clear-outline" },
    { key: "last30", label: "Last 30 Days", icon: "calendar-number-outline" },
    { key: "custom", label: "Custom Range", icon: "options-outline" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/50 justify-center px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden"
        >
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <Text className="text-gray-900 dark:text-white font-extrabold text-lg">
              Filter by Date
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons
                name="close"
                size={22}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </Pressable>
          </View>

          <View className="p-4">
            {presets.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => setSelected(p.key)}
                className={`flex-row items-center px-4 py-3 rounded-xl mb-2
                  ${selected === p.key ? "bg-blue-600" : "bg-gray-50 dark:bg-gray-800"}`}
              >
                <Ionicons
                  name={p.icon}
                  size={18}
                  color={
                    selected === p.key ? "#fff" : isDark ? "#9CA3AF" : "#6B7280"
                  }
                />
                <Text
                  className={`ml-3 font-semibold text-sm flex-1
                  ${selected === p.key ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                >
                  {p.label}
                </Text>
                {selected === p.key && (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                )}
              </Pressable>
            ))}

            {selected === "custom" && (
              <View className="mt-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  Custom Range (YYYY-MM-DD)
                </Text>
                <View className="flex-row gap-3">
                  {[
                    {
                      label: "From",
                      value: customFrom,
                      set: setCustomFrom,
                      ph: "2025-01-01",
                    },
                    {
                      label: "To",
                      value: customTo,
                      set: setCustomTo,
                      ph: "2025-12-31",
                    },
                  ].map((f) => (
                    <View key={f.label} className="flex-1">
                      <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1.5">
                        {f.label}
                      </Text>
                      <TextInput
                        value={f.value}
                        onChangeText={f.set}
                        placeholder={f.ph}
                        placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                        className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Pressable
              onPress={() => {
                if (selected === "custom") {
                  onApply("custom", {
                    from: customFrom || daysAgo(30),
                    to: customTo || todayStr(),
                  });
                } else {
                  onApply(selected);
                }
                onClose();
              }}
              className="bg-blue-600 rounded-xl py-3.5 items-center mt-3"
            >
              <Text className="text-white font-extrabold text-sm">Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Export helper functions for use in parent components
export { todayStr, daysAgo };
