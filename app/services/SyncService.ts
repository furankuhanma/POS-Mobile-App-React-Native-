// =============================================================================
// app/services/SyncService.ts
// =============================================================================

import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";
import { Platform } from "react-native";
import { getDb, getDeviceConfig, getTerminalId } from "../data/Database";
import type {
  DbCategory,
  DbOrder,
  DbOrderItem,
  DbProduct,
  DbProductVariant,
  DbSyncError,
  SyncStatus,
} from "../types/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const SYNC_INTERVAL_MS = 30_000;
const MAX_RETRY_ATTEMPTS = 5;
const BATCH_SIZE = 50;
const STATUS_CHECK_TIMEOUT = 5_000;

// ─── Internal state ───────────────────────────────────────────────────────────

let _status: SyncStatus = "idle";
let _intervalHandle: ReturnType<typeof setInterval> | null = null;
let _isSyncing = false;
const _listeners: Set<(s: SyncStatus) => void> = new Set();

// =============================================================================
// Status management
// =============================================================================

function setStatus(s: SyncStatus) {
  if (_status === s) return;
  _status = s;
  _listeners.forEach((fn) => fn(s));
}

// =============================================================================
// Public API
// =============================================================================

export const SyncService = {
  start() {
    // Sync is a no-op on web — no SQLite, no file system
    if (Platform.OS === "web") return;
    if (_intervalHandle) return;
    console.log("[Sync] Background worker started");
    this.syncNow();
    _intervalHandle = setInterval(() => this.syncNow(), SYNC_INTERVAL_MS);
  },

  stop() {
    if (_intervalHandle) {
      clearInterval(_intervalHandle);
      _intervalHandle = null;
    }
    console.log("[Sync] Background worker stopped");
  },

  async syncNow(): Promise<void> {
    if (Platform.OS === "web") return;
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      const online = await isOnline();
      if (!online) {
        setStatus("offline");
        return;
      }

      const hasPending = await hasPendingRecords();
      if (!hasPending) {
        setStatus("up-to-date");
        return;
      }

      setStatus("syncing");

      await syncDataBatch();
      await syncPendingImages();
      await retrySyncErrors();

      const stillPending = await hasPendingRecords();
      setStatus(stillPending ? "pending" : "up-to-date");
    } catch (err) {
      console.error("[Sync] syncNow failed:", err);
      setStatus("error");
    } finally {
      _isSyncing = false;
    }
  },

  getStatus(): SyncStatus {
    return _status;
  },

  async getPendingCount(): Promise<number> {
    if (Platform.OS === "web") return 0;
    return countPendingRecords();
  },

  onStatusChange(fn: (status: SyncStatus) => void): () => void {
    _listeners.add(fn);
    fn(_status);
    return () => _listeners.delete(fn);
  },
};

// =============================================================================
// Internet detection
// =============================================================================

async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected || !state.isInternetReachable) return false;

    const apiBase = await getApiBase();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STATUS_CHECK_TIMEOUT);

    try {
      const res = await fetch(`${apiBase}/sync/status`, {
        signal: controller.signal,
      });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

// =============================================================================
// Pending record checks
// =============================================================================

async function hasPendingRecords(): Promise<boolean> {
  return (await countPendingRecords()) > 0;
}

async function countPendingRecords(): Promise<number> {
  const db = await getDb();
  if (!db) return 0; // web guard

  const queries = [
    "SELECT COUNT(*) AS n FROM Categories      WHERE synced = 0",
    "SELECT COUNT(*) AS n FROM Products        WHERE synced = 0",
    "SELECT COUNT(*) AS n FROM ProductVariants WHERE synced = 0",
    "SELECT COUNT(*) AS n FROM Orders          WHERE synced = 0",
    "SELECT COUNT(*) AS n FROM OrderItems      WHERE synced = 0",
    "SELECT COUNT(*) AS n FROM Products        WHERE image_synced = 0 AND image_uri IS NOT NULL",
  ];

  let total = 0;
  for (const sql of queries) {
    const row = await db.getFirstAsync<{ n: number }>(sql);
    total += row?.n ?? 0;
  }
  return total;
}

// =============================================================================
// Main data sync batch
// =============================================================================

async function syncDataBatch(): Promise<void> {
  const db = await getDb();
  if (!db) return; // web guard

  const terminalId = await getTerminalId();
  const apiBase = await getApiBase();

  const [categories, products, variants, orders, orderItems] =
    await Promise.all([
      db.getAllAsync<DbCategory>(
        `SELECT * FROM Categories WHERE synced = 0 LIMIT ${BATCH_SIZE};`,
      ),
      db.getAllAsync<DbProduct>(
        `SELECT * FROM Products WHERE synced = 0 LIMIT ${BATCH_SIZE};`,
      ),
      db.getAllAsync<DbProductVariant>(
        `SELECT pv.* FROM ProductVariants pv WHERE pv.synced = 0 LIMIT ${BATCH_SIZE};`,
      ),
      db.getAllAsync<DbOrder>(
        `SELECT * FROM Orders WHERE synced = 0 LIMIT ${BATCH_SIZE};`,
      ),
      db.getAllAsync<DbOrderItem>(
        `SELECT * FROM OrderItems WHERE synced = 0 LIMIT ${BATCH_SIZE};`,
      ),
    ]);

  if (
    !categories.length &&
    !products.length &&
    !variants.length &&
    !orders.length &&
    !orderItems.length
  )
    return;

  const [allCats, allProds, allVariants, allOrders] = await Promise.all([
    db.getAllAsync<{ id: number; uuid: string }>(
      "SELECT id, uuid FROM Categories;",
    ),
    db.getAllAsync<{ id: number; uuid: string }>(
      "SELECT id, uuid FROM Products;",
    ),
    db.getAllAsync<{ id: number; uuid: string }>(
      "SELECT id, uuid FROM ProductVariants;",
    ),
    db.getAllAsync<{ id: number; uuid: string }>(
      "SELECT id, uuid FROM Orders;",
    ),
  ]);

  const catUuidMap = new Map(allCats.map((r) => [r.id, r.uuid]));
  const prodUuidMap = new Map(allProds.map((r) => [r.id, r.uuid]));
  const variantUuidMap = new Map(allVariants.map((r) => [r.id, r.uuid]));
  const orderUuidMap = new Map(allOrders.map((r) => [r.id, r.uuid]));

  const payload = {
    terminal_id: terminalId,
    categories: categories.map((c) => ({
      uuid: c.uuid,
      local_id: c.id,
      name: c.name,
      created_at: c.created_at,
    })),
    products: products.map((p) => ({
      uuid: p.uuid,
      local_id: p.id,
      category_uuid: catUuidMap.get(p.category_id) ?? "",
      name: p.name,
      description: p.description,
      cost_price: p.cost_price,
      created_at: p.created_at,
    })),
    variants: variants.map((v) => ({
      uuid: v.uuid,
      local_id: v.id,
      product_uuid: prodUuidMap.get(v.product_id) ?? "",
      variant_name: v.variant_name,
      price: v.price,
      created_at: v.created_at,
    })),
    orders: orders.map((o) => ({
      uuid: o.uuid,
      local_id: o.id,
      order_number: o.order_number,
      receipt_number: o.receipt_number,
      table_number: o.table_number,
      order_type: o.order_type,
      order_status: o.order_status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      subtotal: o.subtotal,
      tax: o.tax,
      discount: o.discount,
      service_charge: o.service_charge,
      total_amount: o.total_amount,
      cash_tendered: o.cash_tendered,
      status_log: o.status_log,
      completed_at: o.completed_at,
      created_at: o.created_at,
    })),
    order_items: orderItems.map((item) => ({
      uuid: item.uuid,
      local_id: item.id,
      order_uuid: orderUuidMap.get(item.order_id) ?? "",
      product_variant_uuid: item.product_variant_id
        ? (variantUuidMap.get(item.product_variant_id) ?? null)
        : null,
      item_name: item.item_name,
      quantity: item.quantity,
      price: item.price,
      modifiers: item.modifiers,
      money_tendered: item.money_tendered,
      change: item.change,
      subtotal: item.subtotal,
    })),
  };

  let response: Response;
  try {
    response = await fetch(`${apiBase}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (networkErr: any) {
    await logSyncError(
      db,
      "network",
      "batch",
      JSON.stringify(payload),
      networkErr.message,
    );
    throw networkErr;
  }

  if (!response.ok) {
    const text = await response.text();
    await logSyncError(
      db,
      "network",
      "batch",
      JSON.stringify(payload),
      `HTTP ${response.status}: ${text}`,
    );
    throw new Error(`Sync API returned ${response.status}`);
  }

  const result = (await response.json()) as {
    ok: boolean;
    synced: {
      categories: string[];
      products: string[];
      variants: string[];
      orders: string[];
      order_items: string[];
    };
    failed: { uuid: string; table: string; error: string }[];
  };

  await db.withTransactionAsync(async () => {
    await markSynced(db, "Categories", result.synced.categories);
    await markSynced(db, "Products", result.synced.products);
    await markSynced(db, "ProductVariants", result.synced.variants);
    await markSynced(db, "Orders", result.synced.orders);
    await markSynced(db, "OrderItems", result.synced.order_items);
  });

  for (const failure of result.failed) {
    const originalPayload = findPayloadItem(
      payload,
      failure.table,
      failure.uuid,
    );
    await logSyncError(
      db,
      failure.table,
      failure.uuid,
      JSON.stringify(originalPayload),
      failure.error,
    );
  }

  console.log(
    `[Sync] Batch done — cats:${result.synced.categories.length} prods:${result.synced.products.length} vars:${result.synced.variants.length} orders:${result.synced.orders.length} items:${result.synced.order_items.length} failed:${result.failed.length}`,
  );
}

// =============================================================================
// Image sync
// =============================================================================

async function syncPendingImages(): Promise<void> {
  const db = await getDb();
  if (!db) return; // web guard

  const terminalId = await getTerminalId();
  const apiBase = await getApiBase();

  const products = await db.getAllAsync<{ uuid: string; image_uri: string }>(
    `SELECT uuid, image_uri FROM Products WHERE image_synced = 0 AND image_uri IS NOT NULL LIMIT ${BATCH_SIZE};`,
  );

  for (const product of products) {
    try {
      let fileExists = false;
      try {
        const fileInfo = await FileSystem.getInfoAsync(product.image_uri);
        fileExists = fileInfo.exists;
      } catch {
        fileExists = false;
      }

      if (!fileExists) {
        await db.runAsync(
          "UPDATE Products SET image_synced = 1 WHERE uuid = ?;",
          product.uuid,
        );
        continue;
      }

      const formData = new FormData();
      formData.append("product_uuid", product.uuid);
      formData.append("terminal_id", terminalId);
      formData.append("image", {
        uri: product.image_uri,
        name: `${product.uuid}.jpg`,
        type: "image/jpeg",
      } as any);

      const response = await fetch(`${apiBase}/sync/image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const result = (await response.json()) as {
        ok: boolean;
        image_path: string;
      };
      if (result.ok) {
        await db.runAsync(
          `UPDATE Products SET image_synced = 1, image_server_path = ? WHERE uuid = ?;`,
          result.image_path,
          product.uuid,
        );
      }
    } catch (err: any) {
      await logSyncError(
        db,
        "Products.image",
        product.uuid,
        product.image_uri,
        err.message,
      );
    }
  }
}

// =============================================================================
// Retry previously failed records
// =============================================================================

async function retrySyncErrors(): Promise<void> {
  const db = await getDb();
  if (!db) return; // web guard

  const apiBase = await getApiBase();
  const terminalId = await getTerminalId();

  const errors = await db.getAllAsync<DbSyncError>(
    `SELECT * FROM sync_errors WHERE resolved = 0 AND attempt < ? ORDER BY last_attempt ASC LIMIT 20;`,
    MAX_RETRY_ATTEMPTS,
  );

  if (!errors.length) return;

  for (const syncErr of errors) {
    try {
      let retryOk = false;

      if (syncErr.table_name === "Products.image") {
        const fileInfo = await FileSystem.getInfoAsync(syncErr.payload);
        if (!fileInfo.exists) {
          await db.runAsync(
            "UPDATE sync_errors SET resolved = 1 WHERE id = ?;",
            syncErr.id,
          );
          await db.runAsync(
            "UPDATE Products SET image_synced = 1 WHERE uuid = ?;",
            syncErr.record_uuid,
          );
          continue;
        }

        const formData = new FormData();
        formData.append("product_uuid", syncErr.record_uuid);
        formData.append("terminal_id", terminalId);
        formData.append("image", {
          uri: syncErr.payload,
          name: `${syncErr.record_uuid}.jpg`,
          type: "image/jpeg",
        } as any);

        const res = await fetch(`${apiBase}/sync/image`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          await db.runAsync(
            "UPDATE Products SET image_synced = 1, image_server_path = ? WHERE uuid = ?;",
            data.image_path,
            syncErr.record_uuid,
          );
          retryOk = true;
        }
      } else {
        const singlePayload = buildSingleRecordPayload(
          syncErr.table_name,
          syncErr.payload,
          terminalId,
        );
        const res = await fetch(`${apiBase}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(singlePayload),
        });

        if (res.ok) {
          const data = await res.json();
          const tableKey = tableNameToSyncKey(syncErr.table_name);
          retryOk =
            data.synced?.[tableKey]?.includes(syncErr.record_uuid) ?? false;
          if (retryOk)
            await markSynced(db, syncErr.table_name, [syncErr.record_uuid]);
        }
      }

      if (retryOk) {
        await db.runAsync(
          "UPDATE sync_errors SET resolved = 1 WHERE id = ?;",
          syncErr.id,
        );
      } else {
        await db.runAsync(
          `UPDATE sync_errors SET attempt = attempt + 1, last_attempt = datetime('now'), error_msg = 'Retry failed' WHERE id = ?;`,
          syncErr.id,
        );
      }
    } catch (retryErr: any) {
      await db.runAsync(
        `UPDATE sync_errors SET attempt = attempt + 1, last_attempt = datetime('now'), error_msg = ? WHERE id = ?;`,
        retryErr.message,
        syncErr.id,
      );
    }
  }
}

// =============================================================================
// SQLite helpers
// =============================================================================

async function markSynced(
  db: any,
  tableName: string,
  uuids: string[],
): Promise<void> {
  if (!uuids.length) return;
  for (const uuid of uuids) {
    await db.runAsync(
      `UPDATE ${tableName} SET synced = 1 WHERE uuid = ?;`,
      uuid,
    );
  }
}

async function logSyncError(
  db: any,
  tableName: string,
  recordUuid: string,
  payload: string,
  errorMsg: string,
): Promise<void> {
  try {
    const existing: any = await db.getFirstAsync(
      "SELECT id FROM sync_errors WHERE record_uuid = ? AND table_name = ? AND resolved = 0;",
      recordUuid,
      tableName,
    );
    if (existing) {
      await db.runAsync(
        `UPDATE sync_errors SET attempt = attempt + 1, last_attempt = datetime('now'), error_msg = ? WHERE id = ?;`,
        errorMsg,
        existing.id,
      );
    } else {
      await db.runAsync(
        `INSERT INTO sync_errors (table_name, record_uuid, payload, error_msg) VALUES (?, ?, ?, ?);`,
        tableName,
        recordUuid,
        payload,
        errorMsg,
      );
    }
  } catch (e) {
    console.error("[Sync] Failed to log sync error:", e);
  }
}

// =============================================================================
// Utility helpers
// =============================================================================

async function getApiBase(): Promise<string> {
  return (
    (await getDeviceConfig("api_base_url")) ??
    "https://frank-loui-lapore-hp-probook-640-g1.tail11c2e9.ts.net"
  );
}

function findPayloadItem(payload: any, tableName: string, uuid: string): any {
  const key = tableNameToSyncKey(tableName);
  return payload[key]?.find((item: any) => item.uuid === uuid) ?? { uuid };
}

function tableNameToSyncKey(tableName: string): string {
  const map: Record<string, string> = {
    categories: "categories",
    products: "products",
    product_variants: "variants",
    ProductVariants: "variants",
    orders: "orders",
    order_items: "order_items",
    OrderItems: "order_items",
  };
  return map[tableName] ?? tableName.toLowerCase();
}

function buildSingleRecordPayload(
  tableName: string,
  payloadJson: string,
  terminalId: string,
): Record<string, any> {
  const record = JSON.parse(payloadJson);
  const key = tableNameToSyncKey(tableName);
  return { terminal_id: terminalId, [key]: [record] };
}
