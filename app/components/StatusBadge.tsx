import { View, Text } from "react-native";

interface StatusBadgeProps {
  label: string;
  bgCls: string;
  textCls: string;
}

export function StatusBadge({ label, bgCls, textCls }: StatusBadgeProps) {
  return (
    <View className={`rounded px-2 py-0.5 ${bgCls}`}>
      <Text className={`text-xs font-bold ${textCls}`}>{label}</Text>
    </View>
  );
}
