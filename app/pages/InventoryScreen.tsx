import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Component Imports ────────────────────────────────────────────────────────
import { ProductCard } from "../components/ProductCard";
import { FilterChip } from "../components/FilterChip";
import { PaginationBar } from "../components/PaganationBar";
import { AddProductModal } from "../components/AddProductModal";
import { ProductDetailModal } from "../components/ProductDetailModal";

// ─── DB Imports ───────────────────────────────────────────────────────────────
import { productsRepo } from "../data/Products";
import { categoriesRepo } from "../data/Categories";

// ─── Inventory Types (used by AddProductModal / ProductCard) ──────────────────
import type { Product, Category } from "../types/inventory";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCategoryName = (categoryId: string, categories: Category[]): string =>
  categories.find((c) => c.id === categoryId)?.name ?? "Unknown";

const getParentCategories = (categories: Category[]): Category[] =>
  categories.filter((c) => !c.parentId);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // ─── State ──────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ─── Load from DB ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load categories from DB
      const dbCats = await categoriesRepo.getAll();

      // Map DbCategory (numeric id) → Category (string id) that AddProductModal expects
      const uiCategories: Category[] = dbCats.map((c) => ({
        id: String(c.id),
        name: c.name,
      }));

      setCategories(uiCategories);

      // Load products with variants from DB
      const dbProducts = await productsRepo.getAllWithVariants();

      // Map DbProduct + DbProductVariant → Product (inventory UI type)
      const uiProducts: Product[] = dbProducts.map((p) => ({
        id: String(p.id),
        name: p.name,
        description: p.description ?? undefined,
        categoryId: String(p.category_id),
        // Use first variant price as sellingPrice; fallback 0
        sellingPrice: p.variants[0]?.price ?? 0,
        costPrice: 0, // DB has no cost price column — stored as 0
        isArchived: false,
        createdAt: p.created_at,
        updatedAt: p.created_at,
        variants:
          p.variants.length > 0
            ? p.variants.map((v) => ({
                id: String(v.id),
                name: v.variant_name,
                // additionalPrice = variant price - base price
                additionalPrice: v.price - (p.variants[0]?.price ?? v.price),
              }))
            : undefined,
      }));

      setProducts(uiProducts);
    } catch (e) {
      console.error("[InventoryScreen] load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Save product to DB ──────────────────────────────────────────────────────

  const handleSaveProduct = async (
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ) => {
    try {
      const categoryId = parseInt(productData.categoryId, 10);

      if (selectedProduct) {
        // ── UPDATE existing product ─────────────────────────────────────────
        const dbId = parseInt(selectedProduct.id, 10);

        await productsRepo.update(dbId, {
          name: productData.name,
          description: productData.description ?? null,
          category_id: categoryId,
        });

        // Replace variants
        const variantInputs =
          productData.variants && productData.variants.length > 0
            ? productData.variants.map((v) => ({
                variant_name: v.name,
                // price = sellingPrice + additionalPrice
                price: productData.sellingPrice + (v.additionalPrice ?? 0),
              }))
            : [{ variant_name: productData.name, price: productData.sellingPrice }];

        await productsRepo.variants.replaceAll(dbId, variantInputs);
      } else {
        // ── CREATE new product ──────────────────────────────────────────────
        const created = await productsRepo.create({
          category_id: categoryId,
          name: productData.name,
          description: productData.description ?? null,
        });

        // Insert variants (at least one — the base price)
        const variantInputs =
          productData.variants && productData.variants.length > 0
            ? productData.variants.map((v) => ({
                variant_name: v.name,
                price: productData.sellingPrice + (v.additionalPrice ?? 0),
              }))
            : [{ variant_name: productData.name, price: productData.sellingPrice }];

        for (const v of variantInputs) {
          await productsRepo.variants.create({
            product_id: created.id,
            variant_name: v.variant_name,
            price: v.price,
          });
        }
      }

      // Reload from DB to reflect actual saved state
      await loadData();
    } catch (e) {
      console.error("[InventoryScreen] save error", e);
    }

    setShowAddModal(false);
    setSelectedProduct(null);
  };

  // ─── Ensure at least a "General" category exists ─────────────────────────────
  // If the DB has no categories yet, seed one so AddProductModal isn't empty.
  const ensureDefaultCategory = useCallback(async () => {
    const existing = await categoriesRepo.getAll();
    if (existing.length === 0) {
      await categoriesRepo.create({ name: "General" });
      await categoriesRepo.create({ name: "Food" });
      await categoriesRepo.create({ name: "Beverages" });
      await categoriesRepo.create({ name: "Desserts" });
      await categoriesRepo.create({ name: "Snacks" });
    }
  }, []);

  useEffect(() => {
    ensureDefaultCategory().then(() => loadData());
  }, []);

  // ─── Computed Values ─────────────────────────────────────────────────────────

  const parentCategories = useMemo(
    () => getParentCategories(categories),
    [categories],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (p.isArchived) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q))
          return false;
      }
      if (filterCategory !== "all") {
        if (p.categoryId !== filterCategory) return false;
      }
      return true;
    });
  }, [products, search, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = filterCategory !== "all" || search !== "";

  const resetFilters = () => {
    setSearch("");
    setFilterCategory("all");
    setPage(1);
  };

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-800">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <View className="px-5 pt-6 pb-4 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <View className="flex-row items-end justify-between mb-4">
          <Text className="text-2xl font-black text-gray-900 dark:text-white">
            Inventory
          </Text>
          <Pressable
            onPress={() => {
              setSelectedProduct(null);
              setShowAddModal(true);
            }}
            className="flex-row items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white">Add Product</Text>
          </Pressable>
        </View>

        {/* Count pill */}
        <View className="flex-row mb-4">
          <View className="flex-row items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <Ionicons
              name="cube-outline"
              size={16}
              color={isDark ? "#60A5FA" : "#2563EB"}
            />
            <Text className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {filtered.length} Products
            </Text>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center px-4 mb-3 bg-gray-100 dark:bg-gray-900 rounded-xl h-11">
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
          <TextInput
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1); }}
            placeholder="Search by product name or ID"
            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
            className="flex-1 ml-3 text-sm text-gray-900 dark:text-white"
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(""); setPage(1); }}>
              <Ionicons name="close-circle" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
            </Pressable>
          )}
        </View>

        {/* Filter toggle */}
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons
            name={showFilters ? "options" : "options-outline"}
            size={16}
            color={showFilters ? (isDark ? "#60A5FA" : "#2563EB") : (isDark ? "#9CA3AF" : "#6B7280")}
          />
          <Text className={`text-sm font-semibold ${showFilters ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
            {showFilters ? "Hide Filters" : "Filters"}
          </Text>
          {hasActiveFilters && (
            <View className="w-2 h-2 bg-blue-600 rounded-full dark:bg-blue-400" />
          )}
        </Pressable>
      </View>

      {/* ── Filter Panel ─────────────────────────────────────────────────────── */}
      {showFilters && (
        <View className="px-4 py-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold tracking-widest text-gray-400 uppercase dark:text-gray-500">
              Filters
            </Text>
            {hasActiveFilters && (
              <Pressable onPress={resetFilters}>
                <Text className="text-xs font-bold text-red-500">Reset All</Text>
              </Pressable>
            )}
          </View>
          <Text className="mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterChip
              label="All"
              active={filterCategory === "all"}
              onPress={() => { setFilterCategory("all"); setPage(1); }}
            />
            {parentCategories.map((cat) => (
              <FilterChip
                key={cat.id}
                label={cat.name}
                active={filterCategory === cat.id}
                onPress={() => { setFilterCategory(cat.id); setPage(1); }}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Product List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={isDark ? "#60A5FA" : "#2563EB"} />
          <Text className="mt-3 text-sm text-gray-400">Loading inventory…</Text>
        </View>
      ) : (
        <FlatList
          data={paginated}
          keyExtractor={(p) => p.id}
          contentContainerClassName="p-4 pb-4"
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              categoryName={getCategoryName(item.categoryId, categories)}
              onPress={() => handleProductPress(item)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center pt-16">
              <Ionicons
                name="cube-outline"
                size={48}
                color={isDark ? "#4B5563" : "#D1D5DB"}
              />
              <Text className="mt-4 text-base font-extrabold text-gray-700 dark:text-gray-300">
                No products found
              </Text>
              <Text className="mt-1 text-sm text-center text-gray-400 dark:text-gray-500">
                {hasActiveFilters ? "Try adjusting your filters." : "Add your first product to get started."}
              </Text>
              {hasActiveFilters && (
                <Pressable onPress={resetFilters} className="mt-5 bg-blue-600 px-6 py-2.5 rounded-xl">
                  <Text className="text-sm font-bold text-white">Clear Filters</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* ── Pagination ───────────────────────────────────────────────────────── */}
      {!loading && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          isDark={isDark}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
          pageSize={PAGE_SIZE}
        />
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <ProductDetailModal
        visible={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedProduct(null); }}
        product={selectedProduct}
        categoryName={selectedProduct ? getCategoryName(selectedProduct.categoryId, categories) : ""}
        onEdit={() => {
          setShowDetailModal(false);
          setShowAddModal(true);
        }}
        onViewHistory={() => setShowDetailModal(false)}
      />

      <AddProductModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); setSelectedProduct(null); }}
        onSave={handleSaveProduct}
        categories={categories}
        editProduct={selectedProduct}
      />
    </View>
  );
}