import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Component Imports ────────────────────────────────────────────────────────
import { FilterChip } from "../components/FilterChip";
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

// ─── DB Imports ───────────────────────────────────────────────────────────────
import { ordersRepo } from "../data/Orders";
import { dbOrderToUi, uiItemsToDb } from "../data/OrderAdapter";
import { exportOrdersToExcel } from "../data/ExportOrders";

// ─── Type Imports ─────────────────────────────────────────────────────────────
import type {
  Order,
  OrderItem,
  OrderType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../components/OrderRow";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const activeDateRange = (
  preset: DatePreset,
  custom: DateRange,
): DateRange | null => {
  if (preset === "all") return null;
  if (preset === "today") return { from: todayStr(), to: todayStr() };
  if (preset === "yesterday") return { from: daysAgo(1), to: daysAgo(1) };
  if (preset === "last7") return { from: daysAgo(7), to: todayStr() };
  if (preset === "last30") return { from: daysAgo(30), to: todayStr() };
  if (preset === "custom") return custom;
  return null;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrderHistoryScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // ─── State ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false); // spinner during clear

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

  // ─── Load from DB ────────────────────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const range = activeDateRange(datePreset, dateRange);
      const dbRows = await ordersRepo.filter({
        search: search || undefined,
        orderStatus: filterStatus !== "All" ? filterStatus : undefined,
        paymentStatus: filterPayment !== "All" ? filterPayment : undefined,
        paymentMethod: filterPayment !== "All" ? filterPayment : undefined,
        orderType: filterType !== "All" ? filterType : undefined,
        dateFrom: range?.from,
        dateTo: range?.to,
      });

      const uiOrders: Order[] = await Promise.all(
        dbRows.map(async (dbOrder) => {
          const dbItems = await ordersRepo.items.getByOrder(dbOrder.id);
          return dbOrderToUi(dbOrder, dbItems);
        }),
      );

      setOrders(uiOrders);
    } catch (e) {
      console.error("[OrderHistory] load error", e);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterPayment, filterType, datePreset, dateRange]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ─── Clear History Flow ───────────────────────────────────────────────────────
  // Step 1: Ask user if they want to export first
  // Step 2a (Export & Clear): Export → then delete after share sheet closes
  // Step 2b (Clear only): Second confirmation → delete
  // All orders loaded at the time of the action are deleted regardless of filters.

  const handleClearHistory = () => {
    if (orders.length === 0) {
      Alert.alert("Nothing to Clear", "There are no orders to delete.");
      return;
    }

    Alert.alert(
      "Clear Order History",
      `You have ${orders.length} order${orders.length !== 1 ? "s" : ""} visible. Do you want to export before clearing? This action cannot be undone.`,
      [
        {
          text: "Export & Clear",
          onPress: handleExportThenClear,
        },
        {
          text: "Clear Without Exporting",
          style: "destructive",
          onPress: confirmClearWithoutExport,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );
  };

  const handleExportThenClear = async () => {
    try {
      setClearing(true);
      // Load ALL orders (no filter) so the export is complete
      const allDbRows = await ordersRepo.filter({});
      const allOrders: Order[] = await Promise.all(
        allDbRows.map(async (dbOrder) => {
          const dbItems = await ordersRepo.items.getByOrder(dbOrder.id);
          return dbOrderToUi(dbOrder, dbItems);
        }),
      );

      await exportOrdersToExcel(allOrders);

      // After share sheet closes (user saved/shared), proceed to delete
      await performClear(allOrders.length);
    } catch (e: any) {
      console.error("[OrderHistory] export error", e);
      Alert.alert(
        "Export Failed",
        e?.message ?? "Could not export. Please try again.",
      );
    } finally {
      setClearing(false);
    }
  };

  const confirmClearWithoutExport = () => {
    Alert.alert(
      "Are you sure?",
      "All order history will be permanently deleted. This cannot be undone.",
      [
        {
          text: "Yes, Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              setClearing(true);
              const allDbRows = await ordersRepo.filter({});
              await performClear(allDbRows.length);
            } catch (e: any) {
              Alert.alert(
                "Error",
                "Failed to clear history. Please try again.",
              );
            } finally {
              setClearing(false);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const performClear = async (count: number) => {
    await ordersRepo.deleteAll();
    setOrders([]);
    setPage(1);
    Alert.alert(
      "Cleared",
      `${count} order${count !== 1 ? "s" : ""} have been deleted.`,
    );
  };

  // ─── Computed ────────────────────────────────────────────────────────────────

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

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const paginated = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    filterStatus !== "All" ||
    filterPayment !== "All" ||
    filterType !== "All" ||
    datePreset !== "all" ||
    search !== "";

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleDateApply = (preset: DatePreset, range?: DateRange) => {
    setDatePreset(preset);
    if (range) setDateRange(range);
    setPage(1);
  };

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || !order._dbId) return;

    await ordersRepo.updateStatus(
      order._dbId,
      newStatus,
      JSON.stringify(
        order.statusLog.map((l) => ({ from: l.from, to: l.to, at: l.at })),
      ),
    );

    await loadOrders();

    setSelectedOrder((prev) => {
      if (!prev || prev.id !== orderId) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        orderStatus: newStatus,
        statusLog: [
          ...prev.statusLog,
          { from: prev.orderStatus, to: newStatus, at: now },
        ],
        completedAt:
          newStatus === "Done" || newStatus === "Cancelled"
            ? now
            : prev.completedAt,
      };
    });
  };

  const handleEdit = async (orderId: string, updates: Partial<Order>) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || !order._dbId) return;

    await ordersRepo.update(order._dbId, {
      order_type: updates.orderType as any,
      payment_status: updates.paymentStatus as any,
      payment_method: updates.paymentMethod as any,
      table_number: updates.tableNumber ?? null,
      subtotal: updates.subtotal,
      tax: updates.tax,
      discount: updates.discount,
      service_charge: updates.serviceCharge,
      total_amount: updates.total,
    });

    await loadOrders();
    setSelectedOrder((prev) =>
      prev?.id === orderId ? { ...prev, ...updates } : prev,
    );
  };

  const handleItemsSave = async (orderId: string, newItems: OrderItem[]) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || !order._dbId) return;

    const dbItems = uiItemsToDb(order._dbId, newItems);
    await ordersRepo.items.replaceAll(order._dbId, dbItems);

    const subtotal = newItems.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    const tax = parseFloat((subtotal * 0.12).toFixed(2));
    const total = parseFloat(
      (subtotal + tax - order.discount + order.serviceCharge).toFixed(2),
    );

    await ordersRepo.update(order._dbId, {
      subtotal,
      tax,
      total_amount: total,
    });
    await loadOrders();

    setSelectedOrder((prev) => {
      if (!prev || prev.id !== orderId) return prev;
      return { ...prev, items: newItems, subtotal, tax, total };
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-800">
      {/* ── Header ── */}
      <View className="px-5 pt-6 pb-4 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-black text-gray-900 dark:text-white">
            Order History
          </Text>

          {/* ✅ Clear History button */}
          <Pressable
            onPress={handleClearHistory}
            disabled={clearing || orders.length === 0}
            className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border-2 ${
              orders.length === 0
                ? "border-gray-200 dark:border-gray-700 opacity-40"
                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40"
            }`}
          >
            {clearing ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            )}
            <Text className="text-xs font-bold text-red-500">
              {clearing ? "Working…" : "Clear History"}
            </Text>
          </Pressable>
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
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 flex-shrink-0 ${
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

      {/* ── Filter Panel ── */}
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

      {/* ── Order List ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isDark ? "#60A5FA" : "#2563EB"}
          />
        </View>
      ) : (
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
                {hasActiveFilters
                  ? "Try adjusting your filters."
                  : "Orders placed from the cashier will appear here."}
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
      )}

      {/* ── Pagination ── */}
      {!loading && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={orders.length}
          isDark={isDark}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
          pageSize={PAGE_SIZE}
        />
      )}

      {/* ── Modals ── */}
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
