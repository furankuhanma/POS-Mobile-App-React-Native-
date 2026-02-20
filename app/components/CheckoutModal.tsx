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
  View,
} from "react-native";
import { ordersRepo } from "../data/Orders";
import type { CreateOrder, CreateOrderItem, PaymentMethod, OrderType } from "../types/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: number;
  variantId: number;
  name: string;
  variantName: string;
  price: number;
  qty: number;
}

interface CheckoutModalProps {
  visible: boolean;
  cart: CartItem[];
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

// ─── Constants (defined outside component — avoids css-interop JSX crash) ────

const ORDER_TYPES: { key: OrderType; label: string }[] = [
  { key: "dine-in",  label: "🍽 Dine-in"  },
  { key: "takeout",  label: "🥡 Takeout"  },
  { key: "delivery", label: "🛵 Delivery" },
];

const PAYMENT_METHODS: { key: PaymentMethod; emoji: string }[] = [
  { key: "Cash",     emoji: "💵" },
  { key: "Card",     emoji: "💳" },
  { key: "E-wallet", emoji: "📱" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let _seq = 1;
function genOrderNumber() {
  const now = new Date();
  const ymd =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  return `ORD-${ymd}-${String(_seq++).padStart(4, "0")}`;
}
function genReceiptNumber() {
  const now = new Date();
  const ym = String(now.getFullYear()) + String(now.getMonth() + 1).padStart(2, "0");
  return `RCP-${ym}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

const TAX_RATE = 0.12;
const SERVICE_RATE = 0.10;

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckoutModal({ visible, cart, onClose, onSuccess }: CheckoutModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [orderType, setOrderType]         = useState<OrderType>("dine-in");
  const [tableNumber, setTableNumber]     = useState("");
  const [discount, setDiscount]           = useState("");
  const [cashTendered, setCashTendered]   = useState("");
  const [placing, setPlacing]             = useState(false);
  const [error, setError]                 = useState("");

  const cashRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPaymentMethod("Cash");
      setOrderType("dine-in");
      setTableNumber("");
      setDiscount("");
      setCashTendered("");
      setError("");
    }
  }, [visible]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal     = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt  = Math.max(0, parseFloat(discount) || 0);
  const taxable      = Math.max(0, subtotal - discountAmt);
  const tax          = parseFloat((taxable * TAX_RATE).toFixed(2));
  const serviceCharge =
    orderType === "dine-in"
      ? parseFloat((taxable * SERVICE_RATE).toFixed(2))
      : 0;
  const total    = parseFloat((subtotal - discountAmt + tax + serviceCharge).toFixed(2));
  const tendered = parseFloat(cashTendered) || 0;
  const change   = parseFloat((tendered - total).toFixed(2));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setError("");
    if (cart.length === 0)                              { setError("Cart is empty."); return; }
    if (orderType === "dine-in" && !tableNumber.trim()) { setError("Please enter a table number."); return; }
    if (paymentMethod === "Cash" && tendered < total)   { setError(`Cash tendered (${fmt(tendered)}) is less than total (${fmt(total)}).`); return; }

    Keyboard.dismiss();
    setPlacing(true);
    try {
      const now = new Date().toISOString();
      const orderData: CreateOrder = {
        order_number:   genOrderNumber(),
        receipt_number: genReceiptNumber(),
        table_number:   orderType === "dine-in" ? (tableNumber.trim() || null) : null,
        order_type:     orderType,
        order_status:   "Preparing",
        payment_status: "Paid",
        payment_method: paymentMethod,
        subtotal,
        tax,
        discount:       discountAmt,
        service_charge: serviceCharge,
        total_amount:   total,
        cash_tendered:  paymentMethod === "Cash" ? tendered : null,
        completed_at:   null,
        status_log:     JSON.stringify([{ from: null, to: "Preparing", at: now }]),
      };

      const items: Omit<CreateOrderItem, "order_id">[] = cart.map((item) => ({
        product_variant_id: item.variantId > 0 ? item.variantId : 0,
        item_name:
          item.variantName && item.variantName !== item.name
            ? `${item.name} (${item.variantName})`
            : item.name,
        quantity:       item.qty,
        price:          item.price,
        modifiers:      "[]",
        money_tendered: paymentMethod === "Cash" ? tendered : 0,
        change:         paymentMethod === "Cash" ? Math.max(change, 0) : 0,
        subtotal:       item.qty * item.price,
      }));

      const dbId = await ordersRepo.createWithItems(orderData, items);
      onSuccess(`ORD-${String(dbId).padStart(4, "0")}`);
    } catch (e: any) {
      console.error("[Checkout] DB error:", e);
      setError(`Failed to place order: ${e?.message ?? "Unknown error"}`);
    } finally {
      setPlacing(false);
    }
  };

  // ── Small summary row ──────────────────────────────────────────────────────
  const SummaryRow = ({
    label, value, bold, red,
  }: { label: string; value: string; bold?: boolean; red?: boolean }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ fontSize: 13, color: bold ? (isDark ? "#fff" : "#111") : (isDark ? "#9CA3AF" : "#6B7280"), fontWeight: bold ? "900" : "400" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: bold ? "900" : "600", color: red ? "#DC2626" : bold ? (isDark ? "#fff" : "#111") : (isDark ? "#D1D5DB" : "#374151") }}>
        {value}
      </Text>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: isDark ? "#111827" : "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 }}>

              {/* Handle */}
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? "#374151" : "#E5E7EB" }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? "#1F2937" : "#F3F4F6" }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: isDark ? "#fff" : "#111" }}>Confirm Order</Text>
                <TouchableOpacity onPress={onClose} disabled={placing}>
                  <Ionicons name="close" size={24} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}>

                {/* ── Order Type ── */}
                <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "#6B7280" : "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Order Type</Text>
                <View style={{ flexDirection: "row", backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderRadius: 16, padding: 4, marginBottom: 16 }}>
                  {ORDER_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setOrderType(t.key)}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: orderType === t.key ? (isDark ? "#374151" : "#fff") : "transparent" }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: orderType === t.key ? "#2563EB" : (isDark ? "#6B7280" : "#9CA3AF") }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Table number ── */}
                {orderType === "dine-in" && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "#6B7280" : "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Table Number</Text>
                    <TextInput
                      value={tableNumber}
                      onChangeText={setTableNumber}
                      placeholder="e.g. T-04"
                      placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                      style={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: "600", color: isDark ? "#fff" : "#111" }}
                    />
                  </View>
                )}

                {/* ── Payment Method ── */}
                <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "#6B7280" : "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Payment Method</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                  {PAYMENT_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => setPaymentMethod(m.key)}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 2, borderColor: paymentMethod === m.key ? "#3B82F6" : (isDark ? "#374151" : "#E5E7EB"), backgroundColor: paymentMethod === m.key ? (isDark ? "#1E3A5F" : "#EFF6FF") : (isDark ? "#1F2937" : "#fff") }}
                    >
                      <Text style={{ fontSize: 20, marginBottom: 2 }}>{m.emoji}</Text>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: paymentMethod === m.key ? "#2563EB" : (isDark ? "#6B7280" : "#9CA3AF") }}>{m.key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Cash tendered ── */}
                {paymentMethod === "Cash" && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "#6B7280" : "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Cash Tendered</Text>
                    <TextInput
                      ref={cashRef}
                      value={cashTendered}
                      onChangeText={setCashTendered}
                      placeholder="0.00"
                      placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                      keyboardType="decimal-pad"
                      style={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: "600", color: isDark ? "#fff" : "#111" }}
                    />
                    {tendered > 0 && (
                      <View style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: change >= 0 ? (isDark ? "rgba(21,128,61,0.2)" : "#F0FDF4") : (isDark ? "rgba(153,27,27,0.2)" : "#FEF2F2") }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: change >= 0 ? "#16A34A" : "#DC2626" }}>
                          Change: {fmt(Math.max(change, 0))}{change < 0 ? ` (short by ${fmt(Math.abs(change))})` : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ── Discount ── */}
                <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "#6B7280" : "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Discount (₱)</Text>
                <TextInput
                  value={discount}
                  onChangeText={setDiscount}
                  placeholder="0.00"
                  placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: "600", color: isDark ? "#fff" : "#111", marginBottom: 20 }}
                />

                {/* ── Order Summary ── */}
                <View style={{ backgroundColor: isDark ? "#1F2937" : "#F9FAFB", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "#6B7280" : "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Order Summary</Text>
                  {cart.map((item) => (
                    <View key={`${item.id}-${item.variantId}`} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                      <Text style={{ fontSize: 13, color: isDark ? "#9CA3AF" : "#6B7280", flex: 1 }} numberOfLines={1}>
                        x{item.qty} {item.variantName && item.variantName !== item.name ? `${item.name} (${item.variantName})` : item.name}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#D1D5DB" : "#374151", marginLeft: 8 }}>{fmt(item.price * item.qty)}</Text>
                    </View>
                  ))}
                  <View style={{ borderTopWidth: 1, borderTopColor: isDark ? "#374151" : "#E5E7EB", marginTop: 8, paddingTop: 8 }}>
                    <SummaryRow label="Subtotal" value={fmt(subtotal)} />
                    {discountAmt > 0 && <SummaryRow label="Discount" value={`-${fmt(discountAmt)}`} red />}
                    <SummaryRow label={`Tax (${(TAX_RATE * 100).toFixed(0)}%)`} value={fmt(tax)} />
                    {serviceCharge > 0 && <SummaryRow label={`Service (${(SERVICE_RATE * 100).toFixed(0)}%)`} value={fmt(serviceCharge)} />}
                    <View style={{ borderTopWidth: 1, borderTopColor: isDark ? "#374151" : "#E5E7EB", marginTop: 4, paddingTop: 4 }}>
                      <SummaryRow label="TOTAL" value={fmt(total)} bold />
                    </View>
                  </View>
                </View>

                {/* ── Error ── */}
                {error !== "" && (
                  <View style={{ backgroundColor: isDark ? "rgba(153,27,27,0.2)" : "#FEF2F2", padding: 12, borderRadius: 12, marginBottom: 16 }}>
                    <Text style={{ color: "#DC2626", fontSize: 13, fontWeight: "600" }}>{error}</Text>
                  </View>
                )}

                {/* ── Confirm Button ── */}
                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={placing}
                  style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", marginBottom: 8, backgroundColor: placing ? "#93C5FD" : "#2563EB" }}
                >
                  {placing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
                      Confirm & Place Order — {fmt(total)}
                    </Text>
                  )}
                </TouchableOpacity>

              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}