import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ordersRepo } from "../data/Orders";
import type {
  CreateOrder,
  CreateOrderItem,
  DiscountType,
  OrderType,
  PaymentMethod,
  TaxConfig,
} from "../types/types";
import { DEFAULT_DISCOUNT_TYPES, DEFAULT_TAX_CONFIG } from "../types/types";
import type { ReceiptData } from "./ReceiptModal";
import { ReceiptModal } from "./ReceiptModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: number;
  variantId: number;
  name: string;
  variantName: string;
  price: number;
  qty: number;
  imageUri?: string;
}

interface CheckoutModalProps {
  visible: boolean;
  cart: CartItem[];
  onClose: () => void;
  onSuccess: (orderId: string) => void;
  /** Optional: pass custom discount types from app settings */
  discountTypes?: DiscountType[];
  /** Optional: pass custom tax config from app settings */
  taxConfig?: TaxConfig;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_TYPES: { key: OrderType; label: string }[] = [
  { key: "dine-in", label: "🍽 Dine-in" },
  { key: "takeout", label: "🥡 Takeout" },
  // "delivery" removed
];

const PAYMENT_METHODS: { key: PaymentMethod; emoji: string }[] = [
  { key: "Cash", emoji: "💵" },
  { key: "Card", emoji: "💳" },
  // "E-wallet" removed
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function genOrderNumber() {
  const now = new Date();
  const ymd =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  // last 6 digits of ms timestamp + 3-digit random = collision-proof across reloads
  const suffix =
    Date.now().toString().slice(-6) +
    String(Math.floor(Math.random() * 900) + 100);
  return `ORD-${ymd}-${suffix}`;
}
function genReceiptNumber() {
  const now = new Date();
  const ym =
    String(now.getFullYear()) + String(now.getMonth() + 1).padStart(2, "0");
  const suffix =
    Date.now().toString().slice(-5) +
    String(Math.floor(Math.random() * 90) + 10);
  return `RCP-${ym}-${suffix}`;
}

// ─── Sub-component: small dropdown chip row ───────────────────────────────────

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
        marginBottom: 16,
      }}
    >
      {options.map((o) => (
        <TouchableOpacity
          key={o.key}
          onPress={() => onSelect(o.key)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 20,
            borderWidth: 2,
            borderColor:
              selected === o.key ? "#3B82F6" : isDark ? "#374151" : "#E5E7EB",
            backgroundColor:
              selected === o.key
                ? isDark
                  ? "#1E3A5F"
                  : "#EFF6FF"
                : isDark
                  ? "#1F2937"
                  : "#fff",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color:
                selected === o.key ? "#2563EB" : isDark ? "#9CA3AF" : "#6B7280",
            }}
          >
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckoutModal({
  visible,
  cart,
  onClose,
  onSuccess,
  discountTypes = DEFAULT_DISCOUNT_TYPES,
  taxConfig = DEFAULT_TAX_CONFIG,
}: CheckoutModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { height: screenHeight } = useWindowDimensions();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [tableNumber, setTableNumber] = useState("");

  // ── Discount state ─────────────────────────────────────────────────────────
  // "none" = no discount, or one of the discountType ids
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("none");
  // Custom add-new UI
  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [newDiscountLabel, setNewDiscountLabel] = useState("");
  const [newDiscountRate, setNewDiscountRate] = useState("");
  const [localDiscountTypes, setLocalDiscountTypes] =
    useState<DiscountType[]>(discountTypes);

  // ── Tax state ──────────────────────────────────────────────────────────────
  const [taxMode, setTaxMode] = useState<"VAT" | "Non-VAT">(taxConfig.mode);
  // Allow editing the VAT rate inline
  const [vatRateInput, setVatRateInput] = useState(
    String(taxConfig.vatRate * 100),
  );

  const [cashTendered, setCashTendered] = useState("");
  const [otherChargesLabel, setOtherChargesLabel] = useState("");
  const [additionalExpense, setAdditionalExpense] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const cashRef = useRef<TextInput>(null);
  const _pendingSuccessId = useRef<string>("");

  useEffect(() => {
    if (visible) {
      setPaymentMethod("Cash");
      setOrderType("dine-in");
      setTableNumber("");
      setSelectedDiscountId("none");
      setShowAddDiscount(false);
      setNewDiscountLabel("");
      setNewDiscountRate("");
      setLocalDiscountTypes(discountTypes);
      setTaxMode(taxConfig.mode);
      setVatRateInput(String(taxConfig.vatRate * 100));
      setCashTendered("");
      setOtherChargesLabel("");
      setAdditionalExpense("");
      setError("");
      setReceipt(null);
    }
  }, [visible]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const activeDiscount =
    selectedDiscountId === "none"
      ? null
      : (localDiscountTypes.find((d) => d.id === selectedDiscountId) ?? null);
  const discountAmt = activeDiscount
    ? parseFloat((subtotal * activeDiscount.rate).toFixed(2))
    : 0;

  const taxable = Math.max(0, subtotal - discountAmt);
  const effectiveTaxRate =
    taxMode === "VAT" ? (parseFloat(vatRateInput) || 0) / 100 : 0;
  const tax = parseFloat((taxable * effectiveTaxRate).toFixed(2));

  const additionalExpenseAmt = Math.max(0, parseFloat(additionalExpense) || 0);
  const total = parseFloat(
    (subtotal - discountAmt + tax + additionalExpenseAmt).toFixed(2),
  );
  const tendered = parseFloat(cashTendered) || 0;
  const change = parseFloat((tendered - total).toFixed(2));

  // ── Add new discount type handler ──────────────────────────────────────────
  const handleAddDiscount = () => {
    const label = newDiscountLabel.trim();
    const rate = parseFloat(newDiscountRate) / 100;
    if (!label || isNaN(rate) || rate <= 0 || rate > 1) {
      setError("Enter a valid discount label and rate (1–100).");
      return;
    }
    setError("");
    const newType: DiscountType = {
      id: `custom_${Date.now()}`,
      label,
      rate,
    };
    const updated = [...localDiscountTypes, newType];
    setLocalDiscountTypes(updated);
    setSelectedDiscountId(newType.id);
    setShowAddDiscount(false);
    setNewDiscountLabel("");
    setNewDiscountRate("");
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setError("");
    if (cart.length === 0) {
      setError("Cart is empty.");
      return;
    }
    if (orderType === "dine-in" && !tableNumber.trim()) {
      setError("Please enter a table number.");
      return;
    }
    if (paymentMethod === "Cash" && tendered < total) {
      setError(
        `Cash tendered (${fmt(tendered)}) is less than total (${fmt(total)}).`,
      );
      return;
    }

    Keyboard.dismiss();
    setPlacing(true);
    try {
      const now = new Date().toISOString();
      const orderData: CreateOrder = {
        order_number: genOrderNumber(),
        receipt_number: genReceiptNumber(),
        table_number:
          orderType === "dine-in" ? tableNumber.trim() || null : null,
        order_type: orderType,
        order_status: "Preparing",
        payment_status: "Paid",
        payment_method: paymentMethod,
        subtotal,
        tax,
        discount: discountAmt,
        service_charge: additionalExpenseAmt,
        total_amount: total,
        cash_tendered: paymentMethod === "Cash" ? tendered : null,
        completed_at: null,
        status_log: JSON.stringify([{ from: null, to: "Preparing", at: now }]),
        synced: 0,
        uuid: "",
        terminal_id: "",
      } as any;

      const items: Omit<CreateOrderItem, "order_id">[] = cart.map((item) => ({
        product_variant_id: item.variantId > 0 ? item.variantId : 0,
        item_name:
          item.variantName && item.variantName !== item.name
            ? `${item.name} (${item.variantName})`
            : item.name,
        quantity: item.qty,
        price: item.price,
        modifiers: "[]",
        money_tendered: paymentMethod === "Cash" ? tendered : 0,
        change: paymentMethod === "Cash" ? Math.max(change, 0) : 0,
        subtotal: item.qty * item.price,
      }));

      const dbId = await ordersRepo.createWithItems(orderData, items);
      const orderId = `ORD-${String(dbId).padStart(4, "0")}`;

      // ── Build receipt data and show receipt screen ──
      setReceipt({
        orderNumber: orderData.order_number,
        receiptNumber: orderData.receipt_number,
        orderType,
        tableNumber:
          orderType === "dine-in" ? tableNumber.trim() || null : null,
        paymentMethod,
        items: cart.map((item) => ({
          name:
            item.variantName && item.variantName !== item.name
              ? `${item.name} (${item.variantName})`
              : item.name,
          qty: item.qty,
          price: item.price,
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
        otherChargesAmt: additionalExpenseAmt,
        total,
        cashTendered: paymentMethod === "Cash" ? tendered : null,
        change: paymentMethod === "Cash" ? Math.max(change, 0) : null,
        createdAt: new Date(),
      });

      // onSuccess is called when cashier taps "Back to Cashier"
      // store orderId for that moment
      _pendingSuccessId.current = orderId;
    } catch (e: any) {
      console.error("[Checkout] DB error:", e);
      setError(`Failed to place order: ${e?.message ?? "Unknown error"}`);
    } finally {
      setPlacing(false);
    }
  };

  // ── Summary row ────────────────────────────────────────────────────────────
  const SummaryRow = ({
    label,
    value,
    bold,
    red,
  }: {
    label: string;
    value: string;
    bold?: boolean;
    red?: boolean;
  }) => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          color: bold
            ? isDark
              ? "#fff"
              : "#111"
            : isDark
              ? "#9CA3AF"
              : "#6B7280",
          fontWeight: bold ? "900" : "400",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: bold ? "900" : "600",
          color: red
            ? "#DC2626"
            : bold
              ? isDark
                ? "#fff"
                : "#111"
              : isDark
                ? "#D1D5DB"
                : "#374151",
        }}
      >
        {value}
      </Text>
    </View>
  );

  // ── Label style helper ─────────────────────────────────────────────────────
  const sectionLabel = {
    fontSize: 11,
    fontWeight: "700" as const,
    color: isDark ? "#6B7280" : "#9CA3AF",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 8,
  };

  // ── Receipt handlers ───────────────────────────────────────────────────────
  const handleBackToCashier = () => {
    const id = _pendingSuccessId.current;
    setReceipt(null);
    onSuccess(id); // clears cart + closes modal in parent
  };

  const handlePrint = () => {
    // TODO: integrate Bluetooth thermal printer (e.g. react-native-thermal-receipt-printer)
    // For now this is a placeholder
    console.log("[Receipt] Print requested for", receipt?.receiptNumber);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Receipt screen — shown after successful order ── */}
      <ReceiptModal
        visible={receipt !== null}
        data={receipt}
        onBackToCashier={handleBackToCashier}
        onPrint={handlePrint}
      />
      {/* ── Checkout Modal ── */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
          />

          <View
            style={{
              maxHeight: screenHeight * 0.92,
              backgroundColor: isDark ? "#111827" : "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: Platform.OS === "ios" ? 32 : 16,
            }}
          >
            {/* Handle */}
            <View
              style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark ? "#374151" : "#E5E7EB",
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? "#1F2937" : "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "900",
                  color: isDark ? "#fff" : "#111",
                }}
              >
                Confirm Order
              </Text>
              <TouchableOpacity onPress={onClose} disabled={placing}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={true}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 24,
              }}
            >
              {/* ── Order Type ── */}
              <Text style={sectionLabel}>Order Type</Text>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                  borderRadius: 16,
                  padding: 4,
                  marginBottom: 16,
                }}
              >
                {ORDER_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setOrderType(t.key)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor:
                        orderType === t.key
                          ? isDark
                            ? "#374151"
                            : "#fff"
                          : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color:
                          orderType === t.key
                            ? "#2563EB"
                            : isDark
                              ? "#6B7280"
                              : "#9CA3AF",
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Table number ── */}
              {orderType === "dine-in" && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={sectionLabel}>Table Number</Text>
                  <TextInput
                    value={tableNumber}
                    onChangeText={setTableNumber}
                    placeholder="e.g. T-04"
                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                    style={{
                      backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDark ? "#fff" : "#111",
                    }}
                  />
                </View>
              )}

              {/* ── Payment Method ── */}
              <Text style={sectionLabel}>Payment Method</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setPaymentMethod(m.key)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor:
                        paymentMethod === m.key
                          ? "#3B82F6"
                          : isDark
                            ? "#374151"
                            : "#E5E7EB",
                      backgroundColor:
                        paymentMethod === m.key
                          ? isDark
                            ? "#1E3A5F"
                            : "#EFF6FF"
                          : isDark
                            ? "#1F2937"
                            : "#fff",
                    }}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 2 }}>
                      {m.emoji}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color:
                          paymentMethod === m.key
                            ? "#2563EB"
                            : isDark
                              ? "#6B7280"
                              : "#9CA3AF",
                      }}
                    >
                      {m.key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Cash tendered ── */}
              {paymentMethod === "Cash" && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={sectionLabel}>Cash Tendered</Text>
                  <TextInput
                    ref={cashRef}
                    value={cashTendered}
                    onChangeText={setCashTendered}
                    placeholder="0.00"
                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDark ? "#fff" : "#111",
                    }}
                  />
                  {tendered > 0 && (
                    <View
                      style={{
                        marginTop: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor:
                          change >= 0
                            ? isDark
                              ? "rgba(21,128,61,0.2)"
                              : "#F0FDF4"
                            : isDark
                              ? "rgba(153,27,27,0.2)"
                              : "#FEF2F2",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: change >= 0 ? "#16A34A" : "#DC2626",
                        }}
                      >
                        Change: {fmt(Math.max(change, 0))}
                        {change < 0
                          ? ` (short by ${fmt(Math.abs(change))})`
                          : ""}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── Discount (dropdown) ── */}
              <Text style={sectionLabel}>Discount</Text>
              {/* "None" chip + one chip per discount type */}
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

              {/* Add new discount type */}
              {!showAddDiscount ? (
                <TouchableOpacity
                  onPress={() => setShowAddDiscount(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 16,
                    marginTop: -6,
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
                    marginBottom: 16,
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: isDark ? "#D1D5DB" : "#374151",
                      marginBottom: 2,
                    }}
                  >
                    New Discount Type
                  </Text>
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

              {/* ── Tax (dropdown) ── */}
              <Text style={sectionLabel}>Tax</Text>
              <ChipRow
                isDark={isDark}
                selected={taxMode}
                onSelect={setTaxMode}
                options={[
                  { key: "VAT", label: "VAT" },
                  { key: "Non-VAT", label: "Non-VAT (0%)" },
                ]}
              />

              {/* Editable VAT rate when VAT is selected */}
              {taxMode === "VAT" && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                    marginTop: -6,
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
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDark ? "#6B7280" : "#9CA3AF",
                    }}
                  >
                    = {fmt(tax)} on this order
                  </Text>
                </View>
              )}

              {/* ── Other Charges (optional) ── */}
              <Text style={sectionLabel}>Other Charges (Optional)</Text>
              <TextInput
                value={otherChargesLabel}
                onChangeText={setOtherChargesLabel}
                placeholder="e.g. Packaging Fee, Corkage Fee"
                placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                style={{
                  backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 14,
                  fontWeight: "600",
                  color: isDark ? "#fff" : "#111",
                  marginBottom: 8,
                }}
              />
              <TextInput
                value={additionalExpense}
                onChangeText={setAdditionalExpense}
                placeholder="Amount (₱)"
                placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 14,
                  fontWeight: "600",
                  color: isDark ? "#fff" : "#111",
                  marginBottom: 20,
                }}
              />

              {/* ── Order Summary ── */}
              <View
                style={{
                  backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ ...sectionLabel, marginBottom: 8 }}>
                  Order Summary
                </Text>
                {cart.map((item) => (
                  <View
                    key={`${item.id}-${item.variantId}`}
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
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      x{item.qty}{" "}
                      {item.variantName && item.variantName !== item.name
                        ? `${item.name} (${item.variantName})`
                        : item.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isDark ? "#D1D5DB" : "#374151",
                        marginLeft: 8,
                      }}
                    >
                      {fmt(item.price * item.qty)}
                    </Text>
                  </View>
                ))}
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: isDark ? "#374151" : "#E5E7EB",
                    marginTop: 8,
                    paddingTop: 8,
                  }}
                >
                  <SummaryRow label="Subtotal" value={fmt(subtotal)} />
                  {discountAmt > 0 && activeDiscount && (
                    <SummaryRow
                      label={`Discount — ${activeDiscount.label} (${(activeDiscount.rate * 100).toFixed(0)}%)`}
                      value={`-${fmt(discountAmt)}`}
                      red
                    />
                  )}
                  <SummaryRow
                    label={
                      taxMode === "VAT"
                        ? `VAT (${(effectiveTaxRate * 100).toFixed(0)}%)`
                        : "Tax (Non-VAT)"
                    }
                    value={taxMode === "VAT" ? fmt(tax) : fmt(0)}
                  />
                  {additionalExpenseAmt > 0 && (
                    <SummaryRow
                      label={otherChargesLabel.trim() || "Other Charges"}
                      value={fmt(additionalExpenseAmt)}
                    />
                  )}
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: isDark ? "#374151" : "#E5E7EB",
                      marginTop: 4,
                      paddingTop: 4,
                    }}
                  >
                    <SummaryRow label="TOTAL" value={fmt(total)} bold />
                  </View>
                </View>
              </View>

              {/* Error */}
              {error !== "" && (
                <View
                  style={{
                    backgroundColor: isDark ? "rgba(153,27,27,0.2)" : "#FEF2F2",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "#DC2626",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {error}
                  </Text>
                </View>
              )}

              {/* Confirm button */}
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={placing}
                style={{
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: "center",
                  marginBottom: 8,
                  backgroundColor: placing ? "#93C5FD" : "#2563EB",
                }}
              >
                {placing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "900",
                      fontSize: 15,
                    }}
                  >
                    Confirm & Place Order — {fmt(total)}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
