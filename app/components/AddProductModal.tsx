import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import type { Product, Category } from "../types/inventory";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => void;
  categories: Category[];
  editProduct?: Product | null;
}

interface VariantInput {
  id: string;
  name: string;
  additionalPrice: string;
}

// ─── Image Compression ────────────────────────────────────────────────────────
// Converts any picked image to a compressed JPEG regardless of source format.
// Falls back to the original URI if manipulation fails so the user is never blocked.

async function compressToJpeg(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // cap width to 800px, height scales proportionally
      {
        compress: 0.75, // 75% quality — good balance of size vs clarity
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    return result.uri;
  } catch (e) {
    console.warn(
      "[AddProductModal] image compression failed, using original:",
      e,
    );
    return uri; // fallback — still works, just uncompressed
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddProductModal({
  visible,
  onClose,
  onSave,
  categories,
  editProduct,
}: AddProductModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // ─── State ──────────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [compressing, setCompressing] = useState(false); // shows spinner while compressing

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (editProduct) {
      setName(editProduct.name);
      setDescription(editProduct.description || "");
      setImage(editProduct.image || "");
      setCategoryId(editProduct.categoryId);
      setCostPrice(editProduct.costPrice.toString());
      setSellingPrice(editProduct.sellingPrice.toString());

      if (editProduct.variants && editProduct.variants.length > 0) {
        setShowVariants(true);
        setVariants(
          editProduct.variants.map((v) => ({
            id: v.id,
            name: v.name,
            additionalPrice: v.additionalPrice.toString(),
          })),
        );
      } else {
        setVariants([]);
        setShowVariants(false);
      }
    } else {
      resetForm();
    }
  }, [editProduct, visible]);

  // ─── Image Picker ────────────────────────────────────────────────────────────

  const requestPermission = async (type: "camera" | "gallery") => {
    if (type === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to take photos.",
        );
        return false;
      }
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is needed to select images.",
        );
        return false;
      }
    }
    return true;
  };

  // ── Core: pick image then compress it ──────────────────────────────────────
  const processImage = async (uri: string) => {
    setCompressing(true);
    try {
      const compressed = await compressToJpeg(uri);
      setImage(compressed);
    } finally {
      setCompressing(false);
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermission("camera");
    if (!hasPermission) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // pick full quality — we compress ourselves below
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const handlePickFromGallery = async () => {
    const hasPermission = await requestPermission("gallery");
    if (!hasPermission) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // pick full quality — we compress ourselves below
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const handleImagePress = () => {
    Alert.alert(
      "Product Image",
      "Choose how to add an image",
      [
        { text: "Take Photo", onPress: handleTakePhoto },
        { text: "Choose from Gallery", onPress: handlePickFromGallery },
        image
          ? {
              text: "Remove Image",
              style: "destructive",
              onPress: () => setImage(""),
            }
          : null,
        { text: "Cancel", style: "cancel" },
      ].filter(Boolean) as any,
    );
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setName("");
    setDescription("");
    setImage("");
    setCategoryId("");
    setCostPrice("");
    setSellingPrice("");
    setVariants([]);
    setShowVariants(false);
  };

  const handleSave = () => {
    if (!name || !categoryId || !costPrice || !sellingPrice) return;

    const productData: Omit<Product, "id" | "createdAt" | "updatedAt"> = {
      name,
      description: description || undefined,
      image: image || undefined, // ✅ compressed JPEG URI passed through to InventoryScreen → DB
      categoryId,
      costPrice: parseFloat(costPrice),
      sellingPrice: parseFloat(sellingPrice),
      isArchived: false,
      variants:
        showVariants && variants.length > 0
          ? variants.map((v) => ({
              id: v.id || `var-${Date.now()}-${Math.random()}`,
              name: v.name,
              additionalPrice: parseFloat(v.additionalPrice) || 0,
            }))
          : undefined,
    };

    onSave(productData);
    resetForm();
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      { id: `temp-${Date.now()}`, name: "", additionalPrice: "0" },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (
    index: number,
    field: keyof VariantInput,
    value: string,
  ) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Pressable onPress={onClose} className="flex-1 bg-black/50">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="mt-auto bg-white dark:bg-gray-900 rounded-t-3xl max-h-[90%]"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-gray-900 dark:text-white font-black text-xl">
                {editProduct ? "Edit Product" : "Add Product"}
              </Text>
              <Pressable onPress={onClose}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#FFFFFF" : "#000000"}
                />
              </Pressable>
            </View>

            {/* Form */}
            <ScrollView
              className="px-5 py-4"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Product Image ── */}
              <View className="mb-5 items-center">
                <Pressable onPress={handleImagePress} className="items-center">
                  {compressing ? (
                    // Spinner shown while compressing
                    <View className="w-28 h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 items-center justify-center">
                      <ActivityIndicator
                        color={isDark ? "#60A5FA" : "#2563EB"}
                      />
                      <Text className="text-gray-400 text-xs mt-2">
                        Processing…
                      </Text>
                    </View>
                  ) : image ? (
                    <View className="relative">
                      <Image
                        source={{ uri: image }}
                        className="w-28 h-28 rounded-2xl bg-gray-100 dark:bg-gray-800"
                        resizeMode="cover"
                      />
                      <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1.5">
                        <Ionicons name="pencil" size={12} color="#fff" />
                      </View>
                    </View>
                  ) : (
                    <View className="w-28 h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <Ionicons
                        name="camera-outline"
                        size={32}
                        color={isDark ? "#6B7280" : "#9CA3AF"}
                      />
                      <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold mt-2 text-center">
                        Add Photo
                      </Text>
                    </View>
                  )}
                </Pressable>

                <View className="flex-row gap-3 mt-3">
                  <Pressable
                    onPress={handleTakePhoto}
                    disabled={compressing}
                    className="flex-row items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl"
                  >
                    <Ionicons
                      name="camera-outline"
                      size={16}
                      color={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                    <Text className="text-gray-600 dark:text-gray-400 text-xs font-semibold">
                      Camera
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handlePickFromGallery}
                    disabled={compressing}
                    className="flex-row items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl"
                  >
                    <Ionicons
                      name="images-outline"
                      size={16}
                      color={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                    <Text className="text-gray-600 dark:text-gray-400 text-xs font-semibold">
                      Gallery
                    </Text>
                  </Pressable>
                  {image && !compressing && (
                    <Pressable
                      onPress={() => setImage("")}
                      className="flex-row items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-950/40 rounded-xl"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#EF4444"
                      />
                      <Text className="text-red-500 text-xs font-semibold">
                        Remove
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Format hint */}
                <Text className="text-gray-400 dark:text-gray-600 text-xs mt-2">
                  Any image format • auto-converted to JPEG
                </Text>
              </View>

              {/* Product Name */}
              <View className="mb-4">
                <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">
                  Product Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Wagyu Burger"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                />
              </View>

              {/* Description */}
              <View className="mb-4">
                <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional product description"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Category */}
              <View className="mb-4">
                <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">
                  Category *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {parentCategories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      className={`mr-2 px-4 py-2 rounded-xl ${
                        categoryId === cat.id
                          ? "bg-blue-600"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      <Text
                        className={`font-bold text-sm ${
                          categoryId === cat.id
                            ? "text-white"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Pricing Row */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">
                    Cost Price *
                  </Text>
                  <TextInput
                    value={costPrice}
                    onChangeText={setCostPrice}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                    className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">
                    Selling Price *
                  </Text>
                  <TextInput
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                    className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  />
                </View>
              </View>

              {/* Variants Section */}
              <View className="mb-4">
                <Pressable
                  onPress={() => setShowVariants(!showVariants)}
                  className="flex-row items-center justify-between mb-3"
                >
                  <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm">
                    Product Variants
                  </Text>
                  <Ionicons
                    name={showVariants ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                </Pressable>

                {showVariants && (
                  <View>
                    {variants.map((variant, index) => (
                      <View
                        key={variant.id}
                        className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-2"
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-gray-600 dark:text-gray-400 font-bold text-xs">
                            Variant {index + 1}
                          </Text>
                          <Pressable onPress={() => removeVariant(index)}>
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#EF4444"
                            />
                          </Pressable>
                        </View>
                        <TextInput
                          value={variant.name}
                          onChangeText={(v) => updateVariant(index, "name", v)}
                          placeholder="Variant name (e.g., Small)"
                          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                          className="bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-gray-900 dark:text-white mb-2 text-sm"
                        />
                        <TextInput
                          value={variant.additionalPrice}
                          onChangeText={(v) =>
                            updateVariant(index, "additionalPrice", v)
                          }
                          placeholder="Additional price (e.g., +20)"
                          keyboardType="decimal-pad"
                          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                          className="bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm"
                        />
                      </View>
                    ))}

                    <Pressable
                      onPress={addVariant}
                      className="bg-gray-100 dark:bg-gray-800 rounded-xl py-3 items-center flex-row justify-center gap-2"
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color={isDark ? "#60A5FA" : "#2563EB"}
                      />
                      <Text className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                        Add Variant
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex-row gap-3">
              <Pressable
                onPress={onClose}
                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl py-3 items-center"
              >
                <Text className="text-gray-700 dark:text-gray-300 font-bold">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={compressing}
                className="flex-1 bg-blue-600 rounded-xl py-3 items-center"
              >
                {compressing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold">
                    {editProduct ? "Save Changes" : "Add Product"}
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
