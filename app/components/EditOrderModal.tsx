import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  Text,
  TextInput,
  Dimensions,
} from "react-native";
import {
  Order,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  ORDER_TYPE_ICON,
} from "./OrderRow";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Component ────────────────────────────────────────────────────────────────

interface EditOrderModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Order>) => void;
  onEditItems: () => void;
}

export function EditOrderModal({
  order,
  visible,
  onClose,
  onSave,
  onEditItems,
}: EditOrderModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [pm, setPm] = useState<PaymentMethod>("Cash");
  const [ps, setPs] = useState<PaymentStatus>("Paid");
  const [discount, setDiscount] = useState("0");
  const [serviceCharge, setServiceCharge] = useState("0");
  const [tableNumber, setTableNumber] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("dine-in");

  if (!order) return null;

  const handleShow = () => {
    setPm(order.paymentMethod);
    setPs(order.paymentStatus);
    setDiscount(String(order.discount));
    setServiceCharge(String(order.serviceCharge));
    setTableNumber(order.tableNumber ?? "");
    setOrderType(order.orderType);
  };

  const handleSave = () => {
    const d = parseFloat(discount) || 0;
    const sc = parseFloat(serviceCharge) || 0;

    // Recalculate totals
    const subtotal = order.items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    const tax = parseFloat((subtotal * 0.12).toFixed(2));
    const total = parseFloat((subtotal + tax - d + sc).toFixed(2));

    onSave({
      paymentMethod: pm,
      paymentStatus: ps,
      discount: d,
      serviceCharge: sc,
      orderType,
      tableNumber:
        orderType === "dine-in" ? tableNumber || undefined : undefined,
      subtotal,
      tax,
      total,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            height: SCREEN_HEIGHT * 0.9,
            backgroundColor: isDark ? "#111827" : "#FFFFFF",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-1">
              <Text className="text-gray-900 dark:text-white font-extrabold text-base">
                Edit Order
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                {order.id} · {order.receiptNumber}
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

          {/* Scrollable Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={true}
          >
            {/* Edit Items Button */}
            <Pressable
              onPress={onEditItems}
              className="flex-row items-center justify-between bg-orange-50 dark:bg-orange-950/50 border-2 border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3.5 mb-5"
            >
              <View className="flex-row items-center gap-3">
                <View className="bg-orange-100 dark:bg-orange-900 rounded-lg p-1.5">
                  <Ionicons
                    name="fast-food-outline"
                    size={18}
                    color={isDark ? "#FB923C" : "#EA580C"}
                  />
                </View>
                <View>
                  <Text className="text-orange-700 dark:text-orange-300 font-extrabold text-sm">
                    Edit Ordered Items
                  </Text>
                  <Text className="text-orange-500 dark:text-orange-400 text-xs mt-0.5">
                    {order.items.length} item
                    {order.items.length !== 1 ? "s" : ""} · Tap to modify
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={isDark ? "#FB923C" : "#EA580C"}
              />
            </Pressable>

            {/* Order Type */}
            <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Order Type
            </Text>
            <View className="flex-row gap-2 mb-5">
              {(["dine-in", "takeout"] as OrderType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setOrderType(t)}
                  className={`flex-1 py-2.5 rounded-xl items-center border-2
                    ${orderType === t ? "bg-blue-600 border-blue-600" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
                >
                  <Text
                    className={`text-sm font-bold ${orderType === t ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {ORDER_TYPE_ICON[t]} {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Table Number (only for dine-in) */}
            {orderType === "dine-in" && (
              <>
                <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                  Table Number
                </Text>
                <TextInput
                  value={tableNumber}
                  onChangeText={setTableNumber}
                  placeholder="e.g. T-04"
                  placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                  className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-5"
                />
              </>
            )}

            {/* Payment Method */}
            <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Payment Method
            </Text>
            <View className="flex-row gap-2 mb-5">
              {(["Cash", "Card", "E-wallet"] as PaymentMethod[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setPm(m)}
                  className={`flex-1 py-2.5 rounded-xl items-center border-2
                    ${pm === m ? "bg-blue-600 border-blue-600" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
                >
                  <Text
                    className={`text-sm font-bold ${pm === m ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Payment Status */}
            <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Payment Status
            </Text>
            <View className="flex-row gap-2 mb-5">
              {(["Paid", "Unpaid", "Refunded"] as PaymentStatus[]).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setPs(s)}
                  className={`flex-1 py-2.5 rounded-xl items-center border-2
                    ${ps === s ? "bg-blue-600 border-blue-600" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
                >
                  <Text
                    className={`text-sm font-bold ${ps === s ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Discount */}
            <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Discount (₱)
            </Text>
            <TextInput
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
              className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-5"
            />

            {/* Service Charge */}
            <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Service Charge (₱)
            </Text>
            <TextInput
              value={serviceCharge}
              onChangeText={setServiceCharge}
              keyboardType="numeric"
              placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
              className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-5"
            />
          </ScrollView>

          {/* Footer - Fixed at bottom */}
          <View
            className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800"
            style={{ backgroundColor: isDark ? "#111827" : "#FFFFFF" }}
          >
            <Pressable
              onPress={handleSave}
              className="bg-blue-600 rounded-xl py-3.5 items-center"
            >
              <Text className="text-white font-extrabold text-sm">
                Save Changes
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
