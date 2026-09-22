import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LotsScreen() {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlots();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPlots();
  }, []);

  async function fetchPlots() {
    const { data } = await supabase.from('plots').select('*');
    if (data) setPlots(data);
    setLoading(false);
  }

  const getCropIcon = (crop) => {
    const c = crop?.toLowerCase() || '';
    if (c.includes('maíz') || c.includes('maiz')) return 'corn';
    if (c.includes('soja')) return 'sprout';
    if (c.includes('citrus') || c.includes('naranja') || c.includes('limón')) return 'fruit-citrus';
    return 'leaf';
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#F7C35F" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 px-4 pt-6">
      <FlatList
        data={plots}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#263C28" />}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => router.push(`/lots/${item.id}`)}
            className="bg-secondary p-5 rounded-3xl mb-4 shadow-sm flex-row items-center justify-between"
          >
            <View>
              <Text className="text-xl font-bold text-white">{item.name}</Text>
              <Text className="text-gray-300 mt-1 text-base">Cultivo: {item.crop}</Text>
            </View>
            <View className="bg-primary p-3 rounded-2xl flex-row items-center border border-[#3A5340]">
              <MaterialCommunityIcons name={getCropIcon(item.crop)} size={28} color="#F7C35F" />
              <Ionicons name="chevron-forward" size={20} color="#F7C35F" style={{ marginLeft: 5 }} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text className="text-gray-500 text-center mt-10">No tenés lotes registrados.</Text>}
      />
    </View>
  );
}


