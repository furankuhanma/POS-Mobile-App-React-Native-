import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";

// ─── UUID Helper ──────────────────────────────────────────────────────────────
export function generateUUID(): string {
  return Crypto.randomUUID();
}

// ─── Open DB ──────────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("pos.db");
  await _db.execAsync("PRAGMA journal_mode = WAL;");
  await _db.execAsync("PRAGMA foreign_keys = ON;");
  return _db;
}

// ─── Device Config Helpers ────────────────────────────────────────────────────

export async function getDeviceConfig(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM device_config WHERE key = ?;",
    key,
  );
  return row?.value ?? null;
}

export async function setDeviceConfig(
  key: string,
  value: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO device_config (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                    updated_at = excluded.updated_at;`,
    key,
    value,
  );
}

export async function getTerminalId(): Promise<string> {
  return (await getDeviceConfig("terminal_uuid")) ?? "unknown-terminal";
}

// ─── Migration type ───────────────────────────────────────────────────────────
type Migration = string | string[];

// ─── Migrations ───────────────────────────────────────────────────────────────

const MIGRATIONS: Migration[] = [
  // ── v1 — initial schema ──────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS Categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS Products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES Categories(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    description TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ProductVariants (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id   INTEGER NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
    variant_name TEXT    NOT NULL,
    price        REAL    NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS Orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number   TEXT    NOT NULL UNIQUE,
    order_type     TEXT    NOT NULL DEFAULT 'dine-in',
    payment_status TEXT    NOT NULL DEFAULT 'Unpaid',
    payment_method TEXT    NOT NULL DEFAULT 'Cash',
    total_amount   REAL    NOT NULL DEFAULT 0,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS OrderItems (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            INTEGER NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
    product_variant_id  INTEGER NOT NULL REFERENCES ProductVariants(id),
    quantity            INTEGER NOT NULL DEFAULT 1,
    price               REAL    NOT NULL DEFAULT 0,
    money_tendered      REAL    NOT NULL DEFAULT 0,
    change              REAL    NOT NULL DEFAULT 0,
    subtotal            REAL    NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS _migrations (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,

  // ── v2 — full Order fields ───────────────────────────────────────────────
  [
    `ALTER TABLE Orders ADD COLUMN receipt_number TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE Orders ADD COLUMN table_number   TEXT`,
    `ALTER TABLE Orders ADD COLUMN order_status   TEXT NOT NULL DEFAULT 'Preparing'`,
    `ALTER TABLE Orders ADD COLUMN subtotal       REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE Orders ADD COLUMN tax            REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE Orders ADD COLUMN discount       REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE Orders ADD COLUMN service_charge REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE Orders ADD COLUMN cash_tendered  REAL`,
    `ALTER TABLE Orders ADD COLUMN completed_at   TEXT`,
    `ALTER TABLE Orders ADD COLUMN status_log     TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE OrderItems ADD COLUMN item_name  TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE OrderItems ADD COLUMN modifiers  TEXT NOT NULL DEFAULT '[]'`,
  ],

  // ── v3 — make product_variant_id nullable ────────────────────────────────
  `
  PRAGMA foreign_keys = OFF;

  CREATE TABLE IF NOT EXISTS OrderItems_new (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            INTEGER NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
    product_variant_id  INTEGER,
    item_name           TEXT    NOT NULL DEFAULT '',
    quantity            INTEGER NOT NULL DEFAULT 1,
    price               REAL    NOT NULL DEFAULT 0,
    modifiers           TEXT    NOT NULL DEFAULT '[]',
    money_tendered      REAL    NOT NULL DEFAULT 0,
    change              REAL    NOT NULL DEFAULT 0,
    subtotal            REAL    NOT NULL DEFAULT 0
  );

  INSERT INTO OrderItems_new
    (id, order_id, product_variant_id, item_name, quantity, price, modifiers,
     money_tendered, change, subtotal)
  SELECT
    id, order_id, product_variant_id, item_name, quantity, price, modifiers,
    money_tendered, change, subtotal
  FROM OrderItems;

  DROP TABLE OrderItems;
  ALTER TABLE OrderItems_new RENAME TO OrderItems;

  PRAGMA foreign_keys = ON;
  `,

  // ── v4 — cost_price ──────────────────────────────────────────────────────
  `ALTER TABLE Products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0`,

  // ── v5 — image_uri ───────────────────────────────────────────────────────
  `ALTER TABLE Products ADD COLUMN image_uri TEXT`,

  // ── v6 — UUID + synced flags + sync infrastructure ───────────────────────
  [
    `ALTER TABLE Categories ADD COLUMN uuid   TEXT    NOT NULL DEFAULT ''`,
    `ALTER TABLE Categories ADD COLUMN synced INTEGER NOT NULL DEFAULT 0`,
    `UPDATE Categories SET uuid = lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random()%4)+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) WHERE uuid = ''`,

    `ALTER TABLE Products ADD COLUMN uuid              TEXT    NOT NULL DEFAULT ''`,
    `ALTER TABLE Products ADD COLUMN synced            INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE Products ADD COLUMN image_synced      INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE Products ADD COLUMN image_server_path TEXT`,
    `UPDATE Products SET uuid = lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random()%4)+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) WHERE uuid = ''`,
    `UPDATE Products SET image_synced = 1 WHERE image_uri IS NULL`,

    `ALTER TABLE ProductVariants ADD COLUMN uuid   TEXT    NOT NULL DEFAULT ''`,
    `ALTER TABLE ProductVariants ADD COLUMN synced INTEGER NOT NULL DEFAULT 0`,
    `UPDATE ProductVariants SET uuid = lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random()%4)+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) WHERE uuid = ''`,

    `ALTER TABLE Orders ADD COLUMN uuid        TEXT    NOT NULL DEFAULT ''`,
    `ALTER TABLE Orders ADD COLUMN synced      INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE Orders ADD COLUMN terminal_id TEXT    NOT NULL DEFAULT 'terminal-1'`,
    `UPDATE Orders SET uuid = lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random()%4)+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) WHERE uuid = ''`,

    `ALTER TABLE OrderItems ADD COLUMN uuid   TEXT    NOT NULL DEFAULT ''`,
    `ALTER TABLE OrderItems ADD COLUMN synced INTEGER NOT NULL DEFAULT 0`,
    `UPDATE OrderItems SET uuid = lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random()%4)+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) WHERE uuid = ''`,

    `CREATE TABLE IF NOT EXISTS sync_errors (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name   TEXT    NOT NULL,
      record_uuid  TEXT    NOT NULL,
      payload      TEXT    NOT NULL,
      error_msg    TEXT    NOT NULL DEFAULT '',
      attempt      INTEGER NOT NULL DEFAULT 1,
      last_attempt TEXT    NOT NULL DEFAULT (datetime('now')),
      resolved     INTEGER NOT NULL DEFAULT 0
    )`,

    `CREATE TABLE IF NOT EXISTS device_config (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `INSERT OR IGNORE INTO device_config (key, value) VALUES ('terminal_uuid', lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random()%4)+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))))`,
    `INSERT OR IGNORE INTO device_config (key, value) VALUES ('api_base_url', 'https://frank-loui-lapore-hp-probook-640-g1.tail11c2e9.ts.net')`,

    `CREATE INDEX IF NOT EXISTS idx_orders_synced          ON Orders(synced)`,
    `CREATE INDEX IF NOT EXISTS idx_orderitems_synced      ON OrderItems(synced)`,
    `CREATE INDEX IF NOT EXISTS idx_products_synced        ON Products(synced)`,
    `CREATE INDEX IF NOT EXISTS idx_products_image_synced  ON Products(image_synced)`,
    `CREATE INDEX IF NOT EXISTS idx_productvariants_synced ON ProductVariants(synced)`,
    `CREATE INDEX IF NOT EXISTS idx_categories_synced      ON Categories(synced)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_errors_resolved   ON sync_errors(resolved)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_uuid          ON Orders(uuid)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_orderitems_uuid      ON OrderItems(uuid)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_uuid        ON Products(uuid)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_productvariants_uuid ON ProductVariants(uuid)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_uuid      ON Categories(uuid)`,
  ],
];

// ─── Migrations Runner ────────────────────────────────────────────────────────

export async function runMigrations(): Promise<void> {
  const db = await getDb();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const rows = await db.getAllAsync<{ version: number }>(
    "SELECT version FROM _migrations ORDER BY version;",
  );
  const appliedVersions = new Set(rows.map((r) => r.version));

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const version = i + 1;
    if (appliedVersions.has(version)) continue;

    const migration = MIGRATIONS[i];

    await db.withTransactionAsync(async () => {
      if (Array.isArray(migration)) {
        for (const sql of migration) {
          await db.execAsync(sql);
        }
      } else {
        await db.execAsync(migration);
      }
      await db.runAsync(
        "INSERT INTO _migrations (version) VALUES (?);",
        version,
      );
    });

    console.log(`[DB] Migration v${version} applied.`);
  }
}
