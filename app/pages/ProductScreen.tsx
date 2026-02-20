import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { productsRepo } from "../data/Products";
import type { ProductWithVariants, DbProductVariant } from "../types/types";
import { CheckoutModal, CartItem } from "../components/CheckoutModal";

// ─── Success Toast ────────────────────────────────────────────────────────────

function SuccessToast({
  orderId,
  onDismiss,
}: {
  orderId: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
        zIndex: 999,
      }}
      className="flex-row items-center px-5 py-4 bg-green-600 shadow-lg rounded-2xl"
    >
      <Ionicons name="checkmark-circle" size={24} color="#fff" />
      <View className="flex-1 ml-3">
        <Text className="text-sm font-black text-white">Order Placed!</Text>
        <Text className="text-green-100 text-xs mt-0.5">
          {orderId} is now Preparing
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss}>
        <Ionicons name="close" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Product Image ─────────────────────────────────────────────────────────────
// Shared component: shows image_uri if available, otherwise food icon placeholder.

function ProductImage({
  uri,
  size = "card",
  isDark,
}: {
  uri?: string | null;
  size?: "card" | "thumb";
  isDark: boolean;
}) {
  const isThumb = size === "thumb";
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={
          isThumb
            ? { width: 56, height: 56, borderRadius: 12 }
            : { width: "100%", height: 112, borderRadius: 16 }
        }
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={
        isThumb
          ? {
              width: 56,
              height: 56,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "#374151" : "#F3F4F6",
            }
          : {
              width: "100%",
              height: 112,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "#374151" : "#F3F4F6",
            }
      }
    >
      <MaterialCommunityIcons
        name="food"
        size={isThumb ? 24 : 40}
        color={isDark ? "#4B5563" : "#D1D5DB"}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProductScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // ── DB State ─────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ── UI State ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  // ── Load products from DB ────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const rows = await productsRepo.getAllWithVariants();
      setProducts(rows);
    } catch (e) {
      console.error("[ProductScreen] load error", e);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ── Derived categories from DB data ─────────────────────────────────────
  const categories = useMemo(() => {
    const catSet = new Set(products.map((p) => p.category_name));
    return ["All", ...Array.from(catSet).sort()];
  }, [products]);

  // ── Filtered products ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCat === "All" || p.category_name === activeCat;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, search, activeCat]);

  // ── Cart helpers ─────────────────────────────────────────────────────────
  const cartKey = (productId: number, variantId: number) =>
    `${productId}-${variantId}`;

  const addToCart = (
    product: ProductWithVariants,
    variant: DbProductVariant | null,
  ) => {
    if (selectionMode) return;
    const vId = variant?.id ?? 0;
    const key = cartKey(product.id, vId);

    setCart((prev) => {
      const existing = prev.find((i) => cartKey(i.id, i.variantId) === key);
      if (existing) {
        return prev.map((i) =>
          cartKey(i.id, i.variantId) === key ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          variantId: vId,
          name: product.name,
          variantName: variant?.variant_name ?? product.name,
          price: variant?.price ?? 0,
          qty: 1,
          imageUri: (product as any).image_uri ?? undefined, // ✅ carry image into cart
        },
      ];
    });
  };

  const handleProductPress = (product: ProductWithVariants) => {
    if (selectionMode) return;
    const variant = product.variants[0] ?? null;
    addToCart(product, variant);
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => cartKey(i.id, i.variantId) === key);
      if (item && item.qty === 1 && delta === -1) {
        return prev.filter((i) => cartKey(i.id, i.variantId) !== key);
      }
      return prev.map((i) =>
        cartKey(i.id, i.variantId) === key ? { ...i, qty: i.qty + delta } : i,
      );
    });
  };

  const toggleSelection = (key: string) => {
    setSelectedIds((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const deleteSelected = () => {
    setCart((prev) =>
      prev.filter((i) => !selectedIds.includes(cartKey(i.id, i.variantId))),
    );
    setSelectedIds([]);
    setSelectionMode(false);
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.12;

  // ── Order success ─────────────────────────────────────────────────────────
  const handleOrderSuccess = (orderId: string) => {
    setShowCheckout(false);
    setCart([]);
    setSelectionMode(false);
    setSelectedIds([]);
    setIsExpanded(false);
    setSuccessOrderId(orderId);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-[#F4F7F4] dark:bg-gray-950">
      <Stack.Screen options={{ headerShown: false }} />

      {successOrderId && (
        <SuccessToast
          orderId={successOrderId}
          onDismiss={() => setSuccessOrderId(null)}
        />
      )}

      <View className={`flex-1 ${isLandscape ? "flex-row" : "flex-col"}`}>
        {/* ── MENU SECTION ── */}
        {!isExpanded && (
          <View className={`${isLandscape ? "flex-[0.65]" : "flex-1"} p-4`}>
            {/* Search */}
            <View className="flex-row items-center mb-4 space-x-2">
              <View className="flex-row items-center flex-1 px-4 py-2 bg-white border border-gray-100 shadow-sm dark:bg-gray-800 rounded-2xl dark:border-gray-700">
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  placeholder="Search products..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 h-10 ml-2 outline-none dark:text-white"
                />
              </View>
            </View>

            {/* Category chips */}
            <View className="h-16 mb-4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCat(cat)}
                    className={`mr-3 px-4 py-3 rounded-3xl items-center justify-center border ${
                      activeCat === cat
                        ? "bg-green-100 border-green-600 dark:bg-green-900/30"
                        : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        activeCat === cat
                          ? "text-green-800 dark:text-green-400"
                          : "text-gray-500"
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Product grid */}
            {loadingProducts ? (
              <View className="items-center justify-center flex-1">
                <ActivityIndicator size="large" color="#16A34A" />
                <Text className="mt-3 text-sm text-gray-400">
                  Loading products…
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap justify-between">
                  {filtered.map((product) => {
                    const defaultVariant = product.variants[0] ?? null;
                    const displayPrice = defaultVariant?.price ?? 0;

                    return (
                      <TouchableOpacity
                        key={product.id}
                        onPress={() => handleProductPress(product)}
                        style={{ width: isLandscape ? "31%" : "48%" }}
                        className="p-2 mb-4 bg-white shadow-sm dark:bg-gray-800 rounded-3xl"
                      >
                        {/* ✅ Shows saved image, falls back to food icon */}
                        <ProductImage
                          uri={(product as any).image_uri}
                          size="card"
                          isDark={isDark}
                        />
                        <Text
                          className="font-bold text-[11px] mt-2 dark:text-white"
                          numberOfLines={1}
                        >
                          {product.name}
                        </Text>
                        {product.variants.length > 1 && (
                          <Text className="text-[9px] text-gray-400 mb-0.5">
                            {product.variants.length} variants
                          </Text>
                        )}
                        <Text className="font-bold text-green-700">
                          ₱{displayPrice.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {filtered.length === 0 && !loadingProducts && (
                    <View className="items-center flex-1 pt-16">
                      <Text className="text-sm text-gray-400">
                        No products found
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {/* ── CART SECTION ── */}
        <View
          className={`bg-white dark:bg-gray-900 ${
            isLandscape
              ? "flex-[0.35] border-l border-gray-100 dark:border-gray-800"
              : isExpanded
                ? "flex-1"
                : "h-[45%] border-t border-gray-100 dark:border-gray-800"
          }`}
        >
          {/* Cart header */}
          <View
            className={`flex-row items-center justify-between p-4 border-b ${
              selectionMode
                ? "bg-red-50 dark:bg-red-900/20 border-red-200"
                : "border-gray-50 dark:border-gray-800"
            }`}
          >
            {selectionMode ? (
              <>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => {
                      setSelectionMode(false);
                      setSelectedIds([]);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#ef4444" />
                  </TouchableOpacity>
                  <Text className="ml-3 text-lg font-bold text-red-600">
                    {selectedIds.length} Selected
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={deleteSelected}
                  className="p-2 bg-red-500 shadow-md rounded-xl"
                >
                  <Feather name="trash-2" size={20} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View>
                  <Text className="text-lg font-bold dark:text-white">
                    Current Order
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {cart.reduce((s, i) => s + i.qty, 0)} Items
                  </Text>
                </View>
                {!isLandscape && (
                  <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                    <Ionicons
                      name={isExpanded ? "chevron-down" : "expand"}
                      size={22}
                      color="#009245"
                    />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Cart items */}
          <ScrollView className="flex-1 px-4 mt-4">
            {cart.length === 0 && (
              <View className="items-center pt-10">
                <Ionicons
                  name="cart-outline"
                  size={40}
                  color={isDark ? "#374151" : "#E5E7EB"}
                />
                <Text className="mt-2 text-sm text-gray-300 dark:text-gray-600">
                  Cart is empty
                </Text>
              </View>
            )}

            {cart.map((item) => {
              const key = cartKey(item.id, item.variantId);
              const isSelected = selectedIds.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.8}
                  onLongPress={() => {
                    setSelectionMode(true);
                    toggleSelection(key);
                  }}
                  onPress={() => selectionMode && toggleSelection(key)}
                  className={`flex-row items-center p-3 mb-4 rounded-2xl border shadow-sm ${
                    isSelected
                      ? "bg-red-50 dark:bg-red-900/20 border-red-300"
                      : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                  }`}
                >
                  {/* ✅ Shows product image in cart too */}
                  <ProductImage
                    uri={(item as any).imageUri}
                    size="thumb"
                    isDark={isDark}
                  />

                  <View className="flex-1 mx-3">
                    <Text
                      className="text-sm font-bold dark:text-white"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.variantName !== item.name && (
                      <Text className="text-xs text-gray-400">
                        {item.variantName}
                      </Text>
                    )}
                    <Text className="text-sm font-bold text-green-600">
                      ₱{item.price.toFixed(2)}
                    </Text>
                  </View>

                  {!selectionMode && (
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => updateQty(key, -1)}
                        className="items-center justify-center bg-gray-100 rounded-full w-7 h-7 dark:bg-gray-700"
                      >
                        <Ionicons
                          name="remove"
                          size={16}
                          color={isDark ? "white" : "black"}
                        />
                      </TouchableOpacity>
                      <Text className="w-5 font-bold text-center dark:text-white">
                        {item.qty}
                      </Text>
                      <TouchableOpacity
                        onPress={() => updateQty(key, 1)}
                        className="items-center justify-center bg-green-500 rounded-full w-7 h-7"
                      >
                        <Ionicons name="add" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectionMode && (
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={isSelected ? "#ef4444" : "#9ca3af"}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Summary + Place Order */}
          <View className="px-4 pt-1 pb-2">
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-gray-400">Subtotal</Text>
              <Text className="text-sm font-bold dark:text-white">
                ₱{subtotal.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-sm text-gray-400">Est. Tax (12%)</Text>
              <Text className="text-sm font-bold dark:text-white">
                ₱{tax.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between pt-2 mb-4 border-t border-gray-100 dark:border-gray-800">
              <Text className="text-base font-bold dark:text-white">
                Est. Total
              </Text>
              <Text className="text-base font-bold text-green-600">
                ₱{(subtotal + tax).toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => cart.length > 0 && setShowCheckout(true)}
              className={`py-4 rounded-2xl items-center ${
                cart.length > 0
                  ? "bg-green-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <Text
                className={`font-bold text-base ${
                  cart.length > 0
                    ? "text-white"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {cart.length > 0 ? "Place Order →" : "Add items to order"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Checkout Modal ── */}
      <CheckoutModal
        visible={showCheckout}
        cart={cart}
        onClose={() => setShowCheckout(false)}
        onSuccess={handleOrderSuccess}
      />
    </View>
  );
}
