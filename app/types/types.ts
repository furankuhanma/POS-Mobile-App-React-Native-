// ─── DB Entity Types ──────────────────────────────────────────────────────────

export interface DbCategory {
  id: number;
  uuid: string;
  name: string;
  synced: number;
  created_at: string;
}

export interface DbProduct {
  id: number;
  uuid: string;
  category_id: number;
  name: string;
  description: string | null;
  cost_price: number;
  image_uri: string | null;
  image_synced: number;
  image_server_path: string | null;
  synced: number;
  created_at: string;
}

export interface DbProductVariant {
  id: number;
  uuid: string;
  product_id: number;
  variant_name: string;
  price: number;
  synced: number;
  created_at: string;
}

export type OrderStatus = "Preparing" | "Served" | "Done" | "Cancelled";
export type PaymentStatus = "Paid" | "Unpaid" | "Refunded";
export type PaymentMethod = "Cash" | "Card"; // ← removed "E-wallet"
export type OrderType = "dine-in" | "takeout"; // ← removed "delivery"

// ─── Discount & Tax Config ────────────────────────────────────────────────────

export interface DiscountType {
  id: string; // e.g. "senior"
  label: string; // e.g. "Senior Citizen"
  rate: number; // e.g. 0.20
}

export type TaxMode = "VAT" | "Non-VAT";

export interface TaxConfig {
  mode: TaxMode;
  /** VAT rate (default 0.12).  Non-VAT → 0 */
  vatRate: number;
}

export const DEFAULT_DISCOUNT_TYPES: DiscountType[] = [
  { id: "senior", label: "Senior Citizen", rate: 0.15 },
  { id: "pwd", label: "PWD", rate: 0.2 },
];

export const DEFAULT_TAX_CONFIG: TaxConfig = {
  mode: "VAT",
  vatRate: 0.12,
};

// ─── Status log ───────────────────────────────────────────────────────────────

export interface StatusLogEntry {
  from: OrderStatus | null;
  to: OrderStatus;
  at: string;
}

export interface DbOrder {
  id: number;
  uuid: string;
  order_number: string;
  receipt_number: string;
  table_number: string | null;
  order_type: OrderType;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  tax: number;
  discount: number;
  service_charge: number;
  total_amount: number;
  cash_tendered: number | null;
  completed_at: string | null;
  status_log: string;
  synced: number;
  created_at: string;
}

export interface DbOrderItem {
  id: number;
  uuid: string;
  order_id: number;
  product_variant_id: number;
  item_name: string;
  quantity: number;
  modifiers: string;
  money_tendered: number;
  change: number;
  subtotal: number;
  price: number;
  synced: number;
}

// ─── Sync error log ───────────────────────────────────────────────────────────

export interface DbSyncError {
  id: number;
  table_name: string;
  record_uuid: string;
  payload: string;
  error_msg: string;
  attempt: number;
  last_attempt: string;
  resolved: number;
  created_at: string;
}

export interface DbDeviceConfig {
  key: string;
  value: string;
}

export type SyncStatus =
  | "idle"
  | "syncing"
  | "up-to-date"
  | "pending"
  | "offline"
  | "error";

// ─── Insert / Update DTOs ─────────────────────────────────────────────────────

export type CreateProduct = Omit<DbProduct, "id" | "created_at">;
export type UpdateProduct = Partial<CreateProduct>;

export type CreateCategory = Omit<DbCategory, "id" | "created_at">;
export type UpdateCategory = Partial<CreateCategory>;

export type CreateProductVariant = Omit<DbProductVariant, "id" | "created_at">;
export type UpdateProductVariant = Partial<CreateProductVariant>;

export type CreateOrder = Omit<DbOrder, "id" | "created_at">;
export type UpdateOrder = Partial<CreateOrder>;

export type CreateOrderItem = Omit<DbOrderItem, "id">;
export type UpdateOrderItem = Partial<CreateOrderItem>;

// ─── Joined / Enriched Types ──────────────────────────────────────────────────

export interface ProductWithVariants extends DbProduct {
  variants: DbProductVariant[];
  category_name: string;
}

export interface OrderWithItems extends DbOrder {
  items: DbOrderItem[];
}
