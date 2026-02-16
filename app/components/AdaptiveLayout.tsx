import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import { Pressable, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { ThemeToggle } from "./ThemeToggle";

interface LayoutProps {
  children: React.ReactNode;
}

export const AdaptiveLayout = ({ children }: LayoutProps) => {
  const device = useBreakpoint();

  // Common wrapper for all layouts (e.g., background color)
  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {device === "mobile" && <MobileLayout>{children}</MobileLayout>}
      {device === "tablet" && <TabletLayout>{children}</TabletLayout>}
      {device === "desktop" && <DesktopLayout>{children}</DesktopLayout>}
    </View>
  );
};

// Simple Platform Shells
const MobileLayout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      {/* Content wrapper with padding to avoid hamburger overlap */}
      <View className="flex-1" style={{ paddingTop: insets.top + 60 }}>
        {children}
      </View>

      {/* Hamburger Button - Fixed at top with safe area */}
      <View
        className="absolute top-0 left-0 right-0 z-50"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 py-3 bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800">
          <Pressable
            onPress={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg bg-white dark:bg-gray-900 active:bg-gray-200 dark:active:bg-gray-700"
          >
            <Ionicons
              name="menu"
              size={24}
              color={isDark ? "#e5e7eb" : "#1f2937"}
            />
          </Pressable>

          {/* Spacer for future items like title or actions */}
          <View className="flex-1" />
        </View>
      </View>

      {/* Overlay */}
      {isSidebarOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsSidebarOpen(false)}
          className="absolute inset-0 bg-black/50 z-40"
        />
      )}

      {/* Sidebar */}
      {isSidebarOpen && (
        <View
          className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 z-50 shadow-2xl border-r border-gray-200 dark:border-gray-800"
          style={{ paddingTop: insets.top }}
        >
          {/* Sidebar Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
            <View>{/* You can add a logo or title here */}</View>
            <Pressable
              onPress={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg bg-white dark:bg-gray-900 active:bg-gray-200 dark:active:bg-gray-700"
            >
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#e5e7eb" : "#1f2937"}
              />
            </Pressable>
          </View>

          {/* Sidebar Content */}
          <View className="flex-1 p-4">
            {/* Add your navigation items here */}
          </View>

          {/* Sidebar Footer with Theme Toggle */}
          <View className="p-4 border-t border-gray-200 dark:border-gray-800">
            <ThemeToggle />
          </View>
        </View>
      )}
    </View>
  );
};

const TabletLayout = ({ children }: LayoutProps) => (
  <View className="flex-1 flex-row">
    {/* Sidebar placeholder for later */}
    <View className="w-64 bg-gray-300 dark:bg-gray-900 h-full justify-between">
      <View className="flex-1" />
      <View className="p-2 border-t border-gray-200 dark:border-gray-800">
        <ThemeToggle />
      </View>
    </View>
    <View className="flex-1 bg-gray-800">{children}</View>
  </View>
);

const DesktopLayout = ({ children }: LayoutProps) => (
  <View className="flex-1 flex-row">
    {/* Wider Sidebar for Desktop */}
    <View className="w-64 bg-gray-300 dark:bg-gray-900 h-full p-4 justify-between">
      <View className="flex-1">{/* Navigation items will go here */}</View>
      <View className="border-t border-gray-200 dark:border-gray-800 pt-4">
        <ThemeToggle />
      </View>
    </View>
    <View className="flex-1 max-w-7xl mx-auto w-full bg-gray-800">
      {children}
    </View>
  </View>
);
