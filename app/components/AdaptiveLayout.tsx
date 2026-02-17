import React from "react";
import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useRouter } from "expo-router";
import { useSidebar, SidebarProvider } from "../context/SidebarContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { ThemeToggle } from "./ThemeToggle";

export const AdaptiveLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};

const LayoutContent = ({ children }: { children: React.ReactNode }) => {
  const device = useBreakpoint();
  const { isOpen, closeSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-row flex-1">
        {/* TABLET/DESKTOP PERMANENT SIDEBAR */}
        {device !== "mobile" && (
          <View className="w-64 p-4 pt-10 border-r border-gray-100 dark:border-gray-800">
            <NavItems closeSidebar={() => {}} />
          </View>
        )}

        {/* MAIN CONTENT AREA */}
        <View className="flex-1">{children}</View>
      </View>

      {/* MOBILE DRAWER OVERLAY */}
      {device === "mobile" && isOpen && (
        <>
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={closeSidebar} 
            className="absolute inset-0 z-40 bg-black/50" 
          />
          <View 
            style={{ paddingTop: insets.top }}
            className="absolute top-0 bottom-0 left-0 z-50 p-4 bg-white shadow-2xl w-72 dark:bg-gray-900"
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold dark:text-white">POS Menu</Text>
              <TouchableOpacity onPress={closeSidebar}><Ionicons name="close" size={28} color={isDark ? "white" : "black"} /></TouchableOpacity>
            </View>
            <NavItems closeSidebar={closeSidebar} />
          </View>
        </>
      )}
    </View>
  );
};

const NavItems = ({ closeSidebar }: { closeSidebar: () => void }) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "white" : "black";

  const navigate = (path: any) => {
    router.push(path);
    closeSidebar();
  };

  return (
    <View className="justify-between flex-1">
      <View>
        <SidebarBtn icon="cart-outline" label="Products" onPress={() => navigate("/pages/ProductScreen")} />
        <SidebarBtn icon="time-outline" label="History" onPress={() => navigate("/pages/OrderHistoryScreen")} />
        <SidebarBtn icon="chart-bar" label="Analytics" isMCI onPress={() => navigate("/pages/AnalyticsScreen")} />
      </View>
      <View className="pt-4 pb-4 border-t border-gray-100 dark:border-gray-800">
        <ThemeToggle />
      </View>
    </View>
  );
};

const SidebarBtn = ({ icon, label, onPress, isMCI = false }: any) => (
  <Pressable onPress={onPress} className="flex-row items-center p-4 mb-2 rounded-2xl bg-gray-50 dark:bg-gray-800 active:bg-gray-100">
    {isMCI ? <MaterialCommunityIcons name={icon} size={22} color="green" /> : <Ionicons name={icon} size={22} color="green" />}
    <Text className="ml-3 font-semibold dark:text-white">{label}</Text>
  </Pressable>
);