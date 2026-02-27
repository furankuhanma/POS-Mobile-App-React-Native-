import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { DiscountType, TaxConfig } from "../types/types";
import { DEFAULT_DISCOUNT_TYPES, DEFAULT_TAX_CONFIG } from "../types/types";
import {
  Order,
  ORDER_TYPE_ICON,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "./OrderRow";
import type { ReceiptData } from "./ReceiptModal";
import { ReceiptModal } from "./ReceiptModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Chip row helper ──────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
  isDark,
}: {
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (k: T) => void;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 20,
      }}
    >
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onSelect(o.key)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 20,
            borderWidth: 2,
            borderColor:
              selected === o.key ? "#2563EB" : isDark ? "#374151" : "#E5E7EB",
            backgroundColor:
              selected === o.key ? "#2563EB" : isDark ? "#1F2937" : "#F9FAFB",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color:
                selected === o.key ? "#fff" : isDark ? "#9CA3AF" : "#6B7280",
            }}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface EditOrderModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Order>) => void;
  onEditItems: () => void;
  discountTypes?: DiscountType[];
  taxConfig?: TaxConfig;
}

export function EditOrderModal({
  order,
  visible,
  onClose,
  onSave,
  onEditItems,
  discountTypes = DEFAULT_DISCOUNT_TYPES,
  taxConfig = DEFAULT_TAX_CONFIG,
}: EditOrderModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [pm, setPm] = useState<PaymentMethod>("Cash");
  const [ps, setPs] = useState<PaymentStatus>("Paid");
  const [tableNumber, setTableNumber] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("dine-in");

  // ── Discount ───────────────────────────────────────────────────────────────
  const [selectedDiscountId, setSelectedDiscountId] = useState("none");
  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [newDiscountLabel, setNewDiscountLabel] = useState("");
  const [newDiscountRate, setNewDiscountRate] = useState("");
  const [localDiscountTypes, setLocalDiscountTypes] =
    useState<DiscountType[]>(discountTypes);
  const [addDiscountError, setAddDiscountError] = useState("");

  // ── Tax ────────────────────────────────────────────────────────────────────
  const [taxMode, setTaxMode] = useState<"VAT" | "Non-VAT">(taxConfig.mode);
  const [vatRateInput, setVatRateInput] = useState(
    String(taxConfig.vatRate * 100),
  );

  // ── Other Charges ──────────────────────────────────────────────────────────
  const [otherChargesLabel, setOtherChargesLabel] = useState("");
  const [otherChargesAmt, setOtherChargesAmt] = useState("0");

  // ── Regenerated receipt ────────────────────────────────────────────────────
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  if (!order) return null;

  const handleShow = () => {
    setPm(order.paymentMethod);
    setPs(order.paymentStatus);
    setTableNumber(order.tableNumber ?? "");
    setOrderType(order.orderType);
    setOtherChargesLabel("");
    setOtherChargesAmt(
      order.serviceCharge > 0 ? String(order.serviceCharge) : "0",
    );
    setSelectedDiscountId("none");
    setShowAddDiscount(false);
    setNewDiscountLabel("");
    setNewDiscountRate("");
    setLocalDiscountTypes(discountTypes);
    setTaxMode(taxConfig.mode);
    setVatRateInput(String(taxConfig.vatRate * 100));
    setAddDiscountError("");
    setReceipt(null);
  };

  // ── Derived totals ─────────────────────────────────────────────────────────
  const subtotal = order.items.reduce(
    (s, i) => s + i.quantity * i.unitPrice,
    0,
  );
  const activeDiscount =
    selectedDiscountId === "none"
      ? null
      : (localDiscountTypes.find((d) => d.id === selectedDiscountId) ?? null);
  const discountAmt = activeDiscount
    ? parseFloat((subtotal * activeDiscount.rate).toFixed(2))
    : 0;
  const effectiveTaxRate =
    taxMode === "VAT" ? (parseFloat(vatRateInput) || 0) / 100 : 0;
  const tax = parseFloat(
    (Math.max(0, subtotal - discountAmt) * effectiveTaxRate).toFixed(2),
  );
  const sc = parseFloat(otherChargesAmt) || 0;
  const total = parseFloat((subtotal + tax - discountAmt + sc).toFixed(2));

  // ── Add discount type ──────────────────────────────────────────────────────
  const handleAddDiscount = () => {
    const label = newDiscountLabel.trim();
    const rate = parseFloat(newDiscountRate) / 100;
    if (!label || isNaN(rate) || rate <= 0 || rate > 1) {
      setAddDiscountError("Enter a valid label and rate (1–100).");
      return;
    }
    const newType: DiscountType = { id: `custom_${Date.now()}`, label, rate };
    setLocalDiscountTypes((p) => [...p, newType]);
    setSelectedDiscountId(newType.id);
    setShowAddDiscount(false);
    setNewDiscountLabel("");
    setNewDiscountRate("");
    setAddDiscountError("");
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    onSave({
      paymentMethod: pm,
      paymentStatus: ps,
      discount: discountAmt,
      serviceCharge: sc,
      orderType,
      tableNumber:
        orderType === "dine-in" ? tableNumber || undefined : undefined,
      subtotal,
      tax,
      total,
    });
    onClose();
  };

  // ── Regenerate Receipt ─────────────────────────────────────────────────────
  const handleRegenerateReceipt = () => {
    setReceipt({
      orderNumber: order.id,
      receiptNumber: order.receiptNumber,
      orderType,
      tableNumber: orderType === "dine-in" ? tableNumber || null : null,
      paymentMethod: pm,
      items: order.items.map((i) => ({
        name: i.name,
        qty: i.quantity,
        price: i.unitPrice,
      })),
      subtotal,
      discountLabel: activeDiscount
        ? `${activeDiscount.label} ${(activeDiscount.rate * 100).toFixed(0)}%`
        : null,
      discountAmt,
      taxLabel:
        taxMode === "VAT"
          ? `VAT (${(effectiveTaxRate * 100).toFixed(0)}%)`
          : "Non-VAT",
      taxAmt: tax,
      otherChargesLabel: otherChargesLabel.trim() || "Other Charges",
      otherChargesAmt: sc,
      total,
      cashTendered: order.cashTendered ?? null,
      change:
        order.cashTendered != null
          ? Math.max(order.cashTendered - total, 0)
          : null,
      createdAt: new Date(order.createdAt),
    });
  };

  const labelClass =
    "text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2";

  return (
    <>
      {/* Regenerated receipt — "Back" just closes it, stays in edit modal */}
      <ReceiptModal
        visible={receipt !== null}
        data={receipt}
        onBackToCashier={() => setReceipt(null)}
        onPrint={() =>
          console.log("[EditOrder] Print:", receipt?.receiptNumber)
        }
        backLabel="Close Receipt"
      />

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
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-extrabold text-base">
                  Edit Order
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

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              showsVerticalScrollIndicator
            >
              {/* Edit Items */}
              <Pressable
                onPress={onEditItems}
                className="flex-row items-center justify-between bg-blue-50 dark:bg-blue-950/50 border-2 border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3.5 mb-4"
              >
                <View className="flex-row items-center gap-3">
                  <View className="bg-orange-100 dark:bg-orange-900 rounded-lg p-1.5">
                    <Ionicons
                      name="fast-food-outline"
                      size={18}
                      color={isDark ? "#FB923C" : "#EA580C"}
                    />
                  </View>
                  <View>
                    <Text className="text-black dark:text-white font-extrabold text-sm">
                      Edit Ordered Items
                    </Text>
                    <Text className="text-black dark:text-white text-xs mt-0.5">
                      {order.items.length} item
                      {order.items.length !== 1 ? "s" : ""} · Tap to modify
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isDark ? "#3c95fb" : "#0cbaea"}
                />
              </Pressable>

              {/* Regenerate Receipt */}
              <Pressable
                onPress={handleRegenerateReceipt}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
                  borderWidth: 2,
                  borderColor: isDark ? "#374151" : "#E5E7EB",
                  borderRadius: 12,
                  paddingVertical: 12,
                  marginBottom: 20,
                }}
              >
                <Ionicons
                  name="receipt-outline"
                  size={17}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isDark ? "#9CA3AF" : "#6B7280",
                  }}
                >
                  Regenerate Receipt
                </Text>
              </Pressable>

              {/* Order Type */}
              <Text className={labelClass}>Order Type</Text>
              <View className="flex-row gap-2 mb-5">
                {(["dine-in", "takeout"] as OrderType[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setOrderType(t)}
                    className={`flex-1 py-2.5 rounded-xl items-center border-2 ${orderType === t ? "bg-blue-600 border-blue-600" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
                  >
                    <Text
                      className={`text-sm font-bold ${orderType === t ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      {ORDER_TYPE_ICON[t]} {t}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Table Number */}
              {orderType === "dine-in" && (
                <>
                  <Text className={labelClass}>Table Number</Text>
                  <TextInput
                    value={tableNumber}
                    onChangeText={setTableNumber}
                    placeholder="e.g. 01"
                    placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                    className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-5"
                  />
                </>
              )}

              {/* Payment Method */}
              <Text className={labelClass}>Payment Method</Text>
              <View className="flex-row gap-2 mb-5">
                {(["Cash", "Card"] as PaymentMethod[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setPm(m)}
                    className={`flex-1 py-2.5 rounded-xl items-center border-2 ${pm === m ? "bg-blue-600 border-blue-600" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
                  >
                    <Text
                      className={`text-sm font-bold ${pm === m ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      {m}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Payment Status */}
              <Text className={labelClass}>Payment Status</Text>
              <View className="flex-row gap-2 mb-5">
                {(["Paid", "Unpaid", "Refunded"] as PaymentStatus[]).map(
                  (s) => (
                    <Pressable
                      key={s}
                      onPress={() => setPs(s)}
                      className={`flex-1 py-2.5 rounded-xl items-center border-2 ${ps === s ? "bg-blue-600 border-blue-600" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
                    >
                      <Text
                        className={`text-sm font-bold ${ps === s ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>

              {/* Discount */}
              <Text className={labelClass}>Discount</Text>
              <ChipRow
                isDark={isDark}
                selected={selectedDiscountId}
                onSelect={setSelectedDiscountId}
                options={[
                  { key: "none", label: "None" },
                  ...localDiscountTypes.map((d) => ({
                    key: d.id,
                    label: `${d.label} (${(d.rate * 100).toFixed(0)}%)`,
                  })),
                ]}
              />
              {!showAddDiscount ? (
                <TouchableOpacity
                  onPress={() => setShowAddDiscount(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 20,
                    marginTop: -12,
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color="#3B82F6"
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#3B82F6",
                      fontWeight: "700",
                    }}
                  >
                    Add Discount Type
                  </Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={{
                    backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 20,
                    marginTop: -12,
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: isDark ? "#D1D5DB" : "#374151",
                    }}
                  >
                    New Discount Type
                  </Text>
                  {addDiscountError !== "" && (
                    <Text style={{ fontSize: 11, color: "#DC2626" }}>
                      {addDiscountError}
                    </Text>
                  )}
                  <TextInput
                    value={newDiscountLabel}
                    onChangeText={setNewDiscountLabel}
                    placeholder="Label (e.g. Employee)"
                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                    style={{
                      backgroundColor: isDark ? "#111827" : "#fff",
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      fontSize: 13,
                      color: isDark ? "#fff" : "#111",
                      borderWidth: 1,
                      borderColor: isDark ? "#374151" : "#E5E7EB",
                    }}
                  />
                  <TextInput
                    value={newDiscountRate}
                    onChangeText={setNewDiscountRate}
                    placeholder="Rate % (e.g. 20)"
                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: isDark ? "#111827" : "#fff",
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      fontSize: 13,
                      color: isDark ? "#fff" : "#111",
                      borderWidth: 1,
                      borderColor: isDark ? "#374151" : "#E5E7EB",
                    }}
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={handleAddDiscount}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 10,
                        alignItems: "center",
                        backgroundColor: "#2563EB",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Add
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setShowAddDiscount(false);
                        setNewDiscountLabel("");
                        setNewDiscountRate("");
                        setAddDiscountError("");
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 10,
                        alignItems: "center",
                        backgroundColor: isDark ? "#374151" : "#E5E7EB",
                      }}
                    >
                      <Text
                        style={{
                          color: isDark ? "#D1D5DB" : "#374151",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Tax */}
              <Text className={labelClass}>Tax</Text>
              <ChipRow
                isDark={isDark}
                selected={taxMode}
                onSelect={setTaxMode}
                options={[
                  { key: "VAT", label: "VAT" },
                  { key: "Non-VAT", label: "Non-VAT (0%)" },
                ]}
              />
              {taxMode === "VAT" && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 20,
                    marginTop: -12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDark ? "#9CA3AF" : "#6B7280",
                    }}
                  >
                    VAT Rate (%):
                  </Text>
                  <TextInput
                    value={vatRateInput}
                    onChangeText={setVatRateInput}
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      fontSize: 13,
                      fontWeight: "700",
                      color: isDark ? "#fff" : "#111",
                      minWidth: 60,
                      textAlign: "center",
                    }}
                  />
                </View>
              )}

              {/* Other Charges */}
              <Text className={labelClass}>Other Charges (Optional)</Text>
              <TextInput
                value={otherChargesLabel}
                onChangeText={setOtherChargesLabel}
                placeholder="e.g. Packaging Fee, Corkage Fee"
                placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-2"
              />
              <TextInput
                value={otherChargesAmt}
                onChangeText={setOtherChargesAmt}
                keyboardType="numeric"
                placeholder="Amount (₱)"
                placeholderTextColor={isDark ? "#374151" : "#D1D5DB"}
                className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-5"
              />

              {/* Recalculated Total Preview */}
              <View
                style={{
                  backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isDark ? "#6B7280" : "#9CA3AF",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  Recalculated Total
                </Text>
                {(
                  [
                    ["Subtotal", `₱${subtotal.toFixed(2)}`],
                    activeDiscount
                      ? [
                          `Discount — ${activeDiscount.label} (${(activeDiscount.rate * 100).toFixed(0)}%)`,
                          `-₱${discountAmt.toFixed(2)}`,
                        ]
                      : null,
                    [
                      taxMode === "VAT"
                        ? `VAT (${(effectiveTaxRate * 100).toFixed(0)}%)`
                        : "Non-VAT",
                      taxMode === "VAT" ? `₱${tax.toFixed(2)}` : "₱0.00",
                    ],
                    sc > 0
                      ? [
                          otherChargesLabel.trim() || "Other Charges",
                          `₱${sc.toFixed(2)}`,
                        ]
                      : null,
                  ] as (string[] | null)[]
                )
                  .filter((r): r is string[] => Boolean(r))
                  .map(([label, value], i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 3,
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
                          color: String(value).startsWith("-")
                            ? "#DC2626"
                            : isDark
                              ? "#D1D5DB"
                              : "#374151",
                        }}
                      >
                        {value}
                      </Text>
                    </View>
                  ))}
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: isDark ? "#374151" : "#E5E7EB",
                    marginTop: 6,
                    paddingTop: 6,
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
                    TOTAL
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "900",
                      color: isDark ? "#fff" : "#111",
                    }}
                  >
                    ₱{total.toFixed(2)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View
              className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800"
              style={{ backgroundColor: isDark ? "#111827" : "#FFFFFF" }}
            >
              <Pressable
                onPress={handleSave}
                className="bg-blue-600 rounded-xl py-3.5 items-center"
              >
                <Text className="text-white font-extrabold text-sm">
                  Save Changes
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
