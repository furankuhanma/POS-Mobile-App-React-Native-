// backend/server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const port = 8082;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ── Static image serving ──────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Multer (image upload) ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads", "products");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Use product_uuid as filename so re-uploads overwrite cleanly
    const uuid = req.body.product_uuid || Date.now().toString();
    cb(null, `${uuid}.jpg`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB max

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Fr4nk@0920!905A72#",
  database: "POS",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// =============================================================================
// Existing read endpoints (unchanged)
// =============================================================================

// ── Products ──────────────────────────────────────────────────────────────────

app.get("/products", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.name AS category_name
      FROM Products p
      JOIN Categories c ON c.id = p.category_id
      ORDER BY p.name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("[/products]", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/products/:id/variants", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM ProductVariants WHERE product_id = ? ORDER BY id ASC",
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("[/products/:id/variants]", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Categories ────────────────────────────────────────────────────────────────

app.get("/categories", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM Categories ORDER BY name ASC",
    );
    res.json(rows);
  } catch (err) {
    console.error("[/categories]", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Orders ────────────────────────────────────────────────────────────────────

app.get("/orders", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM Orders ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    console.error("[/orders]", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/orders/:id/items", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM OrderItems WHERE order_id = ?",
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("[/orders/:id/items]", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/health", (req, res) => res.json({ status: "ok" }));

// =============================================================================
// NEW: Sync endpoints
// =============================================================================

// ── GET /sync/status ──────────────────────────────────────────────────────────
// SyncService pings this to confirm the server is reachable before syncing.

app.get("/sync/status", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ── POST /sync ────────────────────────────────────────────────────────────────
// Receives a batch of unsynced records from a POS terminal.
// Upserts each record by UUID and returns which UUIDs succeeded / failed.
//
// Request body:
// {
//   terminal_id:  string,
//   categories:   [{ uuid, name, created_at }],
//   products:     [{ uuid, category_uuid, name, description, cost_price, created_at }],
//   variants:     [{ uuid, product_uuid, variant_name, price, created_at }],
//   orders:       [{ uuid, order_number, receipt_number, ... }],
//   order_items:  [{ uuid, order_uuid, product_variant_uuid, item_name, ... }]
// }
//
// Response:
// {
//   ok: true,
//   synced:  { categories: [uuid], products: [uuid], variants: [uuid], orders: [uuid], order_items: [uuid] },
//   failed:  [{ uuid, table, error }]
// }

app.post("/sync", async (req, res) => {
  const {
    terminal_id,
    categories = [],
    products = [],
    variants = [],
    orders = [],
    order_items = [],
  } = req.body;

  const synced = {
    categories: [],
    products: [],
    variants: [],
    orders: [],
    order_items: [],
  };
  const failed = [];

  // Convert ISO 8601 to MySQL datetime: "2026-02-25T12:41:32.339Z" -> "2026-02-25 12:41:32"
  const toMySQL = (iso) => {
    if (!iso) return null;
    return iso.replace("T", " ").replace("Z", "").split(".")[0];
  };

  console.log(
    `[/sync] received terminal=${terminal_id} ` +
      `cats:${categories.length} prods:${products.length} ` +
      `vars:${variants.length} orders:${orders.length} items:${order_items.length}`,
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // categories
    for (const c of categories) {
      try {
        await conn.query(
          `INSERT INTO categories (uuid, terminal_id, name, created_at)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name       = VALUES(name),
             created_at = VALUES(created_at)`,
          [c.uuid, terminal_id, c.name, toMySQL(c.created_at)],
        );
        synced.categories.push(c.uuid);
      } catch (err) {
        console.error(`[/sync] categories FAIL uuid=${c.uuid}:`, err.message);
        failed.push({ uuid: c.uuid, table: "categories", error: err.message });
      }
    }

    // products
    for (const p of products) {
      try {
        await conn.query(
          `INSERT INTO products (uuid, terminal_id, category_uuid, name, description, cost_price, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             category_uuid = VALUES(category_uuid),
             name          = VALUES(name),
             description   = VALUES(description),
             cost_price    = VALUES(cost_price)`,
          [
            p.uuid,
            terminal_id,
            p.category_uuid,
            p.name,
            p.description ?? null,
            p.cost_price ?? 0,
            toMySQL(p.created_at),
          ],
        );
        synced.products.push(p.uuid);
      } catch (err) {
        console.error(`[/sync] products FAIL uuid=${p.uuid}:`, err.message);
        failed.push({ uuid: p.uuid, table: "products", error: err.message });
      }
    }

    // product_variants
    for (const v of variants) {
      try {
        await conn.query(
          `INSERT INTO product_variants (uuid, terminal_id, product_uuid, variant_name, price, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             product_uuid = VALUES(product_uuid),
             variant_name = VALUES(variant_name),
             price        = VALUES(price)`,
          [
            v.uuid,
            terminal_id,
            v.product_uuid,
            v.variant_name,
            v.price,
            toMySQL(v.created_at),
          ],
        );
        synced.variants.push(v.uuid);
      } catch (err) {
        console.error(
          `[/sync] product_variants FAIL uuid=${v.uuid}:`,
          err.message,
        );
        failed.push({
          uuid: v.uuid,
          table: "product_variants",
          error: err.message,
        });
      }
    }

    // orders
    for (const o of orders) {
      try {
        await conn.query(
          `INSERT INTO orders (
             uuid, terminal_id,
             order_number, receipt_number, table_number,
             order_type, order_status,
             payment_status, payment_method,
             subtotal, tax, discount, service_charge, total_amount,
             cash_tendered, status_log, completed_at, created_at
           ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
             order_status   = VALUES(order_status),
             payment_status = VALUES(payment_status),
             payment_method = VALUES(payment_method),
             subtotal       = VALUES(subtotal),
             tax            = VALUES(tax),
             discount       = VALUES(discount),
             service_charge = VALUES(service_charge),
             total_amount   = VALUES(total_amount),
             cash_tendered  = VALUES(cash_tendered),
             status_log     = VALUES(status_log),
             completed_at   = VALUES(completed_at)`,
          [
            o.uuid,
            terminal_id,
            o.order_number,
            o.receipt_number,
            o.table_number ?? null,
            o.order_type,
            o.order_status,
            o.payment_status,
            o.payment_method,
            o.subtotal,
            o.tax,
            o.discount,
            o.service_charge,
            o.total_amount,
            o.cash_tendered ?? null,
            o.status_log,
            toMySQL(o.completed_at),
            toMySQL(o.created_at),
          ],
        );
        synced.orders.push(o.uuid);
      } catch (err) {
        console.error(`[/sync] orders FAIL uuid=${o.uuid}:`, err.message);
        failed.push({ uuid: o.uuid, table: "orders", error: err.message });
      }
    }

    // order_items
    for (const item of order_items) {
      try {
        await conn.query(
          `INSERT INTO order_items (
             uuid, terminal_id, order_uuid, product_variant_uuid,
             item_name, quantity, price, modifiers,
             money_tendered, change_amount, subtotal
           ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
             quantity       = VALUES(quantity),
             price          = VALUES(price),
             modifiers      = VALUES(modifiers),
             money_tendered = VALUES(money_tendered),
             change_amount  = VALUES(change_amount),
             subtotal       = VALUES(subtotal)`,
          [
            item.uuid,
            terminal_id,
            item.order_uuid,
            item.product_variant_uuid ?? null,
            item.item_name,
            item.quantity,
            item.price,
            item.modifiers,
            item.money_tendered,
            item.change ?? 0,
            item.subtotal,
          ],
        );
        synced.order_items.push(item.uuid);
      } catch (err) {
        console.error(
          `[/sync] order_items FAIL uuid=${item.uuid}:`,
          err.message,
        );
        failed.push({
          uuid: item.uuid,
          table: "order_items",
          error: err.message,
        });
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error("[/sync] Transaction failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }

  console.log(
    `[/sync] done — ` +
      `cats:${synced.categories.length} prods:${synced.products.length} ` +
      `vars:${synced.variants.length} orders:${synced.orders.length} ` +
      `items:${synced.order_items.length} failed:${failed.length}`,
  );

  res.json({ ok: true, synced, failed });
});

app.post("/sync/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ ok: false, error: "No image file received" });
    }

    const { product_uuid } = req.body;
    if (!product_uuid) {
      return res
        .status(400)
        .json({ ok: false, error: "product_uuid is required" });
    }

    const image_path = `/uploads/products/${req.file.filename}`;

    // Update the MySQL Products row with the server image path
    await pool.query(
      "UPDATE products SET image_server_path = ? WHERE uuid = ?",
      [image_path, product_uuid],
    );

    console.log(`[/sync/image] ${product_uuid} → ${image_path}`);
    res.json({ ok: true, image_path });
  } catch (err) {
    console.error("[/sync/image]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================================
// Start
// =============================================================================

pool
  .getConnection()
  .then((conn) => {
    console.log("[DB] MySQL connected successfully");
    conn.release();
  })
  .catch((err) => console.error("[DB] Connection failed:", err));

app.listen(port, "0.0.0.0", () => {
  console.log(`[Server] Running on http://localhost:${port}`);
  console.log(`[Server] Uploads served from /uploads`);
});
