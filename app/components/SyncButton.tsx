// =============================================================================
// app/components/SyncStatusButton.tsx
// =============================================================================
// A sidebar button that:
//   • Shows the current sync status with a colour-coded animated indicator
//   • Displays a badge with the number of unsynced records
//   • Triggers an immediate sync when tapped
//   • Spins the icon while syncing
//   • Matches your existing NativeWind dark/light theme
//
// Usage — drop into your sidebar wherever you place nav items:
//
//   import { SyncStatusButton } from '../components/SyncStatusButton';
//   <SyncStatusButton />
// =============================================================================

import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useSyncStatus } from "../hooks/useSyncStatus";
import type { SyncStatus } from "../types/types";

// ─── Status config ────────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  dotColor: string; // Tailwind bg class
  textColor: string; // Tailwind text class
  icon: keyof typeof Ionicons.glyphMap;
  pulse: boolean;
}

const STATUS_CONFIG: Record<SyncStatus, StatusConfig> = {
  idle: {
    label: "Idle",
    dotColor: "bg-gray-400",
    textColor: "text-gray-400 dark:text-gray-500",
    icon: "cloud-outline",
    pulse: false,
  },
  pending: {
    label: "Pending",
    dotColor: "bg-amber-400",
    textColor: "text-amber-500 dark:text-amber-400",
    icon: "cloud-upload-outline",
    pulse: true,
  },
  syncing: {
    label: "Syncing…",
    dotColor: "bg-blue-500",
    textColor: "text-blue-500 dark:text-blue-400",
    icon: "sync-outline",
    pulse: false, // icon spins instead
  },
  error: {
    label: "Sync Error",
    dotColor: "bg-red-500",
    textColor: "text-red-500 dark:text-red-400",
    icon: "cloud-offline-outline",
    pulse: true,
  },
  offline: {
    label: "Offline",
    dotColor: "bg-gray-400",
    textColor: "text-gray-400 dark:text-gray-500",
    icon: "wifi-outline",
    pulse: false,
  },
  "up-to-date": {
    label: "Up to date",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-500 dark:text-emerald-400",
    icon: "checkmark-circle-outline",
    pulse: false,
  },
};

// =============================================================================
// Component
// =============================================================================

export function SyncStatusButton() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { status, pendingCount, isSyncing, syncNow } = useSyncStatus();
  const config = STATUS_CONFIG[status];

  // ── Spin animation for the sync icon ────────────────────────────────────────
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isSyncing) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      );
      spinLoop.current.start();
    } else {
      spinLoop.current?.stop();
      spinAnim.setValue(0);
    }
    return () => spinLoop.current?.stop();
  }, [isSyncing, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // ── Pulse animation for the status dot ──────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (config.pulse) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [config.pulse, pulseAnim]);

  // ── Icon colour ──────────────────────────────────────────────────────────────
  const iconColorMap: Record<SyncStatus, string> = {
    idle: isDark ? "#6B7280" : "#9CA3AF",
    pending: isDark ? "#FBBF24" : "#F59E0B",
    syncing: isDark ? "#60A5FA" : "#3B82F6",
    error: isDark ? "#F87171" : "#EF4444",
    offline: isDark ? "#6B7280" : "#9CA3AF",
    "up-to-date": isDark ? "#34D399" : "#10B981",
  };
  const iconColor = iconColorMap[status];

  // ── Dot colour (raw hex for Animated.View) ───────────────────────────────────
  const dotColorMap: Record<SyncStatus, string> = {
    idle: "#9CA3AF",
    pending: "#FBBF24",
    syncing: "#3B82F6",
    error: "#EF4444",
    offline: "#9CA3AF",
    "up-to-date": "#10B981",
  };

  return (
    <View className="px-3 py-2">
      {/* ── Divider ── */}
      <View className="h-px bg-gray-200 dark:bg-gray-700/60 mb-3" />

      {/* ── Main button ── */}
      <Pressable
        onPress={syncNow}
        disabled={isSyncing || status === "offline"}
        android_ripple={{
          color: isDark ? "#ffffff18" : "#00000010",
          borderless: false,
        }}
        className={`
          flex-row items-center gap-3 px-3 py-3 rounded-xl
          ${
            isSyncing
              ? "bg-blue-50 dark:bg-blue-950/40"
              : "active:bg-gray-100 dark:active:bg-gray-800/60"
          }
        `}
      >
        {/* Cloud / sync icon (spins while syncing) */}
        <Animated.View
          style={isSyncing ? { transform: [{ rotate: spin }] } : undefined}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Ionicons name={config.icon} size={22} color={iconColor} />
          )}
        </Animated.View>

        {/* Labels */}
        <View className="flex-1 min-w-0">
          <Text
            className="text-gray-900 dark:text-white font-semibold text-sm"
            numberOfLines={1}
          >
            {isSyncing ? "Syncing…" : "Sync Now"}
          </Text>
          <Text
            className={`text-xs font-medium mt-0.5 ${config.textColor}`}
            numberOfLines={1}
          >
            {config.label}
          </Text>
        </View>

        {/* Right side: badge OR status dot */}
        <View className="items-end gap-1">
          {/* Pending count badge */}
          {pendingCount > 0 && !isSyncing && (
            <View className="bg-amber-500 rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center">
              <Text className="text-white text-[10px] font-bold">
                {pendingCount > 99 ? "99+" : pendingCount}
              </Text>
            </View>
          )}

          {/* Animated status dot */}
          <Animated.View
            style={{
              opacity: pulseAnim,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: dotColorMap[status],
            }}
          />
        </View>
      </Pressable>

      {/* ── Error detail row ── */}
      {status === "error" && (
        <View className="flex-row items-center gap-2 px-3 pt-1 pb-1">
          <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
          <Text
            className="text-red-500 dark:text-red-400 text-xs flex-1"
            numberOfLines={2}
          >
            Last sync failed. Tap to retry.
          </Text>
        </View>
      )}

      {/* ── Offline notice ── */}
      {status === "offline" && (
        <View className="flex-row items-center gap-2 px-3 pt-1 pb-1">
          <Ionicons
            name="wifi-outline"
            size={13}
            color={isDark ? "#6B7280" : "#9CA3AF"}
          />
          <Text
            className="text-gray-400 dark:text-gray-500 text-xs flex-1"
            numberOfLines={1}
          >
            No connection to server
          </Text>
        </View>
      )}

      {/* ── Pending detail row ── */}
      {(status === "pending" || status === "up-to-date") &&
        pendingCount > 0 && (
          <View className="flex-row items-center gap-2 px-3 pt-1 pb-1">
            <Ionicons
              name="time-outline"
              size={13}
              color={isDark ? "#FBBF24" : "#F59E0B"}
            />
            <Text
              className="text-amber-500 dark:text-amber-400 text-xs flex-1"
              numberOfLines={1}
            >
              {pendingCount} record{pendingCount !== 1 ? "s" : ""} waiting to
              sync
            </Text>
          </View>
        )}
    </View>
  );
}
