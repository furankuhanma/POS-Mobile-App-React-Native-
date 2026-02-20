import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Component Imports ────────────────────────────────────────────────────────
import { StatusBadge } from "../components/StatusBadge";
import { FilterChip } from "../components/FilterChip";
import { SectionLabel } from "../components/SectionLabel";
import { PaginationBar } from "../components/PaganationBar";
import { OrderRow } from "../components/OrderRow";
import {
  DateFilterModal,
  DatePreset,
  DateRange,
  todayStr,
  daysAgo,
} from "../components/DateFilterModal";
import { EditItemsModal } from "../components/EditItemsModal";
import { EditOrderModal } from "../components/EditOrderModal";
import {
  StatusUpdateModal,
  ALLOWED_TRANSITIONS,
} from "../components/StatusUpdateModal";
import { OrderDetailModal } from "../components/OrderDetailModal";

// ─── Type Imports ─────────────────────────────────────────────────────────────
import type {
  Order,
  OrderItem,
  OrderType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../components/OrderRow";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-0001",
    receiptNumber: "RCP-202502-0001",
    tableNumber: "T-04",
    orderType: "dine-in",
    items: [
      {
        id: "i1",
        name: "Wagyu Burger",
        quantity: 2,
        unitPrice: 680,
        modifiers: ["Medium-rare", "Extra cheese"],
      },
      {
        id: "i2",
        name: "Truffle Fries",
        quantity: 2,
        unitPrice: 220,
        modifiers: [],
      },
      {
        id: "i3",
        name: "Sparkling Water",
        quantity: 2,
        unitPrice: 120,
        modifiers: ["No ice"],
      },
    ],
    subtotal: 2040,
    tax: 244.8,
    discount: 100,
    serviceCharge: 204,
    total: 2388.8,
    paymentMethod: "Card",
    paymentStatus: "Paid",
    orderStatus: "Done",
    createdAt: "2025-02-17T10:15:00",
    completedAt: "2025-02-17T11:02:00",
    statusLog: [
      { from: null, to: "Preparing", at: "2025-02-17T10:15:00" },
      { from: "Preparing", to: "Served", at: "2025-02-17T10:45:00" },
      { from: "Served", to: "Done", at: "2025-02-17T11:02:00" },
    ],
  },
  {
    id: "ORD-0002",
    receiptNumber: "RCP-202502-0002",
    tableNumber: "T-07",
    orderType: "dine-in",
    items: [
      {
        id: "i4",
        name: "Grilled Salmon",
        quantity: 1,
        unitPrice: 890,
        modifiers: ["Well done"],
      },
      {
        id: "i5",
        name: "Caesar Salad",
        quantity: 1,
        unitPrice: 340,
        modifiers: ["Dressing on side"],
      },
      {
        id: "i6",
        name: "Mango Cheesecake",
        quantity: 2,
        unitPrice: 280,
        modifiers: [],
      },
    ],
    subtotal: 1790,
    tax: 214.8,
    discount: 0,
    serviceCharge: 179,
    total: 2183.8,
    paymentMethod: "E-wallet",
    paymentStatus: "Paid",
    orderStatus: "Served",
    createdAt: "2025-02-17T11:30:00",
    statusLog: [
      { from: null, to: "Preparing", at: "2025-02-17T11:30:00" },
      { from: "Preparing", to: "Served", at: "2025-02-17T12:00:00" },
    ],
  },
  {
    id: "ORD-0003",
    receiptNumber: "RCP-202502-0003",
    orderType: "takeout",
    items: [
      {
        id: "i7",
        name: "Chicken Sandwich",
        quantity: 3,
        unitPrice: 320,
        modifiers: ["No pickles"],
      },
      {
        id: "i8",
        name: "Iced Coffee",
        quantity: 3,
        unitPrice: 180,
        modifiers: ["Less sweet"],
      },
    ],
    subtotal: 1500,
    tax: 180,
    discount: 150,
    serviceCharge: 0,
    total: 1530,
    paymentMethod: "Cash",
    paymentStatus: "Paid",
    orderStatus: "Done",
    createdAt: "2025-02-17T12:00:00",
    completedAt: "2025-02-17T12:25:00",
    cashTendered: 2000,
    statusLog: [
      { from: null, to: "Preparing", at: "2025-02-17T12:00:00" },
      { from: "Preparing", to: "Done", at: "2025-02-17T12:25:00" },
    ],
  },
  {
    id: "ORD-0004",
    receiptNumber: "RCP-202502-0004",
    tableNumber: "T-02",
    orderType: "dine-in",
    items: [
      {
        id: "i9",
        name: "Pizza Margherita",
        quantity: 1,
        unitPrice: 580,
        modifiers: ["Thin crust"],
      },
      {
        id: "i10",
        name: "Garlic Bread",
        quantity: 2,
        unitPrice: 120,
        modifiers: [],
      },
    ],
    subtotal: 820,
    tax: 98.4,
    discount: 0,
    serviceCharge: 82,
    total: 1000.4,
    paymentMethod: "Cash",
    paymentStatus: "Unpaid",
    orderStatus: "Preparing",
    createdAt: "2025-02-17T13:10:00",
    statusLog: [{ from: null, to: "Preparing", at: "2025-02-17T13:10:00" }],
  },
  {
    id: "ORD-0005",
    receiptNumber: "RCP-202502-0005",
    tableNumber: "T-11",
    orderType: "dine-in",
    items: [
      {
        id: "i11",
        name: "Beef Steak Platter",
        quantity: 2,
        unitPrice: 950,
        modifiers: ["Medium"],
      },
      {
        id: "i12",
        name: "Red Wine (glass)",
        quantity: 4,
        unitPrice: 350,
        modifiers: [],
      },
      {
        id: "i13",
        name: "Tiramisu",
        quantity: 2,
        unitPrice: 290,
        modifiers: [],
      },
    ],
    subtotal: 3680,
    tax: 441.6,
    discount: 368,
    serviceCharge: 368,
    total: 4121.6,
    paymentMethod: "Card",
    paymentStatus: "Refunded",
    orderStatus: "Cancelled",
    createdAt: "2025-02-16T19:30:00",
    completedAt: "2025-02-16T20:00:00",
    statusLog: [
      { from: null, to: "Preparing", at: "2025-02-16T19:30:00" },
      { from: "Preparing", to: "Cancelled", at: "2025-02-16T20:00:00" },
    ],
  },
  {
    id: "ORD-0006",
    receiptNumber: "RCP-202502-0006",
    orderType: "takeout",
    items: [
      {
        id: "i14",
        name: "Bagel with Cream Cheese",
        quantity: 2,
        unitPrice: 210,
        modifiers: [],
      },
      {
        id: "i15",
        name: "Cold Brew Coffee",
        quantity: 2,
        unitPrice: 220,
        modifiers: ["Oat milk"],
      },
    ],
    subtotal: 860,
    tax: 103.2,
    discount: 0,
    serviceCharge: 0,
    total: 963.2,
    paymentMethod: "E-wallet",
    paymentStatus: "Paid",
    orderStatus: "Done",
    createdAt: "2025-02-16T08:45:00",
    completedAt: "2025-02-16T09:05:00",
    statusLog: [
      { from: null, to: "Preparing", at: "2025-02-16T08:45:00" },
      { from: "Preparing", to: "Done", at: "2025-02-16T09:05:00" },
    ],
  },
  {
    id: "ORD-0007",
    receiptNumber: "RCP-202502-0007",
    tableNumber: "T-01",
    orderType: "dine-in",
    items: [
      {
        id: "i16",
        name: "Ramen Tonkotsu",
        quantity: 2,
        unitPrice: 480,
        modifiers: ["Spicy", "Extra chashu"],
      },
      {
        id: "i17",
        name: "Gyoza (6pcs)",
        quantity: 1,
        unitPrice: 280,
        modifiers: [],
      },
    ],
    subtotal: 1240,
    tax: 148.8,
    discount: 0,
    serviceCharge: 124,
    total: 1512.8,
    paymentMethod: "Cash",
    paymentStatus: "Paid",
    orderStatus: "Served",
    createdAt: "2025-02-17T13:45:00",
    cashTendered: 2000,
    statusLog: [
      { from: null, to: "Preparing", at: "2025-02-17T13:45:00" },
      { from: "Preparing", to: "Served", at: "2025-02-17T14:10:00" },
    ],
  },
  {
    id: "ORD-0008",
    receiptNumber: "RCP-202502-0008",
    tableNumber: "T-03",
    orderType: "dine-in",
    items: [
      {
        id: "i18",
        name: "Pasta Carbonara",
        quantity: 2,
        unitPrice: 420,
        modifiers: [],
      },
      {
        id: "i19",
        name: "Lemonade",
        quantity: 2,
        unitPrice: 150,
        modifiers: ["Extra ice"],
      },
    ],
    subtotal: 1140,
    tax: 136.8,
    discount: 50,
    serviceCharge: 114,
    total: 1340.8,
    paymentMethod: "Card",
    paymentStatus: "Unpaid",
    orderStatus: "Preparing",
    createdAt: "2025-02-17T14:20:00",
    statusLog: [{ from: null, to: "Preparing", at: "2025-02-17T14:20:00" }],
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateStr = (iso: string) => iso.slice(0, 10);

const recalcOrder = (
  items: OrderItem[],
  discount: number,
  serviceCharge: number,
): Pick<Order, "subtotal" | "tax" | "total"> => {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = parseFloat((subtotal * 0.12).toFixed(2));
  const total = parseFloat(
    (subtotal + tax - discount + serviceCharge).toFixed(2),
  );
  return { subtotal, tax, total };
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrderHistoryScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // ─── State ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "All">("All");
  const [filterPayment, setFilterPayment] = useState<PaymentMethod | "All">(
    "All",
  );
  const [filterType, setFilterType] = useState<OrderType | "All">("All");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  const [showDateModal, setShowDateModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showEditItems, setShowEditItems] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);

  // ─── Computed Values ────────────────────────────────────────────────────────

  const dateLabel = useMemo(() => {
    const map: Record<DatePreset, string> = {
      all: "All Time",
      today: "Today",
      yesterday: "Yesterday",
      last7: "Last 7 Days",
      last30: "Last 30 Days",
      custom: `${dateRange.from} – ${dateRange.to}`,
    };
    return map[datePreset];
  }, [datePreset, dateRange]);

  const activeDateRange = useMemo((): DateRange | null => {
    if (datePreset === "all") return null;
    if (datePreset === "today") return { from: todayStr(), to: todayStr() };
    if (datePreset === "yesterday") return { from: daysAgo(1), to: daysAgo(1) };
    if (datePreset === "last7") return { from: daysAgo(7), to: todayStr() };
    if (datePreset === "last30") return { from: daysAgo(30), to: todayStr() };
    if (datePreset === "custom") return dateRange;
    return null;
  }, [datePreset, dateRange]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.id.toLowerCase().includes(q) &&
          !o.receiptNumber.toLowerCase().includes(q)
        )
          return false;
      }
      if (filterStatus !== "All" && o.orderStatus !== filterStatus)
        return false;
      if (filterPayment !== "All" && o.paymentMethod !== filterPayment)
        return false;
      if (filterType !== "All" && o.orderType !== filterType) return false;
      if (activeDateRange) {
        const d = toDateStr(o.createdAt);
        if (d < activeDateRange.from || d > activeDateRange.to) return false;
      }
      return true;
    });
  }, [
    orders,
    search,
    filterStatus,
    filterPayment,
    filterType,
    activeDateRange,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters =
    filterStatus !== "All" ||
    filterPayment !== "All" ||
    filterType !== "All" ||
    datePreset !== "all" ||
    search !== "";

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleDateApply = (preset: DatePreset, range?: DateRange) => {
    setDatePreset(preset);
    if (range) setDateRange(range);
    setPage(1);
  };

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (
          o.id !== orderId ||
          !ALLOWED_TRANSITIONS[o.orderStatus].includes(newStatus)
        )
          return o;
        return {
          ...o,
          orderStatus: newStatus,
          completedAt:
            newStatus === "Done" || newStatus === "Cancelled"
              ? now
              : o.completedAt,
          statusLog: [
            ...o.statusLog,
            { from: o.orderStatus, to: newStatus, at: now },
          ],
        };
      }),
    );
    setSelectedOrder((prev) =>
      prev?.id === orderId
        ? {
            ...prev,
            orderStatus: newStatus,
            statusLog: [
              ...prev.statusLog,
              { from: prev.orderStatus, to: newStatus, at: now },
            ],
          }
        : prev,
    );
  };

  const handleEdit = (orderId: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)),
    );
    setSelectedOrder((prev) =>
      prev?.id === orderId ? { ...prev, ...updates } : prev,
    );
  };

  const handleItemsSave = (orderId: string, newItems: OrderItem[]) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const recalc = recalcOrder(newItems, o.discount, o.serviceCharge);
        return { ...o, items: newItems, ...recalc };
      }),
    );
    setSelectedOrder((prev) => {
      if (prev?.id !== orderId) return prev;
      const recalc = recalcOrder(newItems, prev.discount, prev.serviceCharge);
      return { ...prev, items: newItems, ...recalc };
    });
  };

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const resetFilters = () => {
    setSearch("");
    setFilterStatus("All");
    setFilterPayment("All");
    setFilterType("All");
    setDatePreset("all");
    setPage(1);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-800">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <View className="px-5 pt-6 pb-4 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <View className="flex-row items-end justify-between mb-4">
          <Text className="text-2xl font-black text-gray-900 dark:text-white">
            Order History
          </Text>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center px-4 mb-3 bg-gray-100 dark:bg-gray-900 rounded-xl h-11">
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            placeholder="Search by Order ID or Receipt No."
            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
            className="flex-1 ml-3 text-sm text-gray-900 dark:text-white"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => {
                setSearch("");
                setPage(1);
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </Pressable>
          )}
        </View>

        {/* Filter Toggle + Date Picker Row */}
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            className="flex-row items-center gap-1.5"
          >
            <Ionicons
              name={showFilters ? "options" : "options-outline"}
              size={16}
              color={
                showFilters
                  ? isDark
                    ? "#60A5FA"
                    : "#2563EB"
                  : isDark
                    ? "#9CA3AF"
                    : "#6B7280"
              }
            />
            <Text
              className={`text-sm font-semibold ${showFilters ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              {showFilters ? "Hide Filters" : "Filters"}
            </Text>
            {hasActiveFilters && (
              <View className="w-2 h-2 bg-blue-600 rounded-full dark:bg-blue-400" />
            )}
          </Pressable>

          <Pressable
            onPress={() => setShowDateModal(true)}
            // Add 'flex-shrink-0' and ensure no 'max-width' is cutting it off
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 flex-shrink-0
  ${
    datePreset !== "all"
      ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
  }`}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={
                datePreset !== "all"
                  ? isDark
                    ? "#60A5FA"
                    : "#2563EB"
                  : isDark
                    ? "#9CA3AF"
                    : "#6B7280"
              }
            />
            <Text
              // numberOfLines={1} ensures it stays on one line
              numberOfLines={1}
              className={`text-xs font-semibold ${datePreset !== "all" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              {dateLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={11}
              color={
                datePreset !== "all"
                  ? isDark
                    ? "#60A5FA"
                    : "#2563EB"
                  : isDark
                    ? "#9CA3AF"
                    : "#6B7280"
              }
            />
          </Pressable>
        </View>
      </View>

      {/* ── Filter Panel ─────────────────────────────────────────────────────── */}
      {showFilters && (
        <View className="px-4 py-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold tracking-widest text-gray-400 uppercase dark:text-gray-500">
              Filters
            </Text>
            {hasActiveFilters && (
              <Pressable onPress={resetFilters}>
                <Text className="text-xs font-bold text-red-500">
                  Reset All
                </Text>
              </Pressable>
            )}
          </View>

          {[
            {
              label: "Order Status",
              options: [
                "All",
                "Preparing",
                "Served",
                "Done",
                "Cancelled",
              ] as const,
              value: filterStatus,
              set: (v: string) => {
                setFilterStatus(v as OrderStatus | "All");
                setPage(1);
              },
            },
            {
              label: "Payment",
              options: ["All", "Cash", "Card", "E-wallet"] as const,
              value: filterPayment,
              set: (v: string) => {
                setFilterPayment(v as PaymentMethod | "All");
                setPage(1);
              },
            },
            {
              label: "Order Type",
              options: ["All", "dine-in", "takeout"] as const,
              value: filterType,
              set: (v: string) => {
                setFilterType(v as OrderType | "All");
                setPage(1);
              },
            },
          ].map(({ label, options, value, set }) => (
            <View key={label} className="mb-3">
              <Text className="mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
                {label}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {options.map((opt) => (
                  <FilterChip
                    key={opt}
                    label={
                      opt === "dine-in"
                        ? "🍽 dine-in"
                        : opt === "takeout"
                          ? "🥡 takeout"
                          : opt
                    }
                    active={value === opt}
                    onPress={() => set(opt)}
                  />
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      )}

      {/* ── Order List ───────────────────────────────────────────────────────── */}
      <FlatList
        data={paginated}
        keyExtractor={(o) => o.id}
        contentContainerClassName="p-4 pb-4"
        renderItem={({ item }) => (
          <OrderRow order={item} onPress={() => openOrder(item)} />
        )}
        ListEmptyComponent={
          <View className="items-center pt-16">
            <Ionicons
              name="receipt-outline"
              size={48}
              color={isDark ? "#4B5563" : "#D1D5DB"}
            />
            <Text className="mt-4 text-base font-extrabold text-gray-700 dark:text-gray-300">
              No orders found
            </Text>
            <Text className="mt-1 text-sm text-center text-gray-400 dark:text-gray-500">
              Try adjusting your filters.
            </Text>
            {hasActiveFilters && (
              <Pressable
                onPress={resetFilters}
                className="mt-5 bg-blue-600 px-6 py-2.5 rounded-xl"
              >
                <Text className="text-sm font-bold text-white">
                  Clear Filters
                </Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* ── Sticky Pagination Bar ─────────────────────────────────────────────── */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        isDark={isDark}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
        pageSize={PAGE_SIZE}
      />

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <DateFilterModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        onApply={handleDateApply}
      />

      <OrderDetailModal
        order={selectedOrder}
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        onEditPress={() => {
          setShowDetail(false);
          setTimeout(() => setShowEdit(true), 300);
        }}
        onStatusPress={() => {
          setShowDetail(false);
          setTimeout(() => setShowStatusUpdate(true), 300);
        }}
      />

      <EditOrderModal
        order={selectedOrder}
        visible={showEdit}
        onClose={() => {
          setShowEdit(false);
          setTimeout(() => setShowDetail(true), 300);
        }}
        onSave={(u) => selectedOrder && handleEdit(selectedOrder.id, u)}
        onEditItems={() => {
          setShowEdit(false);
          setTimeout(() => setShowEditItems(true), 300);
        }}
      />

      <EditItemsModal
        order={selectedOrder}
        visible={showEditItems}
        onClose={() => {
          setShowEditItems(false);
          setTimeout(() => setShowEdit(true), 300);
        }}
        onSave={(items) =>
          selectedOrder && handleItemsSave(selectedOrder.id, items)
        }
      />

      <StatusUpdateModal
        order={selectedOrder}
        visible={showStatusUpdate}
        onClose={() => {
          setShowStatusUpdate(false);
          setTimeout(() => setShowDetail(true), 300);
        }}
        onUpdate={(s) =>
          selectedOrder && handleStatusUpdate(selectedOrder.id, s)
        }
      />
    </View>
  );
}
