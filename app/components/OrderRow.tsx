import { Pressable, View, Text } from "react-native";
import { StatusBadge } from "./StatusBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderType = "dine-in" | "takeout";
type PaymentMethod = "Cash" | "Card" | "E-wallet";
type PaymentStatus = "Paid" | "Unpaid" | "Refunded";
type OrderStatus = "Preparing" | "Served" | "Done" | "Cancelled";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: string[];
}

interface StatusLog {
  from: OrderStatus | null;
  to: OrderStatus;
  at: string;
}

interface Order {
  id: string;
  receiptNumber: string;
  tableNumber?: string;
  orderType: OrderType;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  serviceCharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  completedAt?: string;
  cashTendered?: number;
  statusLog: StatusLog[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_TYPE_ICON: Record<OrderType, string> = {
  "dine-in": "🍽",
  takeout: "🥡",
};

const ORDER_STATUS_CLS: Record<OrderStatus, string> = {
  Preparing: "bg-yellow-100 dark:bg-yellow-900/40",
  Served: "bg-blue-100 dark:bg-blue-900/40",
  Done: "bg-green-100 dark:bg-green-900/40",
  Cancelled: "bg-red-100 dark:bg-red-900/40",
};

const ORDER_STATUS_TEXT_CLS: Record<OrderStatus, string> = {
  Preparing: "text-yellow-800 dark:text-yellow-300",
  Served: "text-blue-800 dark:text-blue-300",
  Done: "text-green-800 dark:text-green-300",
  Cancelled: "text-red-800 dark:text-red-300",
};

const PAYMENT_STATUS_CLS: Record<PaymentStatus, string> = {
  Paid: "bg-green-100 dark:bg-green-900/40",
  Unpaid: "bg-yellow-100 dark:bg-yellow-900/40",
  Refunded: "bg-gray-100 dark:bg-gray-700",
};

const PAYMENT_STATUS_TEXT_CLS: Record<PaymentStatus, string> = {
  Paid: "text-green-800 dark:text-green-300",
  Unpaid: "text-yellow-800 dark:text-yellow-300",
  Refunded: "text-gray-700 dark:text-gray-300",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── Component ────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: Order;
  onPress: () => void;
}

export function OrderRow({ order, onPress }: OrderRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-800 active:opacity-70"
    >
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-gray-900 dark:text-white font-extrabold text-base">
            {order.id}
          </Text>
          <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
            {order.receiptNumber}
          </Text>
        </View>
        <Text className="text-gray-900 dark:text-white font-black text-base">
          {fmt(order.total)}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-1.5 mt-3">
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
            {ORDER_TYPE_ICON[order.orderType]} {order.orderType}
            {order.tableNumber ? ` · ${order.tableNumber}` : ""}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between mt-3">
        <Text className="text-gray-400 dark:text-gray-500 text-xs">
          {order.paymentMethod}
        </Text>
        <Text className="text-gray-400 dark:text-gray-500 text-xs">
          {fmtTime(order.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

// Export types for use in other components
export type {
  Order,
  OrderItem,
  OrderType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  StatusLog,
};

export {
  ORDER_TYPE_ICON,
  ORDER_STATUS_CLS,
  ORDER_STATUS_TEXT_CLS,
  PAYMENT_STATUS_CLS,
  PAYMENT_STATUS_TEXT_CLS,
  fmt,
  fmtTime,
};
