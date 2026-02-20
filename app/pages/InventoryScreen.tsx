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
import { ProductCard } from "../components/ProductCard";
import { FilterChip } from "../components/FilterChip";
import { PaginationBar } from "../components/PaganationBar";
import { AddProductModal } from "../components/AddProductModal";
import { ProductDetailModal } from "../components/ProductDetailModal";

// ─── Type & Data Imports ──────────────────────────────────────────────────────
import type { Product, Category } from "../types/inventory";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "../data/mockInventory";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getCategoryName = (
  categoryId: string,
  categories: Category[],
): string => {
  const category = categories.find((c) => c.id === categoryId);
  return category?.name || "Unknown";
};

const getParentCategories = (categories: Category[]): Category[] =>
  categories.filter((c) => !c.parentId);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // ─── State ──────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [categories] = useState<Category[]>(MOCK_CATEGORIES);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // ─── Computed Values ────────────────────────────────────────────────────────

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
        const productCategory = categories.find((c) => c.id === p.categoryId);
        if (
          p.categoryId !== filterCategory &&
          productCategory?.parentId !== filterCategory
        )
          return false;
      }

      return true;
    });
  }, [products, search, filterCategory, categories]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = filterCategory !== "all" || search !== "";

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const resetFilters = () => {
    setSearch("");
    setFilterCategory("all");
    setPage(1);
  };

  const handleSaveProduct = (
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ) => {
    const now = new Date().toISOString();

    if (selectedProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, ...productData, updatedAt: now }
            : p,
        ),
      );
    } else {
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        ...productData,
        createdAt: now,
        updatedAt: now,
      };
      setProducts((prev) => [newProduct, ...prev]);
    }

    setShowAddModal(false);
    setSelectedProduct(null);
  };

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
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
            onPress={() => {
              setSelectedProduct(null);
              setShowAddModal(true);
            }}
            className="bg-blue-600 px-4 py-2 rounded-xl flex-row items-center gap-2"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white">Add Product</Text>
          </Pressable>
        </View>

        {/* Total count pill */}
        <View className="flex-row mb-4">
          <View className="bg-blue-50 dark:bg-blue-900/30 rounded-xl px-4 py-2 flex-row items-center gap-2">
            <Ionicons
              name="cube-outline"
              size={16}
              color={isDark ? "#60A5FA" : "#2563EB"}
            />
            <Text className="text-blue-700 dark:text-blue-300 font-bold text-sm">
              {filtered.length} Products
            </Text>
          </View>
        </View>

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
          <View>
            <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
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

      {/* ── Pagination ───────────────────────────────────────────────────────── */}
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
        onViewHistory={() => {
          // History modal removed — wire up if needed later
          setShowDetailModal(false);
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
    </View>
  );
}
