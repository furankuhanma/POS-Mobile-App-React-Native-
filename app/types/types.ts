// ─── DB Entity Types ──────────────────────────────────────────────────────────

export interface DbCategory {
  id:         number;
  uuid:       string;         // ← stable cross-device identifier
  name:       string;
  synced:     number;         // 0 = pending, 1 = confirmed by server
  created_at: string;
}

export interface DbProduct {
  id:                 number;
  uuid:               string;
  category_id:        number;
  name:               string;
  description:        string | null;
  cost_price:         number;
  image_uri:          string | null;  // local compressed JPEG path
  image_synced:       number;         // 0 = not yet uploaded, 1 = uploaded
  image_server_path:  string | null;  // path returned by /sync/image
  synced:             number;
  created_at:         string;
}

export interface DbProductVariant {
  id:           number;
  uuid:         string;
  product_id:   number;
  variant_name: string;
  price:        number;
  synced:       number;
  created_at:   string;
}

export type OrderStatus    = "Preparing" | "Served" | "Done" | "Cancelled";
export type PaymentStatus  = "Paid" | "Unpaid" | "Refunded";
export type PaymentMethod  = "Cash" | "Card" | "E-wallet";
export type OrderType      = "dine-in" | "takeout" | "delivery";

export interface StatusLogEntry {
  from: OrderStatus | null;
  to:   OrderStatus;
  at:   string;
}

export interface DbOrder {
  id:             number;
  uuid:           string;
  order_number:   string;
  receipt_number: string;
  table_number:   string | null;
  order_type:     OrderType;
  order_status:   OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  subtotal:       number;
  tax:            number;
  discount:       number;
  service_charge: number;
  total_amount:   number;
  cash_tendered:  number | null;
  completed_at:   string | null;
  /** JSON-serialised StatusLogEntry[] stored as TEXT in SQLite */
  status_log:     string;
  synced:         number;
  created_at:     string;
}

export interface DbOrderItem {
  id:                 number;
  uuid:               string;
  order_id:           number;
  product_variant_id: number;
  item_name:          string;
  quantity:           number;
  /** JSON-serialised string[] stored as TEXT in SQLite */
  modifiers:          string;
  money_tendered:     number;
  change:             number;
  subtotal:           number;
  price:              number;
  synced:             number;
}

// ─── Sync error log ───────────────────────────────────────────────────────────

export interface DbSyncError {
  id:           number;
  table_name:   string;
  record_uuid:  string;
  payload:      string;   // JSON snapshot of the record at time of failure
  error_msg:    string;
  attempt:      number;
  last_attempt: string;
  resolved:     number;   // 0 = open, 1 = fixed
  created_at:   string;
}

// ─── Device config (key/value store) ─────────────────────────────────────────

export interface DbDeviceConfig {
  key:   string;
  value: string;
}

// ─── Sync status (for UI) ─────────────────────────────────────────────────────

export type SyncStatus =
  | "idle"
  | "syncing"
  | "up-to-date"
  | "pending"
  | "offline"
  | "error";

// ─── Insert / Update DTOs ─────────────────────────────────────────────────────

export type CreateProduct        = Omit<DbProduct,        "id" | "created_at">;
export type UpdateProduct        = Partial<CreateProduct>;

export type CreateCategory       = Omit<DbCategory,       "id" | "created_at">;
export type UpdateCategory       = Partial<CreateCategory>;

export type CreateProductVariant = Omit<DbProductVariant, "id" | "created_at">;
export type UpdateProductVariant = Partial<CreateProductVariant>;

export type CreateOrder          = Omit<DbOrder,          "id" | "created_at">;
export type UpdateOrder          = Partial<CreateOrder>;

export type CreateOrderItem      = Omit<DbOrderItem,      "id">;
export type UpdateOrderItem      = Partial<CreateOrderItem>;

// ─── Joined / Enriched Types ──────────────────────────────────────────────────

export interface ProductWithVariants extends DbProduct {
  variants:      DbProductVariant[];
  category_name: string;
}

export interface OrderWithItems extends DbOrder {
  items: DbOrderItem[];
}