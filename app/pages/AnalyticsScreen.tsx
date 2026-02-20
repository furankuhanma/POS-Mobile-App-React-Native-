import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useSidebar } from "../context/SidebarContext";
import { useColorScheme } from "nativewind";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "Today" | "This Week" | "This Month" | "This Year";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const STATS: Record<
  Period,
  {
    revenue: number;
    orders: number;
    avgOrder: number;
    topItem: string;
    revenueChange: number;
    ordersChange: number;
  }
> = {
  Today: {
    revenue: 12388.8,
    orders: 8,
    avgOrder: 1548.6,
    topItem: "Wagyu Burger",
    revenueChange: 12.4,
    ordersChange: 6.7,
  },
  "This Week": {
    revenue: 87320.5,
    orders: 54,
    avgOrder: 1617.05,
    topItem: "Grilled Salmon",
    revenueChange: 8.1,
    ordersChange: -2.3,
  },
  "This Month": {
    revenue: 340850.0,
    orders: 212,
    avgOrder: 1607.78,
    topItem: "Pasta Carbonara",
    revenueChange: 15.6,
    ordersChange: 11.2,
  },
  "This Year": {
    revenue: 3820400.0,
    orders: 2341,
    avgOrder: 1631.95,
    topItem: "Wagyu Burger",
    revenueChange: 22.3,
    ordersChange: 18.9,
  },
};

const TOP_ITEMS = [
  { name: "Wagyu Burger", sold: 142, revenue: 96560, pct: 100 },
  { name: "Grilled Salmon", sold: 118, revenue: 105020, pct: 83 },
  { name: "Pasta Carbonara", sold: 97, revenue: 40740, pct: 68 },
  { name: "Beef Steak Platter", sold: 84, revenue: 79800, pct: 59 },
  { name: "Seafood Marinara", sold: 71, revenue: 22720, pct: 50 },
];

const PAYMENT_BREAKDOWN = [
  { method: "Card", pct: 42, color: "#009245" },
  { method: "Cash", pct: 35, color: "#34D399" },
  { method: "E-wallet", pct: 23, color: "#6EE7B7" },
];

const ORDER_TYPE_BREAKDOWN = [
  { type: "Dine-in", pct: 68, color: "#009245" },
  { type: "Takeout", pct: 32, color: "#86EFAC" },
];

const HOURLY_BARS = [
  { hour: "8am", val: 20 },
  { hour: "9am", val: 45 },
  { hour: "10am", val: 35 },
  { hour: "11am", val: 60 },
  { hour: "12pm", val: 100 },
  { hour: "1pm", val: 88 },
  { hour: "2pm", val: 72 },
  { hour: "3pm", val: 55 },
  { hour: "4pm", val: 40 },
  { hour: "5pm", val: 65 },
  { hour: "6pm", val: 90 },
  { hour: "7pm", val: 78 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
      ? `₱${(n / 1_000).toFixed(1)}k`
      : `₱${n.toFixed(2)}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  change,
  isDark,
  accent = false,
}: {
  icon: string;
  label: string;
  value: string;
  change: number;
  isDark: boolean;
  accent?: boolean;
}) {
  const positive = change >= 0;
  return (
    <View
      className={`flex-1 rounded-2xl p-4 ${accent ? "bg-[#009245]" : "bg-white dark:bg-gray-800"} shadow-sm`}
      style={{ minWidth: 140 }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View
          className={`w-9 h-9 rounded-xl items-center justify-center ${accent ? "bg-white/20" : "bg-green-50 dark:bg-green-900/30"}`}
        >
          <MaterialCommunityIcons
            name={icon as any}
            size={18}
            color={accent ? "#fff" : "#009245"}
          />
        </View>
        <View
          className={`flex-row items-center px-2 py-0.5 rounded-full ${positive ? (accent ? "bg-white/20" : "bg-green-50 dark:bg-green-900/40") : "bg-red-50 dark:bg-red-900/30"}`}
        >
          <Ionicons
            name={positive ? "trending-up" : "trending-down"}
            size={10}
            color={positive ? (accent ? "#fff" : "#009245") : "#ef4444"}
          />
          <Text
            className={`text-[10px] font-bold ml-0.5 ${positive ? (accent ? "text-white" : "text-green-700 dark:text-green-400") : "text-red-500"}`}
          >
            {Math.abs(change)}%
          </Text>
        </View>
      </View>
      <Text
        className={`text-xl font-black ${accent ? "text-white" : "text-gray-900 dark:text-white"}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        className={`text-xs mt-0.5 ${accent ? "text-white/70" : "text-gray-400 dark:text-gray-500"}`}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
  return (
    <Text className="px-1 mb-3 text-xs font-bold tracking-widest text-gray-400 uppercase dark:text-gray-500">
      {title}
    </Text>
  );
}

function HourlyChart({ isDark }: { isDark: boolean }) {
  const maxVal = Math.max(...HOURLY_BARS.map((b) => b.val));
  return (
    <View className="p-4 bg-white shadow-sm dark:bg-gray-800 rounded-2xl">
      <Text className="mb-1 text-sm font-bold text-gray-900 dark:text-white">
        Revenue by Hour
      </Text>
      <Text className="mb-4 text-xs text-gray-400 dark:text-gray-500">
        Peak hours highlighted
      </Text>
      <View className="flex-row items-end justify-between" style={{ height: 80 }}>
        {HOURLY_BARS.map((b) => {
          const barHeight = Math.max(4, (b.val / maxVal) * 72);
          const isPeak = b.val >= 85;
          return (
            <View key={b.hour} className="items-center flex-1">
              <View
                style={{ height: barHeight }}
                className={`w-3 rounded-t-md ${isPeak ? "bg-[#009245]" : "bg-green-100 dark:bg-green-900/30"}`}
              />
              <Text className="text-[8px] text-gray-400 dark:text-gray-600 mt-1">
                {b.hour}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function TopItemsCard({ isDark }: { isDark: boolean }) {
  return (
    <View className="p-4 bg-white shadow-sm dark:bg-gray-800 rounded-2xl">
      <Text className="mb-1 text-sm font-bold text-gray-900 dark:text-white">
        Top Selling Items
      </Text>
      <Text className="mb-4 text-xs text-gray-400 dark:text-gray-500">
        By units sold
      </Text>
      {TOP_ITEMS.map((item, i) => (
        <View key={item.name} className="mb-3">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-1">
              <Text className="w-5 text-xs font-black text-gray-300 dark:text-gray-600">
                {i + 1}
              </Text>
              <Text
                className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-200"
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </View>
            <Text className="ml-2 text-xs font-bold text-gray-900 dark:text-white">
              {item.sold} sold
            </Text>
          </View>
          <View className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden ml-5">
            <View
              className="h-full bg-[#009245] rounded-full"
              style={{ width: `${item.pct}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function BreakdownCard({
  title,
  subtitle,
  data,
  isDark,
}: {
  title: string;
  subtitle: string;
  data: { method?: string; type?: string; pct: number; color: string }[];
  isDark: boolean;
}) {
  return (
    <View className="flex-1 p-4 bg-white shadow-sm dark:bg-gray-800 rounded-2xl">
      <Text className="font-bold text-gray-900 dark:text-white text-sm mb-0.5">
        {title}
      </Text>
      <Text className="mb-4 text-xs text-gray-400 dark:text-gray-500">
        {subtitle}
      </Text>
      {/* Stacked bar */}
      <View className="flex-row h-3 mb-4 overflow-hidden rounded-full">
        {data.map((d, i) => (
          <View
            key={i}
            style={{ flex: d.pct, backgroundColor: d.color }}
          />
        ))}
      </View>
      {data.map((d, i) => (
        <View key={i} className="flex-row items-center justify-between mb-1.5">
          <View className="flex-row items-center">
            <View
              className="w-2.5 h-2.5 rounded-full mr-2"
              style={{ backgroundColor: d.color }}
            />
            <Text className="text-xs text-gray-600 dark:text-gray-300">
              {d.method ?? d.type}
            </Text>
          </View>
          <Text className="text-xs font-bold text-gray-900 dark:text-white">
            {d.pct}%
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  // Hide hamburger when screen is wide enough to show sidebar persistently
  const showHamburger = !isLandscape && width < 768;
  const { colorScheme } = useColorScheme();
  const { openSidebar } = useSidebar();
  const isDark = colorScheme === "dark";

  const [period, setPeriod] = useState<Period>("Today");
  const stats = STATS[period];
  const PERIODS: Period[] = ["Today", "This Week", "This Month", "This Year"];

  return (
    <View
      className="flex-1 bg-[#F4F7F4] dark:bg-gray-950"
      style={{ paddingTop: insets.top }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View className="px-5 pt-6 pb-4 bg-white border-b border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            {showHamburger && (
              <TouchableOpacity onPress={openSidebar} className="mr-3">
                <Ionicons
                  name="menu"
                  size={28}
                  color={isDark ? "white" : "black"}
                />
              </TouchableOpacity>
            )}
            <View>
              <Text className="text-2xl font-black text-gray-900 dark:text-white">
                Analytics
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                Business performance overview
              </Text>
            </View>
          </View>
          <View className="items-center justify-center w-9 h-9 bg-green-50 dark:bg-green-900/30 rounded-xl">
            <Ionicons name="bar-chart" size={18} color="#009245" />
          </View>
        </View>

        {/* Period Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              className={`mr-2 px-4 py-2 rounded-xl border ${
                period === p
                  ? "bg-[#009245] border-[#009245]"
                  : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700"
              }`}
            >
              <Text
                className={`text-xs font-bold ${period === p ? "text-white" : "text-gray-500 dark:text-gray-400"}`}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <SectionHeader title="Overview" isDark={isDark} />
        <View className="flex-row gap-3 mb-3">
          <StatCard
            icon="cash-multiple"
            label="Total Revenue"
            value={fmt(stats.revenue)}
            change={stats.revenueChange}
            isDark={isDark}
            accent
          />
          <StatCard
            icon="receipt"
            label="Total Orders"
            value={stats.orders.toString()}
            change={stats.ordersChange}
            isDark={isDark}
          />
        </View>
        <View className="flex-row gap-3 mb-6">
          <StatCard
            icon="calculator"
            label="Avg. Order Value"
            value={fmt(stats.avgOrder)}
            change={stats.revenueChange - 2}
            isDark={isDark}
          />
          <View className="flex-1 p-4 bg-white shadow-sm dark:bg-gray-800 rounded-2xl" style={{ minWidth: 140 }}>
            <View className="items-center justify-center mb-3 w-9 h-9 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <MaterialCommunityIcons name="star" size={18} color="#009245" />
            </View>
            <Text
              className="text-sm font-black text-gray-900 dark:text-white"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {stats.topItem}
            </Text>
            <Text className="text-xs mt-0.5 text-gray-400 dark:text-gray-500">
              Top seller
            </Text>
          </View>
        </View>

        {/* ── Hourly Chart ───────────────────────────────────────────────────── */}
        <SectionHeader title="Activity" isDark={isDark} />
        <View className="mb-3">
          <HourlyChart isDark={isDark} />
        </View>

        {/* ── Breakdown Cards ────────────────────────────────────────────────── */}
        <View className="flex-row gap-3 mb-6">
          <BreakdownCard
            title="Payment"
            subtitle="By method"
            data={PAYMENT_BREAKDOWN}
            isDark={isDark}
          />
          <BreakdownCard
            title="Order Type"
            subtitle="By service"
            data={ORDER_TYPE_BREAKDOWN}
            isDark={isDark}
          />
        </View>

        {/* ── Top Items ──────────────────────────────────────────────────────── */}
        <SectionHeader title="Menu Performance" isDark={isDark} />
        <TopItemsCard isDark={isDark} />
      </ScrollView>
    </View>
  );
}