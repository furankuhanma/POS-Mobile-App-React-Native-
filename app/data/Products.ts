import { getDb, generateUUID } from "./Database";
import type {
  DbProduct,
  DbProductVariant,
  ProductWithVariants,
  CreateProduct,
  UpdateProduct,
  CreateProductVariant,
  UpdateProductVariant,
} from "../types/types";

// ─── Products Repository ──────────────────────────────────────────────────────

export const productsRepo = {
  // ── Products ─────────────────────────────────────────────────────────────────

  async getAll(): Promise<DbProduct[]> {
    const db = await getDb();
    return db.getAllAsync<DbProduct>(
      "SELECT * FROM Products ORDER BY name ASC;"
    );
  },

  async getById(id: number): Promise<DbProduct | null> {
    const db = await getDb();
    return db.getFirstAsync<DbProduct>(
      "SELECT * FROM Products WHERE id = ?;",
      id
    );
  },

  async getByCategory(categoryId: number): Promise<DbProduct[]> {
    const db = await getDb();
    return db.getAllAsync<DbProduct>(
      "SELECT * FROM Products WHERE category_id = ? ORDER BY name ASC;",
      categoryId
    );
  },

  async getAllWithVariants(): Promise<ProductWithVariants[]> {
    const db = await getDb();

    const products = await db.getAllAsync<DbProduct & { category_name: string }>(
      `SELECT p.*, c.name AS category_name
       FROM Products p
       JOIN Categories c ON c.id = p.category_id
       ORDER BY p.name ASC;`
    );

    const variants = await db.getAllAsync<DbProductVariant>(
      "SELECT * FROM ProductVariants ORDER BY id ASC;"
    );

    const variantMap = new Map<number, DbProductVariant[]>();
    for (const v of variants) {
      if (!variantMap.has(v.product_id)) variantMap.set(v.product_id, []);
      variantMap.get(v.product_id)!.push(v);
    }

    return products.map((p: any) => ({
      ...p,
      variants: variantMap.get(p.id) ?? [],
    }));
  },

  async create(data: CreateProduct): Promise<DbProduct> {
    const db   = await getDb();
    const uuid = generateUUID(); // ← v6: UUID assigned at creation

    const result = await db.runAsync(
      `INSERT INTO Products
         (uuid, category_id, name, description, cost_price, image_uri,
          synced, image_synced)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?);`,
      uuid,
      data.category_id,
      data.name,
      data.description ?? null,
      data.cost_price  ?? 0,
      data.image_uri   ?? null,
      // If no image, mark image_synced=1 immediately — nothing to upload
      data.image_uri ? 0 : 1,
    );

    return (await db.getFirstAsync<DbProduct>(
      "SELECT * FROM Products WHERE id = ?;",
      result.lastInsertRowId
    ))!;
  },

  async update(id: number, data: UpdateProduct): Promise<void> {
    const db      = await getDb();
    const fields: string[] = [];
    const values: any[]    = [];

    if (data.name        !== undefined) { fields.push("name = ?");        values.push(data.name); }
    if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
    if (data.category_id !== undefined) { fields.push("category_id = ?"); values.push(data.category_id); }
    if (data.cost_price  !== undefined) { fields.push("cost_price = ?");  values.push(data.cost_price); }

    // When image_uri changes, reset image_synced so the new image gets uploaded
    if (data.image_uri !== undefined) {
      fields.push("image_uri = ?");
      values.push(data.image_uri);

      if (data.image_uri) {
        // New image provided — mark for upload, clear old server path
        fields.push("image_synced = ?");      values.push(0);
        fields.push("image_server_path = ?"); values.push(null);
      } else {
        // Image removed — nothing to upload
        fields.push("image_synced = ?");      values.push(1);
        fields.push("image_server_path = ?"); values.push(null);
      }
    }

    // Any field update means the MySQL row is stale — reset synced
    fields.push("synced = ?");
    values.push(0);

    if (fields.length === 1) return; // only synced=0 was going to be set, nothing real changed
    values.push(id);

    await db.runAsync(
      `UPDATE Products SET ${fields.join(", ")} WHERE id = ?;`,
      ...values
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM Products WHERE id = ?;", id);
  },

  async search(query: string): Promise<DbProduct[]> {
    const db = await getDb();
    return db.getAllAsync<DbProduct>(
      "SELECT * FROM Products WHERE name LIKE ? ORDER BY name ASC;",
      `%${query}%`
    );
  },

  // ── Product Variants ──────────────────────────────────────────────────────────

  variants: {
    async getByProduct(productId: number): Promise<DbProductVariant[]> {
      const db = await getDb();
      return db.getAllAsync<DbProductVariant>(
        "SELECT * FROM ProductVariants WHERE product_id = ? ORDER BY id ASC;",
        productId
      );
    },

    async getById(id: number): Promise<DbProductVariant | null> {
      const db = await getDb();
      return db.getFirstAsync<DbProductVariant>(
        "SELECT * FROM ProductVariants WHERE id = ?;",
        id
      );
    },

    async create(data: CreateProductVariant): Promise<DbProductVariant> {
      const db   = await getDb();
      const uuid = generateUUID(); // ← v6

      const result = await db.runAsync(
        `INSERT INTO ProductVariants (uuid, product_id, variant_name, price, synced)
         VALUES (?, ?, ?, ?, 0);`,
        uuid,
        data.product_id,
        data.variant_name,
        data.price
      );

      return (await db.getFirstAsync<DbProductVariant>(
        "SELECT * FROM ProductVariants WHERE id = ?;",
        result.lastInsertRowId
      ))!;
    },

    async update(id: number, data: UpdateProductVariant): Promise<void> {
      const db      = await getDb();
      const fields: string[] = [];
      const values: any[]    = [];

      if (data.variant_name !== undefined) { fields.push("variant_name = ?"); values.push(data.variant_name); }
      if (data.price        !== undefined) { fields.push("price = ?");        values.push(data.price); }

      // Reset synced so MySQL gets the updated price/name
      fields.push("synced = ?");
      values.push(0);

      if (fields.length === 1) return;
      values.push(id);

      await db.runAsync(
        `UPDATE ProductVariants SET ${fields.join(", ")} WHERE id = ?;`,
        ...values
      );
    },

    async delete(id: number): Promise<void> {
      const db = await getDb();
      await db.runAsync("DELETE FROM ProductVariants WHERE id = ?;", id);
    },

    async replaceAll(
      productId: number,
      variants: Omit<CreateProductVariant, "product_id">[]
    ): Promise<DbProductVariant[]> {
      const db       = await getDb();
      const inserted: DbProductVariant[] = [];

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          "DELETE FROM ProductVariants WHERE product_id = ?;",
          productId
        );

        for (const v of variants) {
          const uuid = generateUUID(); // ← v6: every new variant gets a UUID
          const r = await db.runAsync(
            `INSERT INTO ProductVariants (uuid, product_id, variant_name, price, synced)
             VALUES (?, ?, ?, ?, 0);`,
            uuid,
            productId,
            v.variant_name,
            v.price
          );
          const row = await db.getFirstAsync<DbProductVariant>(
            "SELECT * FROM ProductVariants WHERE id = ?;",
            r.lastInsertRowId
          );
          if (row) inserted.push(row);
        }

        // Mark parent product as unsynced so MySQL gets the updated variant set
        await db.runAsync(
          "UPDATE Products SET synced = 0 WHERE id = ?;",
          productId
        );
      });

      return inserted;
    },
  },
};