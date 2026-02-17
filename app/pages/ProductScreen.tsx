import React, { useState, useMemo } from 'react';
import { 
  View, Text, TextInput, ScrollView, TouchableOpacity, 
  Image, useWindowDimensions 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useSidebar } from '../context/SidebarContext'; 
import { useColorScheme } from 'nativewind';

// --- MOCK DATA ---
const CATEGORIES = [
  { id: 1, name: 'All', icon: 'apps' },
  { id: 2, name: 'Breakfast', icon: 'egg-outline' },
  { id: 3, name: 'Soups', icon: 'bowl-mix-outline' },
  { id: 4, name: 'Pasta', icon: 'noodles' },
  { id: 5, name: 'Burgers', icon: 'hamburger' },
];

const PRODUCTS = [
  { id: 1, name: 'Original Cheese Meat Burger With Chips', price: 280, type: 'Non Veg', category: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
  { id: 2, name: 'Fresh Orange Juice With Basil Seed', price: 120, type: 'Veg', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400' },
  { id: 3, name: 'Meat Sushi Maki With Tuna', price: 350, type: 'Non Veg', category: 'All', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400' },
  { id: 4, name: 'Tacos Salsa With Chickens Grilled', price: 220, type: 'Non Veg', category: 'All', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400' },
  { id: 5, name: 'Classic Pancakes with Syrup', price: 180, type: 'Veg', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400' },
  { id: 6, name: 'Mushroom Cream Soup', price: 150, type: 'Veg', category: 'Soups', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400' },
  { id: 7, name: 'Seafood Marinara Pasta', price: 320, type: 'Non Veg', category: 'Pasta', image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?w=400' },
  { id: 8, name: 'Double Bacon BBQ Burger', price: 310, type: 'Non Veg', category: 'Burgers', image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400' },
];

export default function ProductScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { colorScheme } = useColorScheme();
  const { openSidebar } = useSidebar();
  const isDark = colorScheme === 'dark';

  // --- STATE ---
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [cart, setCart] = useState<any[]>([]);
  const [orderType, setOrderType] = useState('Dine in');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // --- LOGIC ---
  const filtered = useMemo(() => 
    PRODUCTS.filter(p => 
      (activeCat === 'All' || p.category === activeCat) && 
      p.name.toLowerCase().includes(search.toLowerCase())
    )
  , [search, activeCat]);

  const addToCart = (p: any) => {
    if (selectionMode) return;
    setCart(prev => {
      const exist = prev.find(i => i.id === p.id);
      return exist ? prev.map(i => i.id === p.id ? {...i, qty: i.qty + 1} : i) : [...prev, {...p, qty: 1}];
    });
  };

  // UPDATED: Decrement deletes entry if qty is 1
  const updateQty = (id: number, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (item && item.qty === 1 && delta === -1) {
        return prev.filter(i => i.id !== id); // Delete item
      }
      return prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i);
    });
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const deleteSelected = () => {
    setCart(prev => prev.filter(item => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const tax = subtotal * 0.05;

  return (
    <View className="flex-1 bg-[#F4F7F4] dark:bg-gray-950" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className={`flex-1 ${isLandscape ? 'flex-row' : 'flex-col'}`}>
        
        {/* --- MENU SECTION --- */}
        {!isExpanded && (
          <View className={`${isLandscape ? 'flex-[0.65]' : 'flex-1'} p-4`}>
            
            <View className="flex-row items-center mb-6 space-x-2">
              <TouchableOpacity onPress={openSidebar} className="p-2">
                <Ionicons name="menu" size={30} color={isDark ? "white" : "black"} />
              </TouchableOpacity>

              <View className="flex-row items-center flex-1 px-4 py-2 bg-white border border-gray-100 shadow-sm dark:bg-gray-800 rounded-2xl dark:border-gray-700">
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput 
                  placeholder="Search products..." 
                  value={search} onChangeText={setSearch}
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 h-10 ml-2 dark:text-white" 
                />
              </View>

              <TouchableOpacity className="p-3 bg-white border border-gray-100 dark:bg-gray-800 rounded-2xl dark:border-gray-700">
                <Ionicons name="options-outline" size={20} color={isDark ? "white" : "black"} />
              </TouchableOpacity>
            </View>

            <View className="h-16 mb-6">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity 
                    key={c.id} onPress={() => setActiveCat(c.name)}
                    className={`mr-3 p-4 rounded-3xl w-24 items-center justify-center border ${activeCat === c.name ? 'bg-green-100 border-green-600 dark:bg-green-900/30' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}
                  >
                    <MaterialCommunityIcons name={c.icon as any} size={22} color={activeCat === c.name ? "green" : "gray"} />
                    <Text className={`text-[10px] font-bold mt-1 ${activeCat === c.name ? 'text-green-800 dark:text-green-400' : 'text-gray-500'}`}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap justify-between">
                {filtered.map(p => (
                  <TouchableOpacity key={p.id} onPress={() => addToCart(p)} style={{ width: isLandscape ? '31%' : '48%' }} className="p-2 mb-4 bg-white shadow-sm dark:bg-gray-800 rounded-3xl">
                    <Image source={{ uri: p.image }} className="w-full bg-gray-100 h-28 rounded-2xl" />
                    <Text className="font-bold text-[11px] mt-2 dark:text-white" numberOfLines={1}>{p.name}</Text>
                    <Text className="font-bold text-green-700">₱{p.price}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* --- CART SECTION --- */}
        <View className={`bg-white dark:bg-gray-900 ${isLandscape ? 'flex-[0.35] border-l border-gray-100 dark:border-gray-800' : isExpanded ? 'flex-1' : 'h-[45%] border-t border-gray-100 dark:border-gray-800'}`}>
          
          <View className={`flex-row items-center justify-between p-4 border-b ${selectionMode ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'border-gray-50 dark:border-gray-800'}`}>
            {selectionMode ? (
              <>
                <View className="flex-row items-center">
                  <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedIds([]); }}>
                    <Ionicons name="close" size={24} color="#ef4444" />
                  </TouchableOpacity>
                  <Text className="ml-3 text-lg font-bold text-red-600">{selectedIds.length} Selected</Text>
                </View>
                <TouchableOpacity onPress={deleteSelected} className="p-2 bg-red-500 shadow-md rounded-xl">
                  <Feather name="trash-2" size={20} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View>
                  <Text className="text-lg font-bold dark:text-white">Current Order</Text>
                  <Text className="text-xs text-gray-400">{cart.length} Items</Text>
                </View>
                {!isLandscape && (
                  <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                    <Ionicons name={isExpanded ? "chevron-down" : "expand"} size={22} color="#009245" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <ScrollView className="flex-1 px-4 mt-4">
            {cart.map(item => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <TouchableOpacity 
                  key={item.id}
                  activeOpacity={0.8}
                  onLongPress={() => { setSelectionMode(true); toggleSelection(item.id); }}
                  onPress={() => selectionMode && toggleSelection(item.id)}
                  className={`flex-row items-center p-3 mb-4 rounded-2xl border shadow-sm ${isSelected ? 'bg-red-50 border-red-300 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}
                >
                  <View className="relative">
                    <Image source={{ uri: item.image }} className="bg-gray-100 w-14 h-14 rounded-xl" />
                    {isSelected && (
                      <View className="absolute inset-0 items-center justify-center bg-red-500/20 rounded-xl">
                        <Ionicons name="checkmark-circle" size={24} color="#ef4444" />
                      </View>
                    )}
                  </View>

                  <View className="flex-1 ml-3">
                    <Text className="font-bold text-[11px] dark:text-white" numberOfLines={1}>{item.name}</Text>
                    <View className="flex-row items-center justify-between mt-1">
                      {!selectionMode ? (
                        <View className="flex-row items-center px-2 py-1 rounded-full bg-gray-50 dark:bg-gray-700">
                          <TouchableOpacity onPress={() => updateQty(item.id, -1)}><Ionicons name="remove-circle-outline" size={20} color="#009245" /></TouchableOpacity>
                          <Text className="mx-2 text-xs font-bold dark:text-white">{item.qty}X</Text>
                          <TouchableOpacity onPress={() => updateQty(item.id, 1)}><Ionicons name="add-circle-outline" size={20} color="#009245" /></TouchableOpacity>
                        </View>
                      ) : (
                        <Text className="text-[10px] text-gray-400 italic">Long-press to select</Text>
                      )}
                      <Text className="font-bold text-[#009245] text-xs">₱{(item.qty * item.price).toFixed(2)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="p-5 bg-gray-50 dark:bg-gray-800 rounded-t-[35px] border-t border-gray-100 dark:border-gray-700 shadow-2xl">
            <View className="flex-row justify-between px-2 mb-1">
              <Text className="text-xs font-semibold text-gray-400">Sub Total</Text>
              <Text className="text-xs font-bold dark:text-white">₱{subtotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between px-2 mb-3">
              <Text className="text-xs font-semibold text-gray-400">Tax (5%)</Text>
              <Text className="text-xs font-bold dark:text-white">₱{tax.toFixed(2)}</Text>
            </View>
            <View className="flex-row items-center justify-between py-2 border-t border-gray-300 border-dashed dark:border-gray-600">
              <Text className="text-base font-bold dark:text-white">Total Amount</Text>
              <Text className="text-xl font-extrabold text-[#009245]">₱{(subtotal + tax).toFixed(2)}</Text>
            </View>
            <TouchableOpacity 
              disabled={cart.length === 0 || selectionMode}
              className={`py-4 rounded-2xl items-center shadow-lg mt-2 ${ (cart.length === 0 || selectionMode) ? 'bg-gray-300 dark:bg-gray-700' : 'bg-[#009245]'}`}
            >
              <Text className="text-lg font-bold text-white">Place Order</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>
  );
}