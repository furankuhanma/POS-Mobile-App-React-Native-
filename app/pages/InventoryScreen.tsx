import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Component Imports ────────────────────────────────────────────────────────
import { MetricCard } from "../components/MetricCard";
import { ProductCard } from "../components/ProductCard";
import { FilterChip } from "../components/FilterChip";
import { PaginationBar } from "../components/PaganationBar";
import { AddProductModal } from "../components/AddProductModal";
import { StockAdjustmentModal } from "../components/StockAdjustmentModal";
import { StockHistoryModal } from "../components/StockHistoryModal";
import { ProductDetailModal } from "../components/ProductDetailModal";

// ─── Type & Data Imports ──────────────────────────────────────────────────────
import type {
  Product,
  Category,
  StockMovement,
  MovementType,
} from "../types/inventory";
import {
  formatCurrency,
  getInventoryMetrics,
  isLowStock,
  isOutOfStock,
} from "../types/inventory";
import {
  MOCK_PRODUCTS,
  MOCK_CATEGORIES,
  MOCK_STOCK_MOVEMENTS,
} from "../data/mockInventory";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

// ─── Helper Functions ─────────────────────────────────────────────────────────

const getCategoryName = (
  categoryId: string,
  categories: Category[],
): string => {
  const category = categories.find((c) => c.id === categoryId);
  return category?.name || "Unknown";
};

const getParentCategories = (categories: Category[]): Category[] => {
  return categories.filter((c) => !c.parentId);
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // ─── State ──────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [categories] = useState<Category[]>(MOCK_CATEGORIES);
  const [stockMovements, setStockMovements] =
    useState<StockMovement[]>(MOCK_STOCK_MOVEMENTS);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<StockFilter>("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // ─── Computed Values ────────────────────────────────────────────────────────

  const metrics = useMemo(() => getInventoryMetrics(products), [products]);

  const parentCategories = useMemo(
    () => getParentCategories(categories),
    [categories],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (p.isArchived) return false;

      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.id.toLowerCase().includes(q)
        )
          return false;
      }

      if (filterCategory !== "all") {
        // Check if product's category matches OR if it's a child of selected parent category
        const productCategory = categories.find((c) => c.id === p.categoryId);
        if (
          p.categoryId !== filterCategory &&
          productCategory?.parentId !== filterCategory
        ) {
          return false;
        }
      }

      if (filterStock === "low-stock" && !isLowStock(p)) return false;
      if (filterStock === "out-of-stock" && !isOutOfStock(p)) return false;
      if (filterStock === "in-stock" && (isLowStock(p) || isOutOfStock(p)))
        return false;

      return true;
    });
  }, [products, search, filterCategory, filterStock, categories]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters =
    filterCategory !== "all" || filterStock !== "all" || search !== "";

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const resetFilters = () => {
    setSearch("");
    setFilterCategory("all");
    setFilterStock("all");
    setPage(1);
  };

  // ── Product Management ──────────────────────────────────────────────────────

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowAddModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowAddModal(true);
  };

  const handleSaveProduct = (
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ) => {
    const now = new Date().toISOString();

    if (selectedProduct) {
      // Edit existing product
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, ...productData, updatedAt: now }
            : p,
        ),
      );
    } else {
      // Add new product
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        ...productData,
        createdAt: now,
        updatedAt: now,
      };
      setProducts((prev) => [newProduct, ...prev]);

      // Log initial stock as STOCK_IN
      if (newProduct.quantityOnHand > 0) {
        const movement: StockMovement = {
          id: `mov-${Date.now()}`,
          productId: newProduct.id,
          type: "STOCK_IN",
          quantityChange: newProduct.quantityOnHand,
          previousQuantity: 0,
          newQuantity: newProduct.quantityOnHand,
          createdAt: now,
          notes: "Initial stock",
        };
        setStockMovements((prev) => [movement, ...prev]);
      }
    }

    setShowAddModal(false);
    setSelectedProduct(null);
  };

  // ── Stock Adjustment ────────────────────────────────────────────────────────

  const handleAdjustStock = (
    productId: string,
    variantId: string | undefined,
    quantityChange: number,
    type: MovementType,
    notes?: string,
  ) => {
    const now = new Date().toISOString();

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;

        if (variantId && p.variants) {
          // Update variant stock
          const updatedVariants = p.variants.map((v) => {
            if (v.id !== variantId) return v;
            const newQty = v.quantityOnHand + quantityChange;

            // Log movement for variant
            const movement: StockMovement = {
              id: `mov-${Date.now()}-${Math.random()}`,
              productId,
              variantId,
              type,
              quantityChange,
              previousQuantity: v.quantityOnHand,
              newQuantity: newQty,
              createdAt: now,
              notes,
            };
            setStockMovements((prev) => [movement, ...prev]);

            return { ...v, quantityOnHand: newQty };
          });

          // Recalculate total product quantity
          const totalQty = updatedVariants.reduce(
            (sum, v) => sum + v.quantityOnHand,
            0,
          );

          return {
            ...p,
            variants: updatedVariants,
            quantityOnHand: totalQty,
            updatedAt: now,
          };
        } else {
          // Update product stock
          const newQty = p.quantityOnHand + quantityChange;

          // Log movement
          const movement: StockMovement = {
            id: `mov-${Date.now()}`,
            productId,
            type,
            quantityChange,
            previousQuantity: p.quantityOnHand,
            newQuantity: newQty,
            createdAt: now,
            notes,
          };
          setStockMovements((prev) => [movement, ...prev]);

          return {
            ...p,
            quantityOnHand: newQty,
            updatedAt: now,
          };
        }
      }),
    );
  };

  // ── Product Actions ─────────────────────────────────────────────────────────

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleArchiveProduct = (productId: string) => {
    const now = new Date().toISOString();
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isArchived: true, updatedAt: now } : p,
      ),
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-800">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <View className="px-5 pt-6 pb-4 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <View className="flex-row items-end justify-between mb-4">
          <Text className="text-2xl font-black text-gray-900 dark:text-white">
            Inventory
          </Text>
          <Pressable
            onPress={handleAddProduct}
            className="flex-row items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white">Add Product</Text>
          </Pressable>
        </View>

        {/* Metric Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 mb-4 -mx-5"
        >
          <View className="flex-row gap-3">
            <View className="w-40">
              <MetricCard
                icon="cube-outline"
                label="Total Products"
                value={metrics.totalProducts}
                iconColor="#2563EB"
                iconBg="bg-blue-100 dark:bg-blue-900/40"
              />
            </View>
            <View className="w-40">
              <MetricCard
                icon="cash-outline"
                label="Total Value"
                value={formatCurrency(metrics.totalValue)}
                iconColor="#059669"
                iconBg="bg-green-100 dark:bg-green-900/40"
              />
            </View>
            <View className="w-40">
              <MetricCard
                icon="alert-circle-outline"
                label="Low Stock"
                value={metrics.lowStockItems}
                iconColor="#D97706"
                iconBg="bg-yellow-100 dark:bg-yellow-900/40"
              />
            </View>
            <View className="w-40">
              <MetricCard
                icon="close-circle-outline"
                label="Out of Stock"
                value={metrics.outOfStockItems}
                iconColor="#DC2626"
                iconBg="bg-red-100 dark:bg-red-900/40"
              />
            </View>
          </View>
        </ScrollView>

        {/* Search Bar */}
        <View className="flex-row items-center px-4 mb-3 bg-gray-100 dark:bg-gray-900 rounded-xl h-11">
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            placeholder="Search by product name or ID"
            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
            className="flex-1 ml-3 text-sm text-gray-900 dark:text-white"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => {
                setSearch("");
                setPage(1);
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </Pressable>
          )}
        </View>

        {/* Filter Toggle */}
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons
            name={showFilters ? "options" : "options-outline"}
            size={16}
            color={
              showFilters
                ? isDark
                  ? "#60A5FA"
                  : "#2563EB"
                : isDark
                  ? "#9CA3AF"
                  : "#6B7280"
            }
          />
          <Text
            className={`text-sm font-semibold ${showFilters ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
          >
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
                <Text className="text-xs font-bold text-red-500">
                  Reset All
                </Text>
              </Pressable>
            )}
          </View>

          {/* Category Filter */}
          <View className="mb-3">
            <Text className="mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <FilterChip
                label="All"
                active={filterCategory === "all"}
                onPress={() => {
                  setFilterCategory("all");
                  setPage(1);
                }}
              />
              {parentCategories.map((cat) => (
                <FilterChip
                  key={cat.id}
                  label={cat.name}
                  active={filterCategory === cat.id}
                  onPress={() => {
                    setFilterCategory(cat.id);
                    setPage(1);
                  }}
                />
              ))}
            </ScrollView>
          </View>

          {/* Stock Status Filter */}
          <View className="mb-3">
            <Text className="mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
              Stock Status
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(
                [
                  { value: "all", label: "All" },
                  { value: "in-stock", label: "In Stock" },
                  { value: "low-stock", label: "Low Stock" },
                  { value: "out-of-stock", label: "Out of Stock" },
                ] as const
              ).map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={filterStock === option.value}
                  onPress={() => {
                    setFilterStock(option.value);
                    setPage(1);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── Product List ─────────────────────────────────────────────────────── */}
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
              Try adjusting your filters.
            </Text>
            {hasActiveFilters && (
              <Pressable
                onPress={resetFilters}
                className="mt-5 bg-blue-600 px-6 py-2.5 rounded-xl"
              >
                <Text className="text-sm font-bold text-white">
                  Clear Filters
                </Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* ── Sticky Pagination Bar ─────────────────────────────────────────────── */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        isDark={isDark}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
        pageSize={PAGE_SIZE}
      />

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <ProductDetailModal
        visible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        categoryName={
          selectedProduct
            ? getCategoryName(selectedProduct.categoryId, categories)
            : ""
        }
        onEdit={() => {
          setSelectedProduct(selectedProduct);
          setShowAddModal(true);
        }}
        onAdjustStock={() => {
          setSelectedProduct(selectedProduct);
          setShowAdjustModal(true);
        }}
        onViewHistory={() => {
          setSelectedProduct(selectedProduct);
          setShowHistoryModal(true);
        }}
      />

      <AddProductModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedProduct(null);
        }}
        onSave={handleSaveProduct}
        categories={categories}
        editProduct={selectedProduct}
      />

      <StockAdjustmentModal
        visible={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAdjust={handleAdjustStock}
      />

      <StockHistoryModal
        visible={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        movements={stockMovements}
      />
    </View>
  );
}
