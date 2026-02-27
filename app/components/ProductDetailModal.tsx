import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { productsRepo } from "../data/Products";
import type { Product } from "../types/inventory";
import { formatCurrency, formatDate } from "../types/inventory";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductDetailModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  categoryName: string;
  onEdit: () => void;
  onDeleted: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductDetailModal({
  visible,
  onClose,
  product,
  categoryName,
  onEdit,
  onDeleted,
}: ProductDetailModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!product) return null;

  const hasVariants = product.variants && product.variants.length > 0;

  const handleDelete = () => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await productsRepo.delete(parseInt(product.id, 10));
              onClose();
              onDeleted();
            } catch (e) {
              console.error("[ProductDetailModal] delete error", e);
              Alert.alert(
                "Error",
                "Failed to delete product. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50">
        <Pressable onPress={onClose} className="flex-1" />

        <View className="bg-white dark:bg-gray-900 rounded-t-3xl max-h-[90%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-gray-900 dark:text-white font-black text-xl">
              Product Details
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            className="px-5 py-4"
            showsVerticalScrollIndicator={false}
          >
            {/* Product Image & Name */}
            <View className="items-center mb-6">
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  className="w-32 h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-32 h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 items-center justify-center mb-4">
                  <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                </View>
              )}
              <Text className="text-gray-900 dark:text-white font-black text-2xl text-center mb-2">
                {product.name}
              </Text>
              {product.description && (
                <Text className="text-gray-500 dark:text-gray-400 text-sm text-center">
                  {product.description}
                </Text>
              )}
            </View>

            {/* Pricing Info — selling price only */}
            <View className="mb-6">
              <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-3">
                Pricing
              </Text>
              <View className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3">
                <Text className="text-green-600 dark:text-green-400 text-xs font-bold mb-1">
                  SELLING PRICE
                </Text>
                <Text className="text-green-900 dark:text-green-100 font-black text-xl">
                  {formatCurrency(product.sellingPrice)}
                </Text>
              </View>
            </View>

            {/* Variants */}
            {hasVariants && (
              <View className="mb-6">
                <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-3">
                  Variants
                </Text>
                {product.variants!.map((variant) => (
                  <View
                    key={variant.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-2"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-900 dark:text-white font-bold text-base">
                        {variant.name}
                      </Text>
                      <Text className="text-gray-700 dark:text-gray-300 font-semibold text-sm">
                        {formatCurrency(
                          product.sellingPrice + variant.additionalPrice,
                        )}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Information */}
            <View className="mb-6">
              <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-3">
                Information
              </Text>
              <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <View className="flex-row items-center mb-3">
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                  <Text className="text-gray-500 dark:text-gray-400 text-xs ml-2 flex-1">
                    Category
                  </Text>
                  <Text className="text-gray-900 dark:text-white font-bold text-sm">
                    {categoryName}
                  </Text>
                </View>
                <View className="flex-row items-center mb-3">
                  <Ionicons
                    name="barcode-outline"
                    size={16}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                  <Text className="text-gray-500 dark:text-gray-400 text-xs ml-2 flex-1">
                    Product ID
                  </Text>
                  <Text className="text-gray-900 dark:text-white font-bold text-sm">
                    {product.id}
                  </Text>
                </View>
                <View className="flex-row items-center mb-3">
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                  <Text className="text-gray-500 dark:text-gray-400 text-xs ml-2 flex-1">
                    Created
                  </Text>
                  <Text className="text-gray-900 dark:text-white font-bold text-sm">
                    {formatDate(product.createdAt)}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                  <Text className="text-gray-500 dark:text-gray-400 text-xs ml-2 flex-1">
                    Last Updated
                  </Text>
                  <Text className="text-gray-900 dark:text-white font-bold text-sm">
                    {formatDate(product.updatedAt)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
            <View className="flex-row gap-2">
              <Pressable
                onPress={onEdit}
                className="flex-1 bg-blue-600 rounded-xl py-3 flex-row items-center justify-center gap-2"
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                <Text className="text-white font-bold text-sm">Edit</Text>
              </Pressable>

              <Pressable
                onPress={handleDelete}
                className="flex-1 bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 rounded-xl py-3 flex-row items-center justify-center gap-2"
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text className="text-red-500 font-bold text-sm">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
