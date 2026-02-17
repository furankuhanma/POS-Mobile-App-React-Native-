import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  Text,
  TextInput,
} from "react-native";
import { Order, OrderItem, fmt } from "./OrderRow";

// ─── Helper ───────────────────────────────────────────────────────────────────

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
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");

  if (!order) return null;

  const handleShow = () => {
    setEditItems(order.items.map((i) => ({ ...i })));
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty("1");
  };

  const updateQty = (id: string, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const updatePrice = (id: string, val: string) => {
    const p = parseFloat(val);
    if (isNaN(p) || p < 0) return;
    setEditItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, unitPrice: p } : i)),
    );
  };

  const updateName = (id: string, val: string) => {
    setEditItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, name: val } : i)),
    );
  };

  const updateModifiers = (id: string, val: string) => {
    setEditItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, modifiers: val ? val.split(",").map((m) => m.trim()) : [] }
          : i,
      ),
    );
  };

  const removeItem = (id: string) => {
    setEditItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addItem = () => {
    const name = newItemName.trim();
    const price = parseFloat(newItemPrice);
    const qty = parseInt(newItemQty) || 1;
    if (!name || isNaN(price) || price <= 0) return;
    const newId = `new-${Date.now()}`;
    setEditItems((prev) => [
      ...prev,
      { id: newId, name, quantity: qty, unitPrice: price, modifiers: [] },
    ]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty("1");
  };

  const previewTotals = useMemo(() => {
    return recalcOrder(editItems, order.discount, order.serviceCharge);
  }, [editItems, order.discount, order.serviceCharge]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/50 justify-center px-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden max-h-[85%]"
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

          <ScrollView className="flex-1" contentContainerClassName="p-4">
            {/* Existing Items */}
            <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
              Items
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

            {editItems.map((item, idx) => (
              <View
                key={item.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-3 border border-gray-100 dark:border-gray-700"
              >
                {/* Item header: name + delete */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Item {idx + 1}
                  </Text>
                  <Pressable
                    onPress={() => removeItem(item.id)}
                    className="bg-red-50 dark:bg-red-950 rounded-lg p-1.5"
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </Pressable>
                </View>

                {/* Name field */}
                <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                  Name
                </Text>
                <TextInput
                  value={item.name}
                  onChangeText={(v) => updateName(item.id, v)}
                  placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white mb-2"
                />

                {/* Price + Qty row */}
                <View className="flex-row gap-2 mb-2">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                      Unit Price (₱)
                    </Text>
                    <TextInput
                      value={String(item.unitPrice)}
                      onChangeText={(v) => updatePrice(item.id, v)}
                      keyboardType="numeric"
                      placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                      Quantity
                    </Text>
                    <View className="flex-row items-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <Pressable
                        onPress={() => updateQty(item.id, -1)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-600"
                      >
                        <Ionicons
                          name="remove"
                          size={14}
                          color={isDark ? "#D1D5DB" : "#374151"}
                        />
                      </Pressable>
                      <Text className="flex-1 text-center text-sm font-bold text-gray-900 dark:text-white">
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => updateQty(item.id, 1)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-600"
                      >
                        <Ionicons
                          name="add"
                          size={14}
                          color={isDark ? "#D1D5DB" : "#374151"}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Modifiers */}
                <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                  Modifiers (comma-separated)
                </Text>
                <TextInput
                  value={item.modifiers.join(", ")}
                  onChangeText={(v) => updateModifiers(item.id, v)}
                  placeholder="e.g. No ice, Extra sauce"
                  placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                />

                {/* Line total */}
                <View className="flex-row justify-end mt-2">
                  <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Line total:{" "}
                    <Text className="text-gray-900 dark:text-white font-bold">
                      {fmt(item.quantity * item.unitPrice)}
                    </Text>
                  </Text>
                </View>
              </View>
            ))}

            {/* Add New Item */}
            <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 mt-2">
              Add New Item
            </Text>
            <View className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-3 border border-blue-100 dark:border-blue-900 mb-4">
              <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Name
              </Text>
              <TextInput
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="e.g. Wagyu Burger"
                placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white mb-2"
              />
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Unit Price (₱)
                  </Text>
                  <TextInput
                    value={newItemPrice}
                    onChangeText={setNewItemPrice}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Quantity
                  </Text>
                  <TextInput
                    value={newItemQty}
                    onChangeText={setNewItemQty}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </View>
              </View>
              <Pressable
                onPress={addItem}
                className="flex-row items-center justify-center gap-2 bg-blue-600 rounded-xl py-2.5"
              >
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text className="text-white font-bold text-sm">Add Item</Text>
              </Pressable>
            </View>

            {/* Preview Totals */}
            <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
              <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                Updated Totals Preview
              </Text>
              {[
                { label: "Subtotal", value: previewTotals.subtotal },
                { label: "Tax (12%)", value: previewTotals.tax },
              ].map(({ label, value }) => (
                <View key={label} className="flex-row justify-between mb-1.5">
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">
                    {label}
                  </Text>
                  <Text className="text-gray-700 dark:text-gray-300 text-sm font-semibold">
                    {fmt(value)}
                  </Text>
                </View>
              ))}
              <View className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
              <View className="flex-row justify-between">
                <Text className="text-gray-900 dark:text-white font-black text-sm">
                  New Total
                </Text>
                <Text className="text-blue-600 dark:text-blue-400 font-black text-base">
                  {fmt(previewTotals.total)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Save Footer */}
          <View className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <Pressable
              onPress={() => {
                onSave(editItems);
                onClose();
              }}
              className="bg-blue-600 rounded-xl py-3.5 items-center"
            >
              <Text className="text-white font-extrabold text-sm">
                Save Item Changes
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
