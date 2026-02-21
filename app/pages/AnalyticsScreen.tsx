import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ordersRepo } from "../data/Orders";
import { dbOrderToUi } from "../data/OrderAdapter";
import type { Order } from "../components/OrderRow";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toFixed(0)}`;
};

const toDateStr = (iso: string) => iso.slice(0, 10);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <View className="flex-1 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
      <View className="flex-row items-center justify-between mb-3">
        <View
          className={`w-10 h-10 rounded-xl items-center justify-center ${iconBg}`}
        >
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      </View>
      <Text className="text-gray-900 dark:text-white font-black text-xl">
        {value}
      </Text>
      <Text className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 font-medium">
        {label}
      </Text>
      {sub && (
        <Text className="text-gray-400 dark:text-gray-500 text-[11px] mt-0.5">
          {sub}
        </Text>
      )}
    </View>
  );
}

function BarChart({
  data,
  isDark,
  color = "#2563EB",
}: {
  data: { label: string; value: number }[];
  isDark: boolean;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View className="flex-row items-end gap-1.5 h-28">
      {data.map((d, i) => {
        const pct = d.value / max;
        const h = Math.max(pct * 96, 3);
        return (
          <View key={i} className="flex-1 items-center">
            <Text
              className="text-[10px] font-bold mb-1"
              style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}
            >
              {fmtShort(d.value).replace("₱", "")}
            </Text>
            <View
              style={{
                height: h,
                backgroundColor: color,
                borderRadius: 4,
                width: "100%",
                opacity: 0.85,
              }}
            />
            <Text
              className="text-[9px] mt-1 font-medium"
              style={{ color: isDark ? "#6B7280" : "#9CA3AF" }}
              numberOfLines={1}
            >
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function DonutBar({
  segments,
  isDark,
}: {
  segments: { label: string; value: number; color: string }[];
  isDark: boolean;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <View>
      <View className="h-4 flex-row rounded-full overflow-hidden mb-3">
        {segments.map((s, i) => (
          <View
            key={i}
            style={{ flex: s.value / total, backgroundColor: s.color }}
          />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s, i) => (
          <View key={i} className="flex-row items-center gap-1.5">
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                backgroundColor: s.color,
              }}
            />
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {s.label}{" "}
              <Text className="font-bold text-gray-900 dark:text-white">
                {((s.value / total) * 100).toFixed(0)}%
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-3">
      <Text className="text-gray-900 dark:text-white font-black text-base">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
          {subtitle}
        </Text>
      )}
    </View>
  );
}

function RankRow({
  rank,
  name,
  value,
  sub,
  pct,
  color,
  isDark,
}: {
  rank: number;
  name: string;
  value: string;
  sub?: string;
  pct: number;
  color: string;
  isDark: boolean;
}) {
  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center flex-1 gap-2">
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor:
                rank <= 3 ? color : isDark ? "#374151" : "#E5E7EB",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "900",
                color: rank <= 3 ? "#fff" : isDark ? "#9CA3AF" : "#6B7280",
              }}
            >
              {rank}
            </Text>
          </View>
          <Text
            className="text-gray-800 dark:text-gray-200 font-semibold text-sm flex-1"
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-gray-900 dark:text-white font-bold text-sm">
            {value}
          </Text>
          {sub && (
            <Text className="text-gray-400 dark:text-gray-500 text-[11px]">
              {sub}
            </Text>
          )}
        </View>
      </View>
      <View className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <View
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            height: "100%",
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ orders, isDark }: { orders: Order[]; isDark: boolean }) {
  const paidOrders = orders.filter((o) => o.paymentStatus === "Paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgOrder = paidOrders.length ? totalRevenue / paidOrders.length : 0;
  const completedOrders = orders.filter((o) => o.orderStatus === "Done").length;
  const completionRate = totalOrders
    ? (completedOrders / totalOrders) * 100
    : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const revenueByDay = last7Days.map((date) => ({
    label: new Date(date).toLocaleDateString("en-PH", { weekday: "short" }),
    value: orders
      .filter(
        (o) => toDateStr(o.createdAt) === date && o.paymentStatus === "Paid",
      )
      .reduce((s, o) => s + o.total, 0),
  }));

  const paymentBreakdown = [
    {
      label: "Cash",
      value: paidOrders
        .filter((o) => o.paymentMethod === "Cash")
        .reduce((s, o) => s + o.total, 0),
      color: "#16A34A",
    },
    {
      label: "Card",
      value: paidOrders
        .filter((o) => o.paymentMethod === "Card")
        .reduce((s, o) => s + o.total, 0),
      color: "#2563EB",
    },
    {
      label: "E-wallet",
      value: paidOrders
        .filter((o) => o.paymentMethod === "E-wallet")
        .reduce((s, o) => s + o.total, 0),
      color: "#7C3AED",
    },
  ].filter((p) => p.value > 0);

  const dineIn = orders.filter((o) => o.orderType === "dine-in").length;
  const takeout = orders.filter((o) => o.orderType === "takeout").length;
  const delivery = orders.filter((o) => o.orderType === "delivery").length;
  const orderTypeSplit = [
    { label: "Dine-in", value: dineIn, color: "#0EA5E9" },
    { label: "Takeout", value: takeout, color: "#F59E0B" },
    { label: "Delivery", value: delivery, color: "#7C3AED" },
  ].filter((s) => s.value > 0);

  const statusBreakdown = (
    ["Done", "Served", "Preparing", "Cancelled"] as Order["orderStatus"][]
  ).map((s) => ({
    label: s,
    count: orders.filter((o) => o.orderStatus === s).length,
    color:
      s === "Done"
        ? "#16A34A"
        : s === "Served"
          ? "#2563EB"
          : s === "Preparing"
            ? "#D97706"
            : "#DC2626",
  }));

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <View className="flex-row gap-3 mb-3">
        <MetricCard
          icon="cash-outline"
          label="Total Revenue"
          value={fmtShort(totalRevenue)}
          sub="All paid orders"
          iconBg="bg-green-100 dark:bg-green-900/40"
          iconColor="#16A34A"
        />
        <MetricCard
          icon="receipt-outline"
          label="Total Orders"
          value={String(totalOrders)}
          sub={`${completedOrders} completed`}
          iconBg="bg-blue-100 dark:bg-blue-900/40"
          iconColor="#2563EB"
        />
      </View>
      <View className="flex-row gap-3 mb-5">
        <MetricCard
          icon="stats-chart-outline"
          label="Avg. Order Value"
          value={fmtShort(avgOrder)}
          sub="Per paid order"
          iconBg="bg-purple-100 dark:bg-purple-900/40"
          iconColor="#7C3AED"
        />
        <MetricCard
          icon="checkmark-circle-outline"
          label="Completion Rate"
          value={`${completionRate.toFixed(0)}%`}
          sub="Done / Total"
          iconBg="bg-orange-100 dark:bg-orange-900/40"
          iconColor="#D97706"
        />
      </View>

      <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title="Revenue — Last 7 Days"
          subtitle="Paid orders only"
        />
        <BarChart data={revenueByDay} isDark={isDark} color="#2563EB" />
      </View>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
          <SectionHeader title="Payment Methods" />
          {paymentBreakdown.length > 0 ? (
            <DonutBar segments={paymentBreakdown} isDark={isDark} />
          ) : (
            <Text className="text-gray-400 text-xs">No data yet</Text>
          )}
        </View>
        <View className="flex-1 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
          <SectionHeader title="Order Type" />
          {orderTypeSplit.length > 0 ? (
            <DonutBar segments={orderTypeSplit} isDark={isDark} />
          ) : (
            <Text className="text-gray-400 text-xs">No data yet</Text>
          )}
        </View>
      </View>

      <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
        <SectionHeader title="Order Status Breakdown" />
        <View className="flex-row gap-2 flex-wrap">
          {statusBreakdown.map((s) => (
            <View
              key={s.label}
              className="flex-row items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 mb-1"
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: s.color,
                }}
              />
              <Text className="text-gray-700 dark:text-gray-300 text-sm">
                {s.label}
              </Text>
              <Text className="font-black text-gray-900 dark:text-white text-sm">
                {s.count}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function ProductsTab({ orders, isDark }: { orders: Order[]; isDark: boolean }) {
  const [sortBy, setSortBy] = useState<"revenue" | "qty">("revenue");

  const itemStats = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> =
      {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (!map[item.name])
          map[item.name] = { name: item.name, qty: 0, revenue: 0 };
        map[item.name].qty += item.quantity;
        if (o.paymentStatus === "Paid") {
          map[item.name].revenue += item.quantity * item.unitPrice;
        }
      });
    });
    return Object.values(map).sort((a, b) =>
      sortBy === "revenue" ? b.revenue - a.revenue : b.qty - a.qty,
    );
  }, [orders, sortBy]);

  const maxItemValue =
    itemStats[0]?.[sortBy === "revenue" ? "revenue" : "qty"] || 1;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {/* ── Sort toggle — inline styles only, no dynamic className ── */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
          borderRadius: 12,
          padding: 4,
          marginBottom: 20,
        }}
      >
        {(["revenue", "qty"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSortBy(s)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor:
                sortBy === s ? (isDark ? "#374151" : "#ffffff") : "transparent",
              shadowColor: sortBy === s ? "#000" : "transparent",
              shadowOpacity: sortBy === s ? 0.08 : 0,
              shadowRadius: 2,
              elevation: sortBy === s ? 1 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color:
                  sortBy === s
                    ? isDark
                      ? "#60A5FA"
                      : "#2563EB"
                    : isDark
                      ? "#6B7280"
                      : "#9CA3AF",
              }}
            >
              {s === "revenue" ? "By Revenue" : "By Qty Sold"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title="Top Selling Items"
          subtitle={
            sortBy === "revenue" ? "Ranked by revenue" : "Ranked by qty sold"
          }
        />
        {itemStats.length === 0 && (
          <Text className="text-gray-400 text-sm">No sales data yet.</Text>
        )}
        {itemStats.slice(0, 10).map((item, i) => (
          <RankRow
            key={item.name}
            rank={i + 1}
            name={item.name}
            value={
              sortBy === "revenue" ? fmtShort(item.revenue) : `×${item.qty}`
            }
            sub={sortBy === "revenue" ? `×${item.qty} sold` : fmt(item.revenue)}
            pct={
              (item[sortBy === "revenue" ? "revenue" : "qty"] / maxItemValue) *
              100
            }
            color={
              i === 0
                ? "#F59E0B"
                : i === 1
                  ? "#94A3B8"
                  : i === 2
                    ? "#B45309"
                    : "#2563EB"
            }
            isDark={isDark}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function OrdersTab({ orders, isDark }: { orders: Order[]; isDark: boolean }) {
  const byHour = useMemo(() => {
    const slots = [
      { label: "8–10", hours: [8, 9] },
      { label: "10–12", hours: [10, 11] },
      { label: "12–14", hours: [12, 13] },
      { label: "14–16", hours: [14, 15] },
      { label: "16–18", hours: [16, 17] },
      { label: "18–20", hours: [18, 19] },
    ];
    return slots.map((slot) => ({
      label: slot.label,
      value: orders.filter((o) =>
        slot.hours.includes(new Date(o.createdAt).getHours()),
      ).length,
    }));
  }, [orders]);

  const totalDiscounts = orders.reduce((s, o) => s + (o.discount || 0), 0);
  const totalServiceCharge = orders.reduce(
    (s, o) => s + (o.serviceCharge || 0),
    0,
  );
  const totalTax = orders.reduce((s, o) => s + o.tax, 0);

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);

  const statusStyles: Record<
    Order["orderStatus"],
    { bg: string; text: string }
  > = {
    Done: {
      bg: isDark ? "rgba(21,128,61,0.2)" : "#F0FDF4",
      text: isDark ? "#4ADE80" : "#15803D",
    },
    Served: {
      bg: isDark ? "rgba(37,99,235,0.2)" : "#EFF6FF",
      text: isDark ? "#60A5FA" : "#1D4ED8",
    },
    Preparing: {
      bg: isDark ? "rgba(180,83,9,0.2)" : "#FFFBEB",
      text: isDark ? "#FCD34D" : "#B45309",
    },
    Cancelled: {
      bg: isDark ? "rgba(220,38,38,0.2)" : "#FEF2F2",
      text: isDark ? "#F87171" : "#DC2626",
    },
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title="Orders by Time of Day"
          subtitle="Peak service hours"
        />
        <BarChart data={byHour} isDark={isDark} color="#D97706" />
      </View>

      <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
        <SectionHeader title="Financial Breakdown" />
        {[
          {
            label: "Tax Collected",
            value: totalTax,
            icon: "document-text-outline",
            color: "#2563EB",
          },
          {
            label: "Service Charges",
            value: totalServiceCharge,
            icon: "briefcase-outline",
            color: "#7C3AED",
          },
          {
            label: "Total Discounts",
            value: totalDiscounts,
            icon: "pricetag-outline",
            color: "#DC2626",
          },
        ].map((row) => (
          <View
            key={row.label}
            className="flex-row items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 items-center justify-center">
                <Ionicons name={row.icon as any} size={18} color={row.color} />
              </View>
              <Text className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                {row.label}
              </Text>
            </View>
            <Text className="font-bold text-gray-900 dark:text-white text-sm">
              {fmt(row.value)}
            </Text>
          </View>
        ))}
      </View>

      <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
        <SectionHeader title="Recent Orders" subtitle="Latest 8 transactions" />
        {recentOrders.length === 0 && (
          <Text className="text-gray-400 text-sm">No orders yet.</Text>
        )}
        {recentOrders.map((o) => (
          <View
            key={o.id}
            className="flex-row items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-800"
          >
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-gray-900 dark:text-white font-bold text-sm">
                  {o.id}
                </Text>
                {/* ── Status badge — inline style, no dynamic className ── */}
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: statusStyles[o.orderStatus].bg,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: statusStyles[o.orderStatus].text,
                    }}
                  >
                    {o.orderStatus}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                {o.orderType === "dine-in"
                  ? `🍽 ${o.tableNumber ?? ""}`
                  : o.orderType === "takeout"
                    ? "🥡 Takeout"
                    : "🛵 Delivery"}{" "}
                · {o.paymentMethod}
              </Text>
            </View>
            <View className="items-end">
              <Text className="font-bold text-gray-900 dark:text-white text-sm">
                {fmt(o.total)}
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-[11px]">
                {new Date(o.createdAt).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "overview" | "products" | "orders";
type Period = "today" | "yesterday" | "week" | "all";

export default function AnalyticsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("all");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const dbRows = await ordersRepo.getAll();
      const uiOrders: Order[] = await Promise.all(
        dbRows.map(async (dbOrder) => {
          const dbItems = await ordersRepo.items.getByOrder(dbOrder.id);
          return dbOrderToUi(dbOrder, dbItems);
        }),
      );
      setAllOrders(uiOrders);
    } catch (e) {
      console.error("[Analytics] load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const today = todayStr();
    const yesterday = daysAgoStr(1);
    const weekStart = daysAgoStr(6);

    return allOrders.filter((o) => {
      const d = toDateStr(o.createdAt);
      if (period === "today") return d === today;
      if (period === "yesterday") return d === yesterday;
      if (period === "week") return d >= weekStart && d <= today;
      return true;
    });
  }, [allOrders, period]);

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This Week" },
    { key: "all", label: "All Time" },
  ];

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: "grid-outline" },
    { key: "products", label: "Products", icon: "fast-food-outline" },
    { key: "orders", label: "Orders", icon: "receipt-outline" },
  ];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-800">
      {/* ── Header ── */}
      <View className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-5 pt-6 pb-0">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-gray-900 dark:text-white font-black text-2xl">
              Analytics
            </Text>
            <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
              {loading
                ? "Loading…"
                : `${filteredOrders.length} orders · ${periods.find((p) => p.key === period)?.label}`}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={loadOrders}
              className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 items-center justify-center"
            >
              <Ionicons
                name="refresh-outline"
                size={20}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </Pressable>
            <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center">
              <MaterialCommunityIcons
                name="chart-bar"
                size={22}
                color="#2563EB"
              />
            </View>
          </View>
        </View>

        {/* Period selector — inline styles to avoid dynamic className crash */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16, marginHorizontal: -4 }}
        >
          {periods.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={{
                marginRight: 8,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                backgroundColor:
                  period === p.key ? "#2563EB" : isDark ? "#1F2937" : "#ffffff",
                borderColor:
                  period === p.key ? "#2563EB" : isDark ? "#374151" : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color:
                    period === p.key
                      ? "#ffffff"
                      : isDark
                        ? "#D1D5DB"
                        : "#4B5563",
                }}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Tab bar — inline styles for active indicator */}
        <View style={{ flexDirection: "row" }}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingBottom: 12,
                borderBottomWidth: 2,
                borderBottomColor:
                  activeTab === tab.key ? "#2563EB" : "transparent",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={
                    activeTab === tab.key
                      ? "#2563EB"
                      : isDark
                        ? "#6B7280"
                        : "#9CA3AF"
                  }
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color:
                      activeTab === tab.key
                        ? isDark
                          ? "#60A5FA"
                          : "#2563EB"
                        : isDark
                          ? "#6B7280"
                          : "#9CA3AF",
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Loading ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isDark ? "#60A5FA" : "#2563EB"}
          />
          <Text className="mt-3 text-sm text-gray-400">Loading analytics…</Text>
        </View>
      ) : (
        <>
          {activeTab === "overview" && (
            <OverviewTab orders={filteredOrders} isDark={isDark} />
          )}
          {activeTab === "products" && (
            <ProductsTab orders={filteredOrders} isDark={isDark} />
          )}
          {activeTab === "orders" && (
            <OrdersTab orders={filteredOrders} isDark={isDark} />
          )}
        </>
      )}
    </View>
  );
}
