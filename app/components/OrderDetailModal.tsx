import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Modal, Pressable, ScrollView, View, Text } from "react-native";
import { StatusBadge } from "./StatusBadge";
import { SectionLabel } from "./SectionLabel";
import { ALLOWED_TRANSITIONS } from "./StatusUpdateModal";
import {
  Order,
  ORDER_TYPE_ICON,
  ORDER_STATUS_CLS,
  ORDER_STATUS_TEXT_CLS,
  PAYMENT_STATUS_CLS,
  PAYMENT_STATUS_TEXT_CLS,
  fmt,
} from "./OrderRow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── Component ────────────────────────────────────────────────────────────────

interface OrderDetailModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onEditPress: () => void;
  onStatusPress: () => void;
}

export function OrderDetailModal({
  order,
  visible,
  onClose,
  onEditPress,
  onStatusPress,
}: OrderDetailModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!order) return null;

  const change =
    order.cashTendered != null ? order.cashTendered - order.total : null;
  const isLocked = ALLOWED_TRANSITIONS[order.orderStatus].length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50 dark:bg-gray-800">
        {/* Header */}
        <View className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 pt-6 pb-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                {ORDER_TYPE_ICON[order.orderType]} {order.orderType}
                {order.tableNumber ? `  ·  ${order.tableNumber}` : ""}
              </Text>
              <Text className="text-gray-900 dark:text-white font-black text-2xl">
                {order.id}
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {order.receiptNumber}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="bg-gray-100 dark:bg-gray-800 rounded-xl p-2 ml-3"
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between mt-4">
            <View className="flex-row gap-2 flex-wrap flex-1">
              <StatusBadge
                label={order.orderStatus}
                bgCls={ORDER_STATUS_CLS[order.orderStatus]}
                textCls={ORDER_STATUS_TEXT_CLS[order.orderStatus]}
              />
              <StatusBadge
                label={order.paymentStatus}
                bgCls={PAYMENT_STATUS_CLS[order.paymentStatus]}
                textCls={PAYMENT_STATUS_TEXT_CLS[order.paymentStatus]}
              />
              <View className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5">
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {order.paymentMethod}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2 ml-2">
              <Pressable
                onPress={onEditPress}
                className="flex-row items-center gap-1 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-lg"
              >
                <Ionicons
                  name="pencil-outline"
                  size={13}
                  color={isDark ? "#60A5FA" : "#2563EB"}
                />
                <Text className="text-blue-600 dark:text-blue-400 text-xs font-bold">
                  Edit
                </Text>
              </Pressable>
              {!isLocked && (
                <Pressable
                  onPress={onStatusPress}
                  className="flex-row items-center gap-1 bg-blue-600 px-3 py-1.5 rounded-lg"
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={13}
                    color="#fff"
                  />
                  <Text className="text-white text-xs font-bold">Status</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="p-5 pb-12">
          {/* Items */}
          <SectionLabel text="Order Items" />
          <View className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
            {order.items.map((item, idx) => (
              <View
                key={item.id}
                className={`p-4 ${idx < order.items.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-gray-900 dark:text-white font-bold text-sm">
                      {item.quantity}× {item.name}
                    </Text>
                    {item.modifiers.length > 0 && (
                      <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                        {item.modifiers.join(", ")}
                      </Text>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-900 dark:text-white font-bold text-sm">
                      {fmt(item.quantity * item.unitPrice)}
                    </Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-xs">
                      {fmt(item.unitPrice)} each
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Payment Breakdown */}
          <SectionLabel text="Payment Breakdown" />
          <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            {[
              { label: "Subtotal", value: order.subtotal, neg: false },
              { label: "Tax (12%)", value: order.tax, neg: false },
              { label: "Discount", value: order.discount, neg: true },
              {
                label: "Service Charge",
                value: order.serviceCharge,
                neg: false,
              },
            ].map(({ label, value, neg }) => (
              <View key={label} className="flex-row justify-between mb-2.5">
                <Text className="text-gray-500 dark:text-gray-400 text-sm">
                  {label}
                </Text>
                <Text
                  className={`text-sm font-semibold ${neg && value > 0 ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}
                >
                  {neg && value > 0 ? `-${fmt(value)}` : fmt(value)}
                </Text>
              </View>
            ))}
            <View className="h-px bg-gray-100 dark:bg-gray-800 my-3" />
            <View className="flex-row justify-between">
              <Text className="text-gray-900 dark:text-white font-black text-base">
                TOTAL
              </Text>
              <Text className="text-gray-900 dark:text-white font-black text-lg">
                {fmt(order.total)}
              </Text>
            </View>
            {change != null && (
              <>
                <View className="flex-row justify-between mt-3">
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">
                    Cash Tendered
                  </Text>
                  <Text className="text-gray-700 dark:text-gray-300 font-semibold text-sm">
                    {fmt(order.cashTendered!)}
                  </Text>
                </View>
                <View className="flex-row justify-between mt-1.5">
                  <Text className="text-green-600 dark:text-green-400 font-bold text-sm">
                    Change
                  </Text>
                  <Text className="text-green-600 dark:text-green-400 font-bold text-sm">
                    {fmt(change)}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Timestamps */}
          <SectionLabel text="Timestamps" />
          <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">
                Created
              </Text>
              <Text className="text-gray-700 dark:text-gray-300 font-semibold text-sm">
                {fmtDateTime(order.createdAt)}
              </Text>
            </View>
            {order.completedAt && (
              <View className="flex-row justify-between">
                <Text className="text-gray-500 dark:text-gray-400 text-sm">
                  Completed
                </Text>
                <Text className="text-gray-700 dark:text-gray-300 font-semibold text-sm">
                  {fmtDateTime(order.completedAt)}
                </Text>
              </View>
            )}
          </View>

          {/* Status History */}
          <SectionLabel text="Status History" />
          <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            {order.statusLog.map((log, idx) => (
              <View key={idx} className="flex-row items-start mb-3 last:mb-0">
                <View className="w-6 items-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
                  {idx < order.statusLog.length - 1 && (
                    <View className="w-0.5 h-5 bg-gray-200 dark:bg-gray-700 mt-1" />
                  )}
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-gray-900 dark:text-white font-bold text-sm">
                    {log.from ? `${log.from} → ${log.to}` : log.to}
                  </Text>
                  <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                    {fmtDateTime(log.at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
