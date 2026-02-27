import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { productsRepo } from "../data/Products";
import type { ProductWithVariants } from "../types/types";
import { Order, OrderItem, fmt } from "./OrderRow";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const recalcOrder = (
  items: OrderItem[],
  discount: number,
  serviceCharge: number,
): Pick<Order, "subtotal" | "tax" | "total"> => {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = parseFloat((subtotal * 0.12).toFixed(2));
  const total = parseFloat(
    (subtotal + tax - discount + serviceCharge).toFixed(2),
  );
  return { subtotal, tax, total };
};

// ─── Product Picker ───────────────────────────────────────────────────────────
// A searchable list of products+variants from the database.

interface ProductPickerProps {
  products: ProductWithVariants[];
  onAdd: (item: { name: string; unitPrice: number; variantId: number }) => void;
  isDark: boolean;
}

function ProductPicker({ products, onAdd, isDark }: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.variants.some((v) => v.variant_name.toLowerCase().includes(q)),
    );
  }, [search, products]);

  return (
    <View>
      {/* Search */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "#111827" : "#fff",
          borderWidth: 1,
          borderColor: isDark ? "#374151" : "#E5E7EB",
          borderRadius: 10,
          paddingHorizontal: 10,
          marginBottom: 10,
          gap: 8,
        }}
      >
        <Ionicons
          name="search-outline"
          size={15}
          color={isDark ? "#6B7280" : "#9CA3AF"}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products…"
          placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
          style={{
            flex: 1,
            paddingVertical: 9,
            fontSize: 13,
            color: isDark ? "#fff" : "#111",
          }}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={15}
              color={isDark ? "#6B7280" : "#9CA3AF"}
            />
          </Pressable>
        )}
      </View>

      {filtered.length === 0 && (
        <Text
          style={{
            textAlign: "center",
            color: isDark ? "#6B7280" : "#9CA3AF",
            fontSize: 13,
            paddingVertical: 12,
          }}
        >
          No products found
        </Text>
      )}

      {/* Product list */}
      {filtered.map((product) => (
        <View key={product.id} style={{ marginBottom: 6 }}>
          {/* Product row — tap to expand variants */}
          <Pressable
            onPress={() =>
              setExpanded(expanded === product.id ? null : product.id)
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: isDark ? "#374151" : "#E5E7EB",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: isDark ? "#F3F4F6" : "#111827",
                flex: 1,
              }}
            >
              {product.name}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text
                style={{ fontSize: 11, color: isDark ? "#6B7280" : "#9CA3AF" }}
              >
                {product.variants.length} variant
                {product.variants.length !== 1 ? "s" : ""}
              </Text>
              <Ionicons
                name={expanded === product.id ? "chevron-up" : "chevron-down"}
                size={14}
                color={isDark ? "#6B7280" : "#9CA3AF"}
              />
            </View>
          </Pressable>

          {/* Variants — only shown when expanded */}
          {expanded === product.id && (
            <View
              style={{
                backgroundColor: isDark ? "#111827" : "#fff",
                borderWidth: 1,
                borderTopWidth: 0,
                borderColor: isDark ? "#374151" : "#E5E7EB",
                borderBottomLeftRadius: 10,
                borderBottomRightRadius: 10,
                overflow: "hidden",
              }}
            >
              {product.variants.map((variant, idx) => (
                <Pressable
                  key={variant.id}
                  onPress={() =>
                    onAdd({
                      name:
                        product.variants.length === 1
                          ? product.name
                          : `${product.name} (${variant.variant_name})`,
                      unitPrice: variant.price,
                      variantId: variant.id,
                    })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: isDark ? "#1F2937" : "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: isDark ? "#D1D5DB" : "#374151",
                      flex: 1,
                    }}
                  >
                    {variant.variant_name}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: isDark ? "#93C5FD" : "#2563EB",
                      }}
                    >
                      {fmt(variant.price)}
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#2563EB",
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#fff",
                        }}
                      >
                        + Add
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface EditItemsModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onSave: (items: OrderItem[]) => void;
}

export function EditItemsModal({
  order,
  visible,
  onClose,
  onSave,
}: EditItemsModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // ── Totals preview ─────────────────────────────────────────────────────────
  // MUST be before any early return to comply with Rules of Hooks.
  const previewTotals = useMemo(
    () =>
      order
        ? recalcOrder(editItems, order.discount, order.serviceCharge)
        : { subtotal: 0, tax: 0, total: 0 },
    [editItems, order],
  );

  // Early return AFTER all hooks
  if (!order) return null;

  // ── Load products from DB when modal opens ─────────────────────────────────
  const handleShow = async () => {
    setEditItems(order.items.map((i) => ({ ...i })));
    setShowPicker(false);
    setLoading(true);
    try {
      const data = await productsRepo.getAllWithVariants();
      setProducts(data);
    } catch (e) {
      console.error("[EditItemsModal] Failed to load products:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Quantity stepper ───────────────────────────────────────────────────────
  const updateQty = (id: string, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  // ── Remove item ────────────────────────────────────────────────────────────
  const removeItem = (id: string) => {
    setEditItems((prev) => prev.filter((i) => i.id !== id));
  };

  // ── Add from product picker ────────────────────────────────────────────────
  const handleAddFromPicker = ({
    name,
    unitPrice,
    variantId,
  }: {
    name: string;
    unitPrice: number;
    variantId: number;
  }) => {
    setEditItems((prev) => {
      // If this variant already exists in the order, just increment qty
      const existing = prev.find(
        (i) => i.id === `v-${variantId}` || i.name === name,
      );
      if (existing) {
        return prev.map((i) =>
          i.name === name ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          id: `v-${variantId}-${Date.now()}`,
          name,
          quantity: 1,
          unitPrice,
          modifiers: [],
        },
      ];
    });
    setShowPicker(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            height: SCREEN_HEIGHT * 0.92,
            backgroundColor: isDark ? "#111827" : "#FFFFFF",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <View>
              <Text className="text-gray-900 dark:text-white font-extrabold text-base">
                Edit Order Items
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                {order.id} · {order.receiptNumber}
              </Text>
            </View>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons
                name="close"
                size={22}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </Pressable>
          </View>

          {loading ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator
                size="large"
                color={isDark ? "#3B82F6" : "#2563EB"}
              />
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: isDark ? "#9CA3AF" : "#6B7280",
                }}
              >
                Loading products…
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Current Items ── */}
              <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                Current Items
              </Text>

              {editItems.length === 0 && (
                <View className="items-center py-6 bg-gray-50 dark:bg-gray-800 rounded-xl mb-3">
                  <Ionicons
                    name="cart-outline"
                    size={28}
                    color={isDark ? "#4B5563" : "#D1D5DB"}
                  />
                  <Text className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    No items — add one below
                  </Text>
                </View>
              )}

              {editItems.map((item) => (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: isDark ? "#374151" : "#E5E7EB",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {/* Name + price (read-only) */}
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: isDark ? "#F3F4F6" : "#111827",
                        }}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: isDark ? "#9CA3AF" : "#6B7280",
                          marginTop: 2,
                        }}
                      >
                        {fmt(item.unitPrice)} each ·{" "}
                        <Text
                          style={{
                            fontWeight: "700",
                            color: isDark ? "#D1D5DB" : "#374151",
                          }}
                        >
                          {fmt(item.unitPrice * item.quantity)}
                        </Text>
                      </Text>
                    </View>

                    {/* Qty stepper */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Pressable
                        onPress={() => updateQty(item.id, -1)}
                        style={{
                          backgroundColor: isDark ? "#374151" : "#E5E7EB",
                          borderRadius: 8,
                          padding: 7,
                        }}
                      >
                        <Ionicons
                          name={
                            item.quantity === 1 ? "trash-outline" : "remove"
                          }
                          size={14}
                          color={
                            item.quantity === 1
                              ? "#EF4444"
                              : isDark
                                ? "#D1D5DB"
                                : "#374151"
                          }
                        />
                      </Pressable>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "800",
                          color: isDark ? "#fff" : "#111",
                          minWidth: 28,
                          textAlign: "center",
                        }}
                      >
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => updateQty(item.id, 1)}
                        style={{
                          backgroundColor: "#2563EB",
                          borderRadius: 8,
                          padding: 7,
                        }}
                      >
                        <Ionicons name="add" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}

              {/* ── Add from Menu ── */}
              <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-2 mb-3">
                Add from Menu
              </Text>

              {!showPicker ? (
                <Pressable
                  onPress={() => setShowPicker(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: isDark ? "#1E3A5F" : "#EFF6FF",
                    borderWidth: 2,
                    borderColor: "#3B82F6",
                    borderRadius: 12,
                    paddingVertical: 14,
                    marginBottom: 16,
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#2563EB"
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#2563EB",
                    }}
                  >
                    Browse Menu to Add Items
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={{
                    backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: isDark ? "#374151" : "#E5E7EB",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: isDark ? "#D1D5DB" : "#374151",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Select from Menu
                    </Text>
                    <Pressable onPress={() => setShowPicker(false)}>
                      <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color={isDark ? "#6B7280" : "#9CA3AF"}
                      />
                    </Pressable>
                  </View>
                  <ProductPicker
                    products={products}
                    onAdd={handleAddFromPicker}
                    isDark={isDark}
                  />
                </View>
              )}

              {/* ── Updated Totals Preview ── */}
              <View
                style={{
                  backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: isDark ? "#374151" : "#E5E7EB",
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isDark ? "#6B7280" : "#9CA3AF",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  Updated Totals Preview
                </Text>
                {[
                  { label: "Subtotal", value: previewTotals.subtotal },
                  { label: "Tax (12%)", value: previewTotals.tax },
                ].map(({ label, value }) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: isDark ? "#9CA3AF" : "#6B7280",
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isDark ? "#D1D5DB" : "#374151",
                      }}
                    >
                      {fmt(value)}
                    </Text>
                  </View>
                ))}
                <View
                  style={{
                    height: 1,
                    backgroundColor: isDark ? "#374151" : "#E5E7EB",
                    marginVertical: 6,
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "900",
                      color: isDark ? "#fff" : "#111",
                    }}
                  >
                    New Total
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "900",
                      color: "#2563EB",
                    }}
                  >
                    {fmt(previewTotals.total)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Save Footer */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderTopWidth: 1,
              borderTopColor: isDark ? "#1F2937" : "#F3F4F6",
              backgroundColor: isDark ? "#111827" : "#FFFFFF",
            }}
          >
            <Pressable
              onPress={() => {
                onSave(editItems);
                onClose();
              }}
              style={{
                backgroundColor: "#2563EB",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                Save Item Changes
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
