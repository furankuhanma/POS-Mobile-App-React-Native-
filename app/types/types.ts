// ─── DB Entity Types ──────────────────────────────────────────────────────────

export interface DbCategory {
  id: number;
  name: string;
  created_at: string;
}

export interface DbProduct {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  cost_price: number; // ✅ added — persisted in DB via migration v4
  image_uri: string | null; // ✅ added — compressed JPEG path, migration v5
  created_at: string;
}

export interface DbProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  price: number;
  created_at: string;
}

export type OrderStatus = "Preparing" | "Served" | "Done" | "Cancelled";
export type PaymentStatus = "Paid" | "Unpaid" | "Refunded";
export type PaymentMethod = "Cash" | "Card" | "E-wallet";
export type OrderType = "dine-in" | "takeout" | "delivery";

export interface StatusLogEntry {
  from: OrderStatus | null;
  to: OrderStatus;
  at: string;
}

export interface DbOrder {
  id: number;
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
  /** JSON-serialised StatusLogEntry[] stored as TEXT in SQLite */
  status_log: string;
  created_at: string;
}

export interface DbOrderItem {
  id: number;
  order_id: number;
  product_variant_id: number;
  item_name: string;
  quantity: number;
  price: number;
  /** JSON-serialised string[] stored as TEXT in SQLite */
  modifiers: string;
  money_tendered: number;
  change: number;
  subtotal: number;
}

// ─── Insert / Update DTOs ─────────────────────────────────────────────────────

// ✅ CreateProduct and UpdateProduct automatically include cost_price
//    because they're derived from DbProduct via Omit/Partial
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