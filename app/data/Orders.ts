import { getDb, generateUUID, getTerminalId } from "./Database";
import type {
  DbOrder,
  DbOrderItem,
  OrderWithItems,
  CreateOrder,
  UpdateOrder,
  CreateOrderItem,
  OrderStatus,
  StatusLogEntry,
} from "../types/types";

// ─── Orders Repository ────────────────────────────────────────────────────────

export const ordersRepo = {
  // ── Read ──────────────────────────────────────────────────────────────────────

  async getAll(): Promise<DbOrder[]> {
    const db = await getDb();
    return db.getAllAsync<DbOrder>(
      "SELECT * FROM Orders ORDER BY created_at DESC;"
    );
  },

  async getById(id: number): Promise<DbOrder | null> {
    const db = await getDb();
    return db.getFirstAsync<DbOrder>(
      "SELECT * FROM Orders WHERE id = ?;",
      id
    );
  },

  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM Orders;");
  },

  async getByOrderNumber(orderNumber: string): Promise<DbOrder | null> {
    const db = await getDb();
    return db.getFirstAsync<DbOrder>(
      "SELECT * FROM Orders WHERE order_number = ?;",
      orderNumber
    );
  },

  async getPaginated(limit: number, offset: number): Promise<DbOrder[]> {
    const db = await getDb();
    return db.getAllAsync<DbOrder>(
      "SELECT * FROM Orders ORDER BY created_at DESC LIMIT ? OFFSET ?;",
      limit,
      offset
    );
  },

  async count(): Promise<number> {
    const db  = await getDb();
    const row = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM Orders;"
    );
    return row?.n ?? 0;
  },

  async getWithItems(id: number): Promise<OrderWithItems | null> {
    const db    = await getDb();
    const order = await db.getFirstAsync<DbOrder>(
      "SELECT * FROM Orders WHERE id = ?;",
      id
    );
    if (!order) return null;
    const items = await db.getAllAsync<DbOrderItem>(
      "SELECT * FROM OrderItems WHERE order_id = ?;",
      id
    );
    return { ...order, items };
  },

  // ── Write ─────────────────────────────────────────────────────────────────────

  async createWithItems(
    orderData: CreateOrder,
    items: Omit<CreateOrderItem, "order_id">[]
  ): Promise<number> {
    const db         = await getDb();
    const terminalId = await getTerminalId(); // ← v6: identifies this POS terminal
    let   orderId    = 0;

    await db.withTransactionAsync(async () => {
      const orderUuid = generateUUID(); // ← v6: stable cross-device order ID

      const r = await db.runAsync(
        `INSERT INTO Orders (
           uuid, terminal_id,
           order_number, receipt_number, table_number,
           order_type, order_status,
           payment_status, payment_method,
           subtotal, tax, discount, service_charge, total_amount,
           cash_tendered, completed_at, status_log,
           synced
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0);`,
        orderUuid,
        terminalId,
        orderData.order_number,
        orderData.receipt_number,
        orderData.table_number    ?? null,
        orderData.order_type,
        orderData.order_status,
        orderData.payment_status,
        orderData.payment_method,
        orderData.subtotal,
        orderData.tax,
        orderData.discount,
        orderData.service_charge,
        orderData.total_amount,
        orderData.cash_tendered   ?? null,
        orderData.completed_at    ?? null,
        orderData.status_log,
      );
      orderId = r.lastInsertRowId;

      for (const item of items) {
        const itemUuid = generateUUID(); // ← v6: each order item gets its own UUID

        await db.runAsync(
          `INSERT INTO OrderItems (
             uuid, order_id, product_variant_id, item_name,
             quantity, price, modifiers,
             money_tendered, change, subtotal,
             synced
           ) VALUES (?,?,?,?,?,?,?,?,?,?,0);`,
          itemUuid,
          orderId,
          item.product_variant_id,
          item.item_name,
          item.quantity,
          item.price,
          item.modifiers,
          item.money_tendered,
          item.change,
          item.subtotal,
        );
      }
    });

    return orderId;
  },

  async update(id: number, data: UpdateOrder): Promise<void> {
    const db      = await getDb();
    const fields: string[] = [];
    const values: any[]    = [];

    const map: Array<[keyof UpdateOrder, string]> = [
      ["order_type",     "order_type = ?"],
      ["order_status",   "order_status = ?"],
      ["payment_status", "payment_status = ?"],
      ["payment_method", "payment_method = ?"],
      ["table_number",   "table_number = ?"],
      ["subtotal",       "subtotal = ?"],
      ["tax",            "tax = ?"],
      ["discount",       "discount = ?"],
      ["service_charge", "service_charge = ?"],
      ["total_amount",   "total_amount = ?"],
      ["cash_tendered",  "cash_tendered = ?"],
      ["completed_at",   "completed_at = ?"],
      ["status_log",     "status_log = ?"],
    ];

    for (const [key, sql] of map) {
      if (data[key] !== undefined) {
        fields.push(sql);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return;

    // Any update means MySQL row is stale — reset synced
    fields.push("synced = ?");
    values.push(0);

    values.push(id);
    await db.runAsync(
      `UPDATE Orders SET ${fields.join(", ")} WHERE id = ?;`,
      ...values
    );
  },

  async updateStatus(
    id: number,
    newStatus: OrderStatus,
    currentStatusLog: string
  ): Promise<void> {
    const db    = await getDb();
    const order = await db.getFirstAsync<Pick<DbOrder, "order_status">>(
      "SELECT order_status FROM Orders WHERE id = ?;",
      id
    );
    if (!order) return;

    const log: StatusLogEntry[] = JSON.parse(currentStatusLog || "[]");
    log.push({
      from: order.order_status,
      to:   newStatus,
      at:   new Date().toISOString(),
    });

    const isTerminal  = newStatus === "Done" || newStatus === "Cancelled";
    const completedAt = isTerminal ? new Date().toISOString() : null;

    await db.runAsync(
      `UPDATE Orders
       SET order_status = ?,
           status_log   = ?,
           completed_at = COALESCE(?, completed_at),
           synced       = 0
       WHERE id = ?;`,
      newStatus,
      JSON.stringify(log),
      completedAt,
      id
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM Orders WHERE id = ?;", id);
  },

  // ── Filters ───────────────────────────────────────────────────────────────────

  async filter(opts: {
    search?:        string;
    orderStatus?:   string;
    paymentStatus?: string;
    paymentMethod?: string;
    orderType?:     string;
    dateFrom?:      string;
    dateTo?:        string;
  }): Promise<DbOrder[]> {
    const db      = await getDb();
    const clauses: string[] = [];
    const values:  any[]    = [];

    if (opts.search) {
      clauses.push("(order_number LIKE ? OR receipt_number LIKE ?)");
      values.push(`%${opts.search}%`, `%${opts.search}%`);
    }
    if (opts.orderStatus   && opts.orderStatus   !== "All") { clauses.push("order_status = ?");   values.push(opts.orderStatus); }
    if (opts.paymentStatus && opts.paymentStatus !== "All") { clauses.push("payment_status = ?"); values.push(opts.paymentStatus); }
    if (opts.paymentMethod && opts.paymentMethod !== "All") { clauses.push("payment_method = ?"); values.push(opts.paymentMethod); }
    if (opts.orderType     && opts.orderType     !== "All") { clauses.push("order_type = ?");     values.push(opts.orderType); }
    if (opts.dateFrom && opts.dateTo) {
      clauses.push("date(created_at) BETWEEN date(?) AND date(?)");
      values.push(opts.dateFrom, opts.dateTo);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return db.getAllAsync<DbOrder>(
      `SELECT * FROM Orders ${where} ORDER BY created_at DESC;`,
      ...values
    );
  },

  // ── Analytics ─────────────────────────────────────────────────────────────────

  async totalRevenue(from?: string, to?: string): Promise<number> {
    const db    = await getDb();
    const extra = from && to
      ? "AND date(created_at) BETWEEN date(?) AND date(?)"
      : "";
    const params: any[] = from && to ? [from, to] : [];
    const row = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(total_amount) AS total FROM Orders
       WHERE payment_status = 'Paid' ${extra};`,
      ...params
    );
    return row?.total ?? 0;
  },

  async topSellingItems(
    limit = 5,
    from?: string,
    to?:   string
  ): Promise<{ item_name: string; total_qty: number }[]> {
    const db    = await getDb();
    const extra = from && to
      ? "AND date(o.created_at) BETWEEN date(?) AND date(?)"
      : "";
    const params: any[] = from && to ? [from, to, limit] : [limit];
    return db.getAllAsync(
      `SELECT oi.item_name, SUM(oi.quantity) AS total_qty
       FROM OrderItems oi
       JOIN Orders o ON o.id = oi.order_id
       WHERE o.payment_status = 'Paid' ${extra}
       GROUP BY oi.item_name
       ORDER BY total_qty DESC
       LIMIT ?;`,
      ...params
    );
  },

  // ── Order Items ───────────────────────────────────────────────────────────────

  items: {
    async getByOrder(orderId: number): Promise<DbOrderItem[]> {
      const db = await getDb();
      return db.getAllAsync<DbOrderItem>(
        "SELECT * FROM OrderItems WHERE order_id = ?;",
        orderId
      );
    },

    async replaceAll(
      orderId: number,
      items: Omit<CreateOrderItem, "order_id">[]
    ): Promise<void> {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          "DELETE FROM OrderItems WHERE order_id = ?;",
          orderId
        );

        for (const item of items) {
          const uuid = generateUUID(); // ← v6

          await db.runAsync(
            `INSERT INTO OrderItems (
               uuid, order_id, product_variant_id, item_name,
               quantity, price, modifiers,
               money_tendered, change, subtotal,
               synced
             ) VALUES (?,?,?,?,?,?,?,?,?,?,0);`,
            uuid,
            orderId,
            item.product_variant_id,
            item.item_name,
            item.quantity,
            item.price,
            item.modifiers,
            item.money_tendered,
            item.change,
            item.subtotal,
          );
        }

        // Parent order is now stale in MySQL — reset its synced flag too
        await db.runAsync(
          "UPDATE Orders SET synced = 0 WHERE id = ?;",
          orderId
        );
      });
    },

    async delete(id: number): Promise<void> {
      const db = await getDb();
      await db.runAsync("DELETE FROM OrderItems WHERE id = ?;", id);
    },
  },
};