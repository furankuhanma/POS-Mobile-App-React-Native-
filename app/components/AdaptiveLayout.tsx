import React from "react";
import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useRouter } from "expo-router";
import { useSidebar, SidebarProvider } from "../context/SidebarContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { ThemeToggle } from "./ThemeToggle";

export const AdaptiveLayout = ({ children }: LayoutProps) => {
  const device = useBreakpoint();

  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};

const MobileLayout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

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
          {/* Sidebar Header with Logo and Close Button */}
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
              onPress={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
            >
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#e5e7eb" : "#1f2937"}
              />
            </Pressable>
          </View>

          {/* Sidebar Content */}
          <View className="flex-1 px-3 pt-6">
            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => {
                router.push("/pages/CashierScreen");
                setIsSidebarOpen(false);
              }}
            >
              <Ionicons
                name="cart-outline"
                size={22}
                color={iconColor}
                className="mr-3"
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Cashier
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => {
                router.push("/pages/OrderHistoryScreen");
                setIsSidebarOpen(false);
              }}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color={iconColor}
                className="mr-3"
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Order History
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => {
                router.push("/pages/AnalyticsScreen");
                setIsSidebarOpen(false);
              }}
            >
              <MaterialCommunityIcons
                name="chart-bar"
                size={22}
                color={iconColor}
                className="mr-3"
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Analytics
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
                className="mr-3"
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                {isDark ? "Dark Mode" : "Light Mode"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                router.push("/pages/SettingsScreen");
                setIsSidebarOpen(false);
              }}
              className="flex-row items-center px-3 py-3 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
            >
              <Ionicons
                name="settings-outline"
                size={22}
                color={iconColor}
                className="mr-3"
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Settings
              </Text>
            </Pressable>

            <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
              <Pressable
                onPress={() => {
                  router.push("/pages/AccountScreen");
                  setIsSidebarOpen(false);
                }}
                className="flex-row items-center px-3 py-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
              >
                <View className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 items-center justify-center mr-3">
                  <Text className="text-white font-semibold text-base">JD</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold text-sm">
                    John Doe
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs">
                    john@example.com
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDark ? "#9ca3af" : "#6b7280"}
                />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const NavItems = ({ closeSidebar }: { closeSidebar: () => void }) => {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#fff" : "#111";
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-1 flex-row">
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
              onPress={() => router.push("/pages/CashierScreen")}
            >
              <Ionicons
                name="cart-outline"
                size={22}
                color={iconColor}
                className="mr-3"
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
                className="mr-3"
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
                className="mr-3"
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Analytics
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="pt-3">
          <Pressable
            onPress={toggleColorScheme}
            className="flex-row items-center px-3 py-3 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
          >
            <Ionicons
              name={isDark ? "moon" : "sunny"}
              size={22}
              color={isDark ? "#F59E0B" : "#6366F1"}
              className="mr-3"
            />
            <Text className="text-gray-900 dark:text-white font-medium text-base">
              {isDark ? "Dark Mode" : "Light Mode"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/pages/SettingsScreen")}
            className="flex-row items-center px-3 py-3 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={iconColor}
              className="mr-3"
            />
            <Text className="text-gray-900 dark:text-white font-medium text-base">
              Settings
            </Text>
          </Pressable>

          <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <Pressable
              onPress={() => router.push("/pages/AccountScreen")}
              className="flex-row items-center px-3 py-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
            >
              <View className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 items-center justify-center mr-3">
                <Text className="text-white font-semibold text-base">JD</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-semibold text-sm">
                  John Doe
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 text-xs">
                  john@example.com
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isDark ? "#9ca3af" : "#6b7280"}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View className="flex-1 bg-gray-50 dark:bg-gray-800">{children}</View>
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
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => router.push("/pages/CashierScreen")}
            >
              <Ionicons
                name="cart-outline"
                size={22}
                color={iconColor}
                className="mr-3"
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Cashier
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => router.push("/pages/OrderHistoryScreen")}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color={iconColor}
                className="mr-3"
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Order History
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
              onPress={() => router.push("/pages/AnalyticsScreen")}
            >
              <MaterialCommunityIcons
                name="chart-bar"
                size={22}
                color={iconColor}
                className="mr-3"
              />
              <Text className="text-gray-900 dark:text-white font-medium text-base">
                Analytics
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="pt-3">
          <Pressable
            onPress={toggleColorScheme}
            className="flex-row items-center px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <Ionicons
              name={isDark ? "moon" : "sunny"}
              size={22}
              color={isDark ? "#F59E0B" : "#6366F1"}
              className="mr-3"
            />
            <Text className="text-gray-900 dark:text-white font-medium text-base">
              {isDark ? "Dark Mode" : "Light Mode"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/pages/SettingsScreen")}
            className="flex-row items-center px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={iconColor}
              className="mr-3"
            />
            <Text className="text-gray-900 dark:text-white font-medium text-base">
              Settings
            </Text>
          </Pressable>

          <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <Pressable
              onPress={() => router.push("/pages/AccountScreen")}
              className="flex-row items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
            >
              <View className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 items-center justify-center mr-3">
                <Text className="text-white font-semibold text-base">JD</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-semibold text-sm">
                  John Doe
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 text-xs">
                  john@example.com
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isDark ? "#9ca3af" : "#6b7280"}
              />
            </Pressable>
          </View>
        </View>
      </View>
      <View className="pt-4 pb-4 border-t border-gray-100 dark:border-gray-800">
        <ThemeToggle />
      </View>
    </View>
  );
};

const SidebarBtn = ({ icon, label, onPress, isMCI = false }: any) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center p-4 mb-2 rounded-2xl bg-gray-50 dark:bg-gray-800 active:bg-gray-100"
  >
    {isMCI ? (
      <MaterialCommunityIcons name={icon} size={22} color="green" />
    ) : (
      <Ionicons name={icon} size={22} color="green" />
    )}
    <Text className="ml-3 font-semibold dark:text-white">{label}</Text>
  </Pressable>
);
