import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";

// --- Types ---
type Category = { id: number; name: string; count: number; icon: string };
type Product = {
  id: number;
  name: string;
  price: number;
  type: "Veg" | "Non Veg";
  category: string;
  image: string;
};
type CartItem = Product & { quantity: number };

// --- Expanded Mock Data ---
const CATEGORIES: Category[] = [
  { id: 1, name: "All", count: 235, icon: "apps" },
  { id: 2, name: "Breakfast", count: 19, icon: "egg-outline" },
  { id: 3, name: "Soups", count: 6, icon: "bowl-mix-outline" },
  { id: 4, name: "Pasta", count: 14, icon: "noodles" },
  { id: 5, name: "Burgers", count: 13, icon: "hamburger" },
];

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Original Chess Meat Burger With Chips",
    price: 280,
    type: "Non Veg",
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
  },
  {
    id: 2,
    name: "Fresh Orange Juice With Basil Seed",
    price: 120,
    type: "Veg",
    category: "Breakfast",
    image: "https://images.unsplash.com/photo-1547514701-42782101795e?w=400",
  },
  {
    id: 3,
    name: "Meat Sushi Maki With Tuna",
    price: 350,
    type: "Non Veg",
    category: "All",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400",
  },
  {
    id: 4,
    name: "Tacos Salsa With Chickens Grilled",
    price: 220,
    type: "Non Veg",
    category: "All",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
  },
  {
    id: 5,
    name: "Classic Pancakes with Syrup",
    price: 180,
    type: "Veg",
    category: "Breakfast",
    image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400",
  },
  {
    id: 6,
    name: "Mushroom Cream Soup",
    price: 150,
    type: "Veg",
    category: "Soups",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400",
  },
  {
    id: 7,
    name: "Seafood Marinara Pasta",
    price: 320,
    type: "Non Veg",
    category: "Pasta",
    image: "https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?w=400",
  },
  {
    id: 8,
    name: "Double Bacon BBQ Burger",
    price: 310,
    type: "Non Veg",
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400",
  },
  {
    id: 9,
    name: "Tom Yum Goong Soup",
    price: 240,
    type: "Non Veg",
    category: "Soups",
    image: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400",
  },
  {
    id: 10,
    name: "Spaghetti Carbonara",
    price: 290,
    type: "Non Veg",
    category: "Pasta",
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400",
  },
];

export default function ProductsScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isDark = useColorScheme() === "dark";

  // --- Search & Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // --- Cart State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState("Dine in");
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // --- Filtering Logic ---
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesCategory =
        activeCategory === "All" || p.category === activeCategory;
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  // --- Cart Logic ---
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      return existing
        ? prev.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const totals = useMemo(() => {
    const sub = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tax = sub * 0.05;
    return { sub, tax, total: sub + tax };
  }, [cart]);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F4] dark:bg-gray-950">
      <View className={`flex-1 ${isLandscape ? "flex-row" : "flex-col"}`}>
        {/* --- MENU SECTION --- */}
        {!isExpanded && (
          <View className={`${isLandscape ? "flex-[0.65]" : "flex-1"} p-4`}>
            {/* Header + SEARCH BAR */}
            <View className="flex-row items-center mb-6 space-x-3">
              <View className="flex-1 flex-row items-center bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Search Product here..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2 text-base text-gray-900 dark:text-white"
                />
              </View>
              <TouchableOpacity className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <Ionicons
                  name="options-outline"
                  size={24}
                  color={isDark ? "white" : "black"}
                />
              </TouchableOpacity>
            </View>

            {/* CATEGORY SELECTOR */}
            <View className="mb-6 h-15">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setActiveCategory(cat.name)}
                    className={`mr-4 p-4 rounded-3xl w-28 items-center justify-center border shadow-sm ${
                      activeCategory === cat.name
                        ? "bg-[#D1E7D1] border-[#2D6A4F] dark:bg-[#1B4332]"
                        : "bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700"
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={28}
                      color={
                        activeCategory === cat.name ? "#2D6A4F" : "#9CA3AF"
                      }
                    />
                    <Text
                      className={`font-bold mt-2 text-[11px] ${activeCategory === cat.name ? "text-[#2D6A4F] dark:text-green-400" : "text-gray-800 dark:text-gray-300"}`}
                    >
                      {cat.name}
                    </Text>
                    <Text className="text-gray-400 text-[10px]">
                      {cat.count} Items
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* PRODUCT GRID */}
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap justify-between">
                {filteredProducts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => addToCart(p)}
                    style={{ width: isLandscape ? "31%" : "48%" }}
                    className="bg-white dark:bg-gray-800 p-2 rounded-3xl mb-4 shadow-sm"
                  >
                    <Image
                      source={{ uri: p.image }}
                      className="w-full h-28 rounded-2xl"
                    />
                    <Text
                      className="font-bold text-[11px] mt-2 dark:text-white"
                      numberOfLines={2}
                    >
                      {p.name}
                    </Text>
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-[#2D6A4F] font-bold text-sm">
                        ₱{p.price}
                      </Text>
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons
                          name="leaf"
                          size={12}
                          color={p.type === "Veg" ? "green" : "red"}
                        />
                        <Text className="text-[9px] text-gray-400 ml-1">
                          {p.type}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* --- CART SECTION --- */}
        <View
          className={`bg-white dark:bg-gray-900 ${isLandscape ? "flex-[0.35] border-l" : isExpanded ? "flex-1" : "h-[50%]"}`}
        >
          <View className="p-4 flex-row justify-between items-center border-b border-gray-50 dark:border-gray-800">
            <Text className="text-lg font-bold dark:text-white">
              Current Order
            </Text>
            {!isLandscape && (
              <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                <Ionicons
                  name={isExpanded ? "chevron-down" : "expand"}
                  size={22}
                  color="#2D6A4F"
                />
              </TouchableOpacity>
            )}
          </View>

          <View className="px-4 py-3">
            <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
              {["Dine in", "Take Away"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setOrderType(type)}
                  className={`flex-1 py-2.5 rounded-xl items-center ${orderType === type ? "bg-[#D1E7D1]" : ""}`}
                >
                  <Text
                    className={`text-xs font-bold ${orderType === type ? "text-[#2D6A4F]" : "text-gray-500"}`}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <ScrollView className="flex-1 px-4">
            {cart.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center p-3 mb-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm"
              >
                <Image
                  source={{ uri: item.image }}
                  className="w-14 h-14 rounded-xl"
                />
                <View className="flex-1 ml-3">
                  <Text
                    className="text-[10px] font-bold dark:text-white"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-[#2D6A4F] font-bold text-xs">
                      ₱{item.price}
                    </Text>
                    <View className="flex-row items-center bg-gray-50 dark:bg-gray-700 rounded-full px-2">
                      <TouchableOpacity onPress={() => updateQty(item.id, -1)}>
                        <Ionicons
                          name="remove-circle-outline"
                          size={18}
                          color="#2D6A4F"
                        />
                      </TouchableOpacity>
                      <Text className="mx-2 font-bold text-xs dark:text-white">
                        {item.quantity}
                      </Text>
                      <TouchableOpacity onPress={() => updateQty(item.id, 1)}>
                        <Ionicons
                          name="add-circle-outline"
                          size={18}
                          color="#2D6A4F"
                        />
                      </TouchableOpacity>
                    </View>
                    <Text className="font-bold text-xs dark:text-white">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* TALLY PART */}
          <View className="p-4 bg-gray-50 dark:bg-gray-800 rounded-t-[40px] shadow-2xl">
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-400 text-xs">Sub Total</Text>
              <Text className="font-bold text-xs dark:text-white">
                ₱{totals.sub.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-400 text-xs">Tax 5%</Text>
              <Text className="font-bold text-xs dark:text-white">
                ₱{totals.tax.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-t border-dashed border-gray-300">
              <Text className="text-base font-bold dark:text-white">
                Total Amount
              </Text>
              <Text className="text-lg font-extrabold text-[#2D6A4F]">
                ₱{totals.total.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity className="bg-[#009245] py-4 rounded-2xl items-center mt-4">
              <Text className="text-white font-bold text-lg">Place Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
