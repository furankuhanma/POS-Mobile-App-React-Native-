import { getDb } from "./Database";
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
  // ── Products ────────────────────────────────────────────────────────────────

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

  /**
   * Returns products joined with their variants and category name.
   * Useful for POS product listing.
   */
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

    // Group variants by product_id
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
    const db = await getDb();
    const result = await db.runAsync(
      // ✅ Now includes cost_price and image_uri
      "INSERT INTO Products (category_id, name, description, cost_price, image_uri) VALUES (?, ?, ?, ?, ?);",
      data.category_id,
      data.name,
      data.description ?? null,
      data.cost_price ?? 0,
      data.image_uri ?? null,
    );
    return (await db.getFirstAsync<DbProduct>(
      "SELECT * FROM Products WHERE id = ?;",
      result.lastInsertRowId
    ))!;
  },

  async update(id: number, data: UpdateProduct): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined)        { fields.push("name = ?");        values.push(data.name); }
    if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
    if (data.category_id !== undefined) { fields.push("category_id = ?"); values.push(data.category_id); }
    // ✅ saves cost_price and image_uri on update
    if (data.cost_price !== undefined)  { fields.push("cost_price = ?");  values.push(data.cost_price); }
    if (data.image_uri !== undefined)   { fields.push("image_uri = ?");   values.push(data.image_uri); }

    if (fields.length === 0) return;
    values.push(id);

    await db.runAsync(
      `UPDATE Products SET ${fields.join(", ")} WHERE id = ?;`,
      ...values
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    // Cascades to ProductVariants via FK
    await db.runAsync("DELETE FROM Products WHERE id = ?;", id);
  },

  async search(query: string): Promise<DbProduct[]> {
    const db = await getDb();
    return db.getAllAsync<DbProduct>(
      "SELECT * FROM Products WHERE name LIKE ? ORDER BY name ASC;",
      `%${query}%`
    );
  },

  // ── Product Variants ─────────────────────────────────────────────────────────

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
      const db = await getDb();
      const result = await db.runAsync(
        "INSERT INTO ProductVariants (product_id, variant_name, price) VALUES (?, ?, ?);",
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
      const db = await getDb();
      const fields: string[] = [];
      const values: any[] = [];

      if (data.variant_name !== undefined) { fields.push("variant_name = ?"); values.push(data.variant_name); }
      if (data.price !== undefined)        { fields.push("price = ?");        values.push(data.price); }

      if (fields.length === 0) return;
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

    /**
     * Replace all variants for a product (delete + re-insert in one transaction).
     * Handy when saving from the AddProductModal.
     */
    async replaceAll(
      productId: number,
      variants: Omit<CreateProductVariant, "product_id">[]
    ): Promise<DbProductVariant[]> {
      const db = await getDb();
      const inserted: DbProductVariant[] = [];

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          "DELETE FROM ProductVariants WHERE product_id = ?;",
          productId
        );
        for (const v of variants) {
          const r = await db.runAsync(
            "INSERT INTO ProductVariants (product_id, variant_name, price) VALUES (?, ?, ?);",
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
      });

      return inserted;
    },
  },
};