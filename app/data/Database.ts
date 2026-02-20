import * as SQLite from "expo-sqlite";

// ─── Open DB ──────────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("pos.db");
  await _db.execAsync("PRAGMA journal_mode = WAL;");
  await _db.execAsync("PRAGMA foreign_keys = ON;");
  return _db;
}

// ─── Migrations ───────────────────────────────────────────────────────────────

const MIGRATIONS: string[] = [
  // v1 — initial schema
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

  // v2 — full Order fields needed by the Order History UI
  `
  ALTER TABLE Orders ADD COLUMN receipt_number   TEXT    NOT NULL DEFAULT '';
  ALTER TABLE Orders ADD COLUMN table_number     TEXT;
  ALTER TABLE Orders ADD COLUMN order_status     TEXT    NOT NULL DEFAULT 'Preparing';
  ALTER TABLE Orders ADD COLUMN subtotal         REAL    NOT NULL DEFAULT 0;
  ALTER TABLE Orders ADD COLUMN tax              REAL    NOT NULL DEFAULT 0;
  ALTER TABLE Orders ADD COLUMN discount         REAL    NOT NULL DEFAULT 0;
  ALTER TABLE Orders ADD COLUMN service_charge   REAL    NOT NULL DEFAULT 0;
  ALTER TABLE Orders ADD COLUMN cash_tendered    REAL;
  ALTER TABLE Orders ADD COLUMN completed_at     TEXT;
  ALTER TABLE Orders ADD COLUMN status_log       TEXT    NOT NULL DEFAULT '[]';

  ALTER TABLE OrderItems ADD COLUMN item_name    TEXT    NOT NULL DEFAULT '';
  ALTER TABLE OrderItems ADD COLUMN modifiers    TEXT    NOT NULL DEFAULT '[]';
  `,

  // v3 — make product_variant_id nullable so orders can be placed for
  //       products that were added without an explicit variant assignment.
  //       SQLite does not support ALTER COLUMN, so we recreate the table.
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
    (id, order_id, product_variant_id, item_name, quantity, price, modifiers, money_tendered, change, subtotal)
  SELECT
    id, order_id, product_variant_id, item_name, quantity, price, modifiers, money_tendered, change, subtotal
  FROM OrderItems;

  DROP TABLE OrderItems;
  ALTER TABLE OrderItems_new RENAME TO OrderItems;

  PRAGMA foreign_keys = ON;
  `,
];

export async function runMigrations(): Promise<void> {
  const db = await getDb();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const rows = await db.getAllAsync<{ version: number }>(
    "SELECT version FROM _migrations ORDER BY version;"
  );
  const appliedVersions = new Set(rows.map((r) => r.version));

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const version = i + 1;
    if (appliedVersions.has(version)) continue;

    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[i]);
      await db.runAsync(
        "INSERT INTO _migrations (version) VALUES (?);",
        version
      );
    });

    console.log(`[DB] Migration v${version} applied.`);
  }
}