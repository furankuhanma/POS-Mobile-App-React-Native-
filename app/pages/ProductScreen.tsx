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

  // ── Derived categories ───────────────────────────────────────────────────
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
          imageUri: product.image_uri ?? undefined,
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

  // ── Colors (resolved once per render, safe for inline styles) ────────────
  const borderColor = isDark ? "#1F2937" : "#F3F4F6";
  const bgScreen = isDark ? "#030712" : "#F4F7F4";
  const bgCart = isDark ? "#111827" : "#ffffff";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: bgScreen }}>
      <Stack.Screen options={{ headerShown: false }} />

      {successOrderId && (
        <SuccessToast
          orderId={successOrderId}
          onDismiss={() => setSuccessOrderId(null)}
        />
      )}

      <View style={{ flex: 1, flexDirection: isLandscape ? "row" : "column" }}>
        {/* ── MENU SECTION ── */}
        {!isExpanded && (
          <View style={{ flex: isLandscape ? 0.65 : 1, padding: 16 }}>
            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: isDark ? "#1F2937" : "#ffffff",
                  borderWidth: 1,
                  borderColor: isDark ? "#374151" : "#F3F4F6",
                  borderRadius: 16,
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  placeholder="Search products..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#9CA3AF"
                  style={{
                    flex: 1,
                    height: 40,
                    marginLeft: 8,
                    color: isDark ? "#ffffff" : "#111827",
                  }}
                />
              </View>
            </View>

            {/* Category chips */}
            <View style={{ height: 64, marginBottom: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCat(cat)}
                    style={{
                      marginRight: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 24,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      backgroundColor:
                        activeCat === cat
                          ? isDark
                            ? "rgba(20,83,45,0.3)"
                            : "#DCFCE7"
                          : isDark
                            ? "#1F2937"
                            : "#ffffff",
                      borderColor:
                        activeCat === cat
                          ? "#16A34A"
                          : isDark
                            ? "#374151"
                            : "#F3F4F6",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color:
                          activeCat === cat
                            ? isDark
                              ? "#4ADE80"
                              : "#166534"
                            : "#6B7280",
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Product grid */}
            {loadingProducts ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color="#16A34A" />
                <Text style={{ marginTop: 12, fontSize: 14, color: "#9CA3AF" }}>
                  Loading products…
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                  }}
                >
                  {filtered.map((product) => {
                    const defaultVariant = product.variants[0] ?? null;
                    const displayPrice = defaultVariant?.price ?? 0;

                    return (
                      <TouchableOpacity
                        key={product.id}
                        onPress={() => handleProductPress(product)}
                        style={{
                          width: isLandscape ? "31%" : "48%",
                          padding: 8,
                          marginBottom: 16,
                          backgroundColor: isDark ? "#1F2937" : "#ffffff",
                          borderRadius: 24,
                          shadowColor: "#000",
                          shadowOpacity: 0.06,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                      >
                        <ProductImage
                          uri={product.image_uri}
                          size="card"
                          isDark={isDark}
                        />
                        <Text
                          style={{
                            fontWeight: "700",
                            fontSize: 11,
                            marginTop: 8,
                            color: isDark ? "#ffffff" : "#111827",
                          }}
                          numberOfLines={1}
                        >
                          {product.name}
                        </Text>
                        {product.variants.length > 1 && (
                          <Text
                            style={{
                              fontSize: 9,
                              color: "#9CA3AF",
                              marginBottom: 2,
                            }}
                          >
                            {product.variants.length} variants
                          </Text>
                        )}
                        <Text style={{ fontWeight: "700", color: "#15803D" }}>
                          ₱{displayPrice.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {filtered.length === 0 && !loadingProducts && (
                    <View
                      style={{ flex: 1, alignItems: "center", paddingTop: 64 }}
                    >
                      <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
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
          style={[
            { backgroundColor: bgCart },
            isLandscape
              ? { flex: 0.35, borderLeftWidth: 1, borderColor }
              : isExpanded
                ? { flex: 1 }
                : { height: "45%", borderTopWidth: 1, borderColor },
          ]}
        >
          {/* Cart header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: selectionMode
                ? "#FECACA"
                : isDark
                  ? "#1F2937"
                  : "#F9FAFB",
              backgroundColor: selectionMode
                ? isDark
                  ? "rgba(153,27,27,0.2)"
                  : "#FEF2F2"
                : "transparent",
            }}
          >
            {selectionMode ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectionMode(false);
                      setSelectedIds([]);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#ef4444" />
                  </TouchableOpacity>
                  <Text
                    style={{
                      marginLeft: 12,
                      fontSize: 18,
                      fontWeight: "700",
                      color: "#DC2626",
                    }}
                  >
                    {selectedIds.length} Selected
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={deleteSelected}
                  style={{
                    padding: 8,
                    backgroundColor: "#EF4444",
                    borderRadius: 12,
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Feather name="trash-2" size={20} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: isDark ? "#ffffff" : "#111827",
                    }}
                  >
                    Current Order
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                    {cart.reduce((s, i) => s + i.qty, 0)} Items
                  </Text>
                </View>
                {!isLandscape && (
                  <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                    <Ionicons
                      name={isExpanded ? "contract-outline" : "expand-outline"}
                      size={22}
                      color="#009245"
                    />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Cart items */}
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, marginTop: 16 }}>
            {cart.length === 0 && (
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <Ionicons
                  name="cart-outline"
                  size={40}
                  color={isDark ? "#374151" : "#E5E7EB"}
                />
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    color: isDark ? "#4B5563" : "#D1D5DB",
                  }}
                >
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    marginBottom: 16,
                    borderRadius: 16,
                    borderWidth: 1,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                    backgroundColor: isSelected
                      ? isDark
                        ? "rgba(153,27,27,0.2)"
                        : "#FEF2F2"
                      : isDark
                        ? "#1F2937"
                        : "#ffffff",
                    borderColor: isSelected
                      ? "#FCA5A5"
                      : isDark
                        ? "#374151"
                        : "#F3F4F6",
                  }}
                >
                  <ProductImage
                    uri={item.imageUri}
                    size="thumb"
                    isDark={isDark}
                  />

                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: isDark ? "#ffffff" : "#111827",
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.variantName !== item.name && (
                      <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                        {item.variantName}
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: "#16A34A",
                      }}
                    >
                      ₱{item.price.toFixed(2)}
                    </Text>
                  </View>

                  {!selectionMode && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => updateQty(key, -1)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isDark ? "#374151" : "#F3F4F6",
                        }}
                      >
                        <Ionicons
                          name="remove"
                          size={16}
                          color={isDark ? "white" : "black"}
                        />
                      </TouchableOpacity>
                      <Text
                        style={{
                          width: 20,
                          fontWeight: "700",
                          textAlign: "center",
                          color: isDark ? "#ffffff" : "#111827",
                        }}
                      >
                        {item.qty}
                      </Text>
                      <TouchableOpacity
                        onPress={() => updateQty(key, 1)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#22C55E",
                        }}
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
          <View
            style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 14, color: "#9CA3AF" }}>Subtotal</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: isDark ? "#ffffff" : "#111827",
                }}
              >
                ₱{subtotal.toFixed(2)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
                Est. Tax (12%)
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: isDark ? "#ffffff" : "#111827",
                }}
              >
                ₱{tax.toFixed(2)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 8,
                marginBottom: 16,
                borderTopWidth: 1,
                borderTopColor: isDark ? "#1F2937" : "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: isDark ? "#ffffff" : "#111827",
                }}
              >
                Est. Total
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#16A34A" }}
              >
                ₱{(subtotal + tax).toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => cart.length > 0 && setShowCheckout(true)}
              style={{
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
                backgroundColor:
                  cart.length > 0 ? "#22C55E" : isDark ? "#374151" : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 16,
                  color:
                    cart.length > 0
                      ? "#ffffff"
                      : isDark
                        ? "#6B7280"
                        : "#9CA3AF",
                }}
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
