import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    const { data } = await supabase
      .from('alerts')
      .select('*, plots(name)')
      .order('created_at', { ascending: false });
    
    if (data) setAlerts(data); else console.log('Fetch alerts error:', await supabase.from('alerts').select('*, plots(name)').order('created_at', { ascending: false }).then(res => res.error));
    setLoading(false);
    setRefreshing(false);
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const markAsRead = async (item) => {
    if (!item.read_at) {
      await supabase.from('alerts').update({ read_at: new Date().toISOString() }).eq('id', item.id);
    }
    router.push(`/lots/${item.plot_id}`);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#263C28" />
      </View>
    );
  }

  const getAlertIcon = (type) => {
    switch(type) {
      case 'humedad_critica': return { name: 'warning', color: '#F7C35F' };
      case 'valvula_fallo': return { name: 'construct', color: '#F7C35F' };
      case 'riego_terminado': return { name: 'water', color: '#F7C35F' };
      default: return { name: 'notifications', color: '#F7C35F' };
    }
  };

  const getAlertTitle = (type) => {
    switch(type) {
      case 'humedad_critica': return 'Humedad Crtica';
      case 'valvula_fallo': return 'Fallo en Vlvula';
      case 'riego_terminado': return 'Riego Finalizado';
      default: return 'Notificacin';
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      <Text className="text-3xl font-bold text-primary mb-6">Alertas</Text>
      
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#263C28" />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const icon = getAlertIcon(item.type);
          const date = new Date(item.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
          const isRead = item.read_at != null;

          return (
            <TouchableOpacity 
              onPress={() => markAsRead(item)}
              className={`p-5 rounded-3xl mb-4 shadow-sm flex-row items-center border ${isRead ? 'bg-white border-gray-200' : 'bg-primary border-primary'}`}
            >
              <View className={`p-3 rounded-full mr-4 ${isRead ? 'bg-slate-100' : 'bg-[#2D442F]'}`}>
                <Ionicons name={icon.name} size={24} color={isRead ? '#9ca3af' : icon.color} />
              </View>
              <View className="flex-1">
                <Text className={`text-lg font-bold ${isRead ? 'text-gray-500' : 'text-white'}`}>
                  {getAlertTitle(item.type)}
                </Text>
                <Text className={`text-sm mt-1 ${isRead ? 'text-gray-400' : 'text-gray-300'}`}>
                  Lote: {item.plots?.name}
                </Text>
                <Text className={`text-xs mt-2 ${isRead ? 'text-gray-400' : 'text-accent'}`}>{date}</Text>
              </View>
              {!isRead && <View className="w-3 h-3 bg-accent rounded-full ml-2 shadow-sm" />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Ionicons name="checkmark-circle-outline" size={80} color="#263C28" />
            <Text className="text-primary text-center mt-6 text-xl font-bold">Todo en orden</Text>
            <Text className="text-gray-500 text-center mt-2 text-base">No tens alertas activas en tus lotes.</Text>
          </View>
        }
      />
    </View>
  );
}


