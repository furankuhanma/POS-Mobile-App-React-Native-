/**
 * exportOrders.ts
 *
 * Generates an .xlsx file from order history and saves/shares it via
 * expo-file-system + expo-sharing.
 *
 * Install: npx expo install xlsx expo-file-system expo-sharing
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { utils, write } from "xlsx";
import type { Order } from "../components/OrderRow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtNum = (n: number) => Number(n.toFixed(2));

const itemsSummary = (order: Order): string =>
  order.items.map((i) => `x${i.quantity} ${i.name}`).join(", ");

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportOrdersToExcel(orders: Order[]): Promise<void> {
  // ── Build rows ──────────────────────────────────────────────────────────────
  const headers = [
    "Order ID",
    "Receipt #",
    "Date",
    "Order Type",
    "Table",
    "Order Status",
    "Payment Method",
    "Payment Status",
    "Subtotal (₱)",
    "Tax (₱)",
    "Discount (₱)",
    "Service Charge (₱)",
    "Total (₱)",
    "Cash Tendered (₱)",
    "Items",
  ];

  const rows = orders.map((o) => [
    o.id,                          // ✅ correct field — Order.id
    o.receiptNumber ?? "",
    o.createdAt ?? "",
    o.orderType,
    o.tableNumber ?? "",
    o.orderStatus,
    o.paymentMethod,
    o.paymentStatus,
    fmtNum(o.subtotal),
    fmtNum(o.tax),
    fmtNum(o.discount),
    fmtNum(o.serviceCharge),
    fmtNum(o.total),
    o.cashTendered != null ? fmtNum(o.cashTendered) : "",
    itemsSummary(o),
  ]);

  // ── Build worksheet ─────────────────────────────────────────────────────────
  const ws = utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = [
    { wch: 22 }, // Order ID
    { wch: 18 }, // Receipt #
    { wch: 22 }, // Date
    { wch: 12 }, // Order Type
    { wch: 8  }, // Table
    { wch: 14 }, // Order Status
    { wch: 16 }, // Payment Method
    { wch: 14 }, // Payment Status
    { wch: 14 }, // Subtotal
    { wch: 10 }, // Tax
    { wch: 10 }, // Discount
    { wch: 16 }, // Service Charge
    { wch: 12 }, // Total
    { wch: 16 }, // Cash Tendered
    { wch: 50 }, // Items
  ];

  // ── Build workbook ──────────────────────────────────────────────────────────
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Order History");

  // ── Write to base64 ─────────────────────────────────────────────────────────
  const base64 = write(wb, { type: "base64", bookType: "xlsx" });

  // ── Save to device ──────────────────────────────────────────────────────────
  // ── Save to device using SDK 54 expo-file-system API ─────────────────────
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `OrderHistory_${date}.xlsx`;

  // Convert base64 → binary string → Uint8Array so file.write() gets raw bytes
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const file = new File(Paths.cache, fileName);
  file.write(bytes); // SDK 54 write() accepts Uint8Array for binary files

  // ── Share / open ────────────────────────────────────────────────────────────
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Save or share your Order History",
    UTI: "com.microsoft.excel.xlsx",
  });
}