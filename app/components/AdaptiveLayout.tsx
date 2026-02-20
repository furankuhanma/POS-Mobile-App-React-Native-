import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { useBreakpoint } from "../hooks/useBreakpoint";

interface LayoutProps {
  children: React.ReactNode;
}

export const AdaptiveLayout = ({ children }: LayoutProps) => {
  const device = useBreakpoint();

  return (
    <SidebarProvider>
      <LayoutContent device={device}>{children}</LayoutContent>
    </SidebarProvider>
  );
};

const LayoutContent = ({
  children,
  device,
}: LayoutProps & { device: string }) => {
  if (device === "mobile") {
    return <MobileLayout>{children}</MobileLayout>;
  }
  return <DesktopLayout>{children}</DesktopLayout>;
};

const MobileLayout = ({ children }: LayoutProps) => {
  // ✅ Use SidebarContext so pages can call openSidebar() to open it
  const { isOpen, openSidebar, closeSidebar } = useSidebar();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const iconColor = isDark ? "#e5e7eb" : "#1f2937";

  return (
    <View className="flex-1">
      {/* Content wrapper — padded top (header) AND bottom (system nav bar) */}
      <View
        className="flex-1"
        style={{
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom,
        }}
      >
        {children}
      </View>

      {/* Fixed Top Header with Hamburger */}
      <View
        className="absolute top-0 left-0 right-0 z-50"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 py-3 bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800">
          <Pressable
            onPress={openSidebar}
            className="p-2 rounded-lg bg-white dark:bg-gray-900 active:bg-gray-200 dark:active:bg-gray-700"
          >
            <Ionicons
              name="menu"
              size={24}
              color={isDark ? "#e5e7eb" : "#1f2937"}
            />
          </Pressable>

          <View className="flex-row items-center">
            <View className="w-7 h-7 rounded-lg bg-blue-600 dark:bg-blue-500 items-center justify-center mr-2">
              <Ionicons name="storefront" size={16} color="#fff" />
            </View>
            <Text className="text-gray-900 dark:text-white font-bold text-lg">
              POS
            </Text>
          </View>

          <Pressable
            onPress={toggleColorScheme}
            className="p-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
          >
            <Ionicons
              name={isDark ? "moon" : "sunny"}
              size={20}
              color={isDark ? "#F59E0B" : "#6366F1"}
            />
          </Pressable>
        </View>
      </View>

      {/* Overlay */}
      {isOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={closeSidebar}
          className="absolute inset-0 bg-black/50 z-40"
        />
      )}

      {/* Sidebar Drawer */}
      {isOpen && (
        <View
          className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 z-50 shadow-2xl border-r border-gray-200 dark:border-gray-800"
          style={{ paddingTop: insets.top }}
        >
          {/* Sidebar Header */}
          <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200 dark:border-gray-800">
            <View className="flex-row items-center flex-1">
              <View className="w-9 h-9 rounded-lg bg-blue-600 dark:bg-blue-500 items-center justify-center mr-3">
                <Ionicons name="storefront" size={20} color="#fff" />
              </View>
              <Text className="text-gray-900 dark:text-white font-bold text-xl">
                POS
              </Text>
            </View>
            <Pressable
              onPress={closeSidebar}
              className="p-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
            >
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#e5e7eb" : "#1f2937"}
              />
            </Pressable>
          </View>

          {/* Sidebar Nav Links */}
          <View className="flex-1 px-3 pt-6">
            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => {
                router.push("/pages/ProductScreen");
                closeSidebar();
              }}
            >
              <Ionicons
                name="cart-outline"
                size={22}
                color={iconColor}
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Cashier
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => {
                router.push("/pages/OrderHistoryScreen");
                closeSidebar();
              }}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color={iconColor}
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Order History
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => {
                router.push("/pages/AnalyticsScreen");
                closeSidebar();
              }}
            >
              <MaterialCommunityIcons
                name="chart-bar"
                size={22}
                color={iconColor}
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Analytics
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => {
                router.push("/pages/InventoryScreen");
                closeSidebar();
              }}
            >
              <Ionicons
                name="cube-outline"
                size={22}
                color={iconColor}
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Inventory
              </Text>
            </Pressable>
          </View>

          {/* Sidebar Footer */}
          <View
            className="px-3"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Pressable
              onPress={toggleColorScheme}
              className="flex-row items-center px-3 py-3 mt-3 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
            >
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={22}
                color={isDark ? "#F59E0B" : "#6366F1"}
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                {isDark ? "Dark Mode" : "Light Mode"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const DesktopLayout = ({ children }: LayoutProps) => {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#fff" : "#111";
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-1 flex-row">
      {/* Persistent sidebar for desktop */}
      <View className="w-64 bg-white dark:bg-gray-900 h-full px-3 py-4 justify-between border-r border-gray-200 dark:border-gray-800">
        <View>
          <View className="px-3 pb-4 mb-4 border-b border-gray-300 dark:border-gray-700">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-lg bg-blue-600 dark:bg-blue-500 items-center justify-center mr-3">
                <Ionicons name="storefront" size={20} color="#fff" />
              </View>
              <Text className="text-gray-900 dark:text-white font-bold text-xl">
                POS
              </Text>
            </View>
          </View>

          <View className="flex-1">
            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => router.push("/pages/ProductScreen")}
            >
              <Ionicons
                name="cart-outline"
                size={22}
                color={iconColor}
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Cashier
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => router.push("/pages/OrderHistoryScreen")}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color={iconColor}
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Order History
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => router.push("/pages/AnalyticsScreen")}
            >
              <MaterialCommunityIcons
                name="chart-bar"
                size={22}
                color={iconColor}
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Analytics
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => router.push("/pages/InventoryScreen")}
            >
              <Ionicons
                name="cube-outline"
                size={22}
                color={iconColor}
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Inventory
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Desktop Footer */}
        <View className="px-3">
          <Pressable
            onPress={toggleColorScheme}
            className="flex-row items-center px-3 py-3 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
          >
            <Ionicons
              name={isDark ? "moon" : "sunny"}
              size={22}
              color={isDark ? "#F59E0B" : "#6366F1"}
              style={{ marginRight: 12 }}
            />
            <Text className="text-gray-900 dark:text-white font-medium text-base">
              {isDark ? "Dark Mode" : "Light Mode"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Page content */}
      <View className="flex-1">{children}</View>
    </View>
  );
};