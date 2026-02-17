import { Text } from "react-native";

interface SectionLabelProps {
  text: string;
}

export function SectionLabel({ text }: SectionLabelProps) {
  return (
    <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 mt-5">
      {text}
    </Text>
  );
}
