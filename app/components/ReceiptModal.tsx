import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  orderNumber: string;
  receiptNumber: string;
  orderType: string;
  tableNumber?: string | null;
  paymentMethod: string;
  items: ReceiptItem[];
  subtotal: number;
  discountLabel?: string | null; // e.g. "Senior Citizen (20%)"
  discountAmt: number;
  taxLabel: string; // e.g. "VAT (12%)" or "Non-VAT"
  taxAmt: number;
  otherChargesLabel: string; // e.g. "Packaging Fee"
  otherChargesAmt: number;
  total: number;
  cashTendered?: number | null;
  change?: number | null;
  createdAt: Date;
}

interface ReceiptModalProps {
  visible: boolean;
  data: ReceiptData | null;
  onBackToCashier: () => void;
  onPrint: () => void;
  /** Override the "Back to Cashier" button label — e.g. "Close Receipt" in edit context */
  backLabel?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function formatDateTime(d: Date) {
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Dashed divider ───────────────────────────────────────────────────────────

function Dashes({ isDark }: { isDark: boolean }) {
  return (
    <Text
      style={{
        color: isDark ? "#374151" : "#D1D5DB",
        fontSize: 11,
        letterSpacing: 2,
        textAlign: "center",
        marginVertical: 10,
      }}
    >
      {"- - - - - - - - - - - - - - - - - - - - - - -"}
    </Text>
  );
}

// ─── Receipt row ──────────────────────────────────────────────────────────────

function ReceiptRow({
  label,
  value,
  bold,
  red,
  large,
  isDark,
}: {
  label: string;
  value: string;
  bold?: boolean;
  red?: boolean;
  large?: boolean;
  isDark: boolean;
}) {
  const baseColor = isDark ? "#D1D5DB" : "#374151";
  const mutedColor = isDark ? "#9CA3AF" : "#6B7280";
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: large ? 5 : 3,
      }}
    >
      <Text
        style={{
          fontSize: large ? 15 : 13,
          fontWeight: bold ? "900" : "400",
          color: bold ? (isDark ? "#fff" : "#111") : mutedColor,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: large ? 15 : 13,
          fontWeight: bold ? "900" : "600",
          color: red
            ? "#DC2626"
            : bold
              ? isDark
                ? "#fff"
                : "#111"
              : baseColor,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReceiptModal({
  visible,
  data,
  onBackToCashier,
  onPrint,
  backLabel = "Back to Cashier",
}: ReceiptModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!data) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
        }}
      >
        {/* ── Top bar ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: Platform.OS === "ios" ? 56 : 40,
            paddingBottom: 16,
            paddingHorizontal: 20,
            backgroundColor: isDark ? "#111827" : "#fff",
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#1F2937" : "#E5E7EB",
          }}
        >
          {/* Green success badge */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#16A34A",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="checkmark" size={22} color="#fff" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: isDark ? "#fff" : "#111",
            }}
          >
            Order Placed!
          </Text>
        </View>

        {/* ── Receipt scroll area ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: "center",
            paddingVertical: 24,
            paddingHorizontal: 16,
          }}
        >
          {/* ── Receipt card ── */}
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              backgroundColor: isDark ? "#1F2937" : "#fff",
              borderRadius: 16,
              paddingHorizontal: 24,
              paddingVertical: 28,
              // Subtle shadow for paper feel
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.4 : 0.1,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {/* Store header */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: isDark ? "#fff" : "#111",
                textAlign: "center",
                letterSpacing: 0.5,
              }}
            >
              Janzehn's Grill House
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: isDark ? "#9CA3AF" : "#6B7280",
                textAlign: "center",
                marginTop: 2,
              }}
            >
              Official Receipt
            </Text>

            <Dashes isDark={isDark} />

            {/* Order meta */}
            <View style={{ gap: 4 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? "#9CA3AF" : "#6B7280",
                  }}
                >
                  Receipt #
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isDark ? "#D1D5DB" : "#374151",
                  }}
                >
                  {data.receiptNumber}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? "#9CA3AF" : "#6B7280",
                  }}
                >
                  Order #
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isDark ? "#D1D5DB" : "#374151",
                  }}
                >
                  {data.orderNumber}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? "#9CA3AF" : "#6B7280",
                  }}
                >
                  Date & Time
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isDark ? "#D1D5DB" : "#374151",
                  }}
                >
                  {formatDateTime(data.createdAt)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? "#9CA3AF" : "#6B7280",
                  }}
                >
                  Order Type
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isDark ? "#D1D5DB" : "#374151",
                    textTransform: "capitalize",
                  }}
                >
                  {data.orderType}
                  {data.orderType === "dine-in" && data.tableNumber
                    ? ` · Table ${data.tableNumber}`
                    : ""}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? "#9CA3AF" : "#6B7280",
                  }}
                >
                  Payment
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isDark ? "#D1D5DB" : "#374151",
                  }}
                >
                  {data.paymentMethod}
                </Text>
              </View>
            </View>

            <Dashes isDark={isDark} />

            {/* Items */}
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
              Items Ordered
            </Text>
            {data.items.map((item, i) => (
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
                    flex: 1,
                  }}
                  numberOfLines={2}
                >
                  x{item.qty} {item.name}
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

            <Dashes isDark={isDark} />

            {/* Totals */}
            <ReceiptRow
              isDark={isDark}
              label="Subtotal"
              value={fmt(data.subtotal)}
            />
            {data.discountAmt > 0 && data.discountLabel && (
              <ReceiptRow
                isDark={isDark}
                label={`Discount (${data.discountLabel})`}
                value={`-${fmt(data.discountAmt)}`}
                red
              />
            )}
            <ReceiptRow
              isDark={isDark}
              label={data.taxLabel}
              value={fmt(data.taxAmt)}
            />
            {data.otherChargesAmt > 0 && (
              <ReceiptRow
                isDark={isDark}
                label={data.otherChargesLabel || "Other Charges"}
                value={fmt(data.otherChargesAmt)}
              />
            )}

            {/* Total line */}
            <View
              style={{
                borderTopWidth: 1.5,
                borderTopColor: isDark ? "#374151" : "#E5E7EB",
                marginTop: 8,
                paddingTop: 8,
              }}
            >
              <ReceiptRow
                isDark={isDark}
                label="TOTAL"
                value={fmt(data.total)}
                bold
                large
              />
            </View>

            {/* Cash / Change — only for Cash payments */}
            {data.paymentMethod === "Cash" &&
              data.cashTendered != null &&
              data.cashTendered > 0 && (
                <View
                  style={{
                    marginTop: 6,
                    backgroundColor: isDark
                      ? "rgba(21,128,61,0.15)"
                      : "#F0FDF4",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    gap: 4,
                  }}
                >
                  <ReceiptRow
                    isDark={isDark}
                    label="Cash Tendered"
                    value={fmt(data.cashTendered)}
                  />
                  <ReceiptRow
                    isDark={isDark}
                    label="Change"
                    value={fmt(Math.max(data.change ?? 0, 0))}
                    bold
                  />
                </View>
              )}

            <Dashes isDark={isDark} />

            {/* Footer */}
            <Text
              style={{
                fontSize: 12,
                color: isDark ? "#6B7280" : "#9CA3AF",
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              Thank you for dining with us!{"\n"}
              <Text style={{ fontStyle: "italic" }}>
                — Janzehn's Grill House
              </Text>
            </Text>
          </View>

          {/* Bottom spacing so buttons don't overlap last line */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Fixed bottom action buttons ── */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: isDark ? "#111827" : "#fff",
            borderTopWidth: 1,
            borderTopColor: isDark ? "#1F2937" : "#E5E7EB",
            paddingHorizontal: 20,
            paddingTop: 14,
            // respect home indicator / Android nav bar
            paddingBottom: Math.max(
              insets.bottom,
              Platform.OS === "ios" ? 16 : 12,
            ),
            gap: 10,
          }}
        >
          {/* Print Receipt */}
          <TouchableOpacity
            onPress={onPrint}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: "#2563EB",
              backgroundColor: isDark ? "#1E3A5F" : "#EFF6FF",
            }}
          >
            <Ionicons name="print-outline" size={18} color="#2563EB" />
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#2563EB" }}>
              Print Receipt
            </Text>
          </TouchableOpacity>

          {/* Back to Cashier */}
          <TouchableOpacity
            onPress={onBackToCashier}
            style={{
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: "#2563EB",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#fff" }}>
              {backLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
