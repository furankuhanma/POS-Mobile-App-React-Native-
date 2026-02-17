import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Modal, Pressable, View, Text } from "react-native";
import { Order, OrderStatus } from "./OrderRow";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Preparing: ["Served", "Cancelled"],
  Served: ["Done"],
  Done: [],
  Cancelled: [],
};

const STATUS_ICONS: Record<OrderStatus, keyof typeof Ionicons.glyphMap> = {
  Preparing: "time-outline",
  Served: "restaurant-outline",
  Done: "checkmark-circle-outline",
  Cancelled: "close-circle-outline",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface StatusUpdateModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (status: OrderStatus) => void;
}

export function StatusUpdateModal({
  order,
  visible,
  onClose,
  onUpdate,
}: StatusUpdateModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!order) return null;

  const nextStatuses = ALLOWED_TRANSITIONS[order.orderStatus];
  const isLocked = nextStatuses.length === 0;

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
            <View>
              <Text className="text-gray-900 dark:text-white font-extrabold text-base">
                Update Status
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                Currently:{" "}
                <Text className="font-bold">{order.orderStatus}</Text>
              </Text>
            </View>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons
                name="close"
                size={22}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </Pressable>
          </View>

          <View className="p-5">
            {isLocked ? (
              <View className="flex-row items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
                <Text className="text-gray-500 dark:text-gray-400 text-sm flex-1">
                  This order is {order.orderStatus.toLowerCase()} — no further
                  changes allowed.
                </Text>
              </View>
            ) : (
              nextStatuses.map((status) => (
                <Pressable
                  key={status}
                  onPress={() => {
                    onUpdate(status);
                    onClose();
                  }}
                  className={`flex-row items-center gap-3 rounded-xl p-4 mb-2
                    ${
                      status === "Cancelled"
                        ? "bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-900"
                        : "bg-blue-600"
                    }`}
                >
                  <Ionicons
                    name={STATUS_ICONS[status]}
                    size={20}
                    color={status === "Cancelled" ? "#EF4444" : "#fff"}
                  />
                  <Text
                    className={`font-extrabold text-sm ${status === "Cancelled" ? "text-red-500 dark:text-red-400" : "text-white"}`}
                  >
                    Mark as {status}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Export constants for use in other components
export { ALLOWED_TRANSITIONS };
