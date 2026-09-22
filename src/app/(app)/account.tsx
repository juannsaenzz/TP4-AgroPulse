import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Ionicons } from '@expo/vector-icons';

export default function AccountScreen() {
    const { session } = useAuth();
  const [role, setRole] = useState('Cargando...');
  const [orgName, setOrgName] = useState('Cargando...');
  const [diagData, setDiagData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const userEmail = session?.user?.email;

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  async function fetchData() {
      if (!session?.user?.id) return;
      
      // Fetch Role and Organization
      const { data: memberData } = await supabase
        .from('memberships')
        .select('role, organization_id')
        .eq('user_id', session.user.id)
        .maybeSingle(); // Changed to maybeSingle to avoid 42703 error earlier
      
      if (memberData) {
        const rolesMap = {
          'producer': 'Productor',
          'operator': 'Operario',
          'advisor': 'Asesor'
        };
        setRole(rolesMap[memberData.role] || memberData.role);
        
        if (memberData.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', memberData.organization_id)
            .maybeSingle();
          if (orgData) setOrgName(orgData.name);
        }
      } else {
        setRole('Sin rol asignado');
        setOrgName('Ninguno');
      }

      // Fetch Diagnostics (Último tick)
      const { data: latestReading } = await supabase
        .from('readings')
        .select('measured_at')
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (latestReading) {
        const measured = new Date(latestReading.measured_at);
        const lagMs = Date.now() - measured.getTime();
        setDiagData({
          ultimo_tick: measured.toLocaleString(),
          lag: Math.floor(lagMs / 1000) + 's'
        });
      }
    }

  useEffect(() => {
    fetchData();
  }, [session]);

    return (
    <ScrollView 
      className="flex-1 bg-white" 
      contentContainerStyle={{ padding: 24, alignItems: 'center' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#263C28" />}
    >
      <Image 
        source={require('@/../assets/images/icon_agro_pulse.png')} 
        className="w-24 h-24 mb-6 rounded-3xl shadow-sm" 
        resizeMode="contain" 
      />
      <Text className="text-3xl font-bold text-primary mb-2">Mi Cuenta</Text>
      <Text className="text-gray-500 mb-3">{userEmail}</Text>
      
      <View className="bg-[#2D442F] px-6 py-2 rounded-full mb-10 shadow-sm border border-primary">
        <Text className="text-accent font-bold">Rol: {role.toUpperCase()}</Text>
      </View>

      <View className="bg-primary p-6 rounded-3xl shadow-md w-full mb-8 border border-[#365039]">
        <View className="flex-row items-center mb-5 border-b border-[#365039] pb-4">
          <View className="bg-[#2D442F] p-3 rounded-full mr-3">
            <Ionicons name="hardware-chip" size={24} color="#F7C35F" />
          </View>
          <Text className="text-xl font-bold text-white">Diagnóstico IoT</Text>
        </View>

        <View className="mb-4">
          <Text className="text-accent text-xs font-bold mb-1 uppercase tracking-wider">Establecimiento</Text>
          <Text className="text-white text-base">{orgName}</Text>
        </View>

        <View className="mb-4">
          <Text className="text-accent text-xs font-bold mb-1 uppercase tracking-wider">Último Tick del Sensor</Text>
          <Text className="text-white text-base">{diagData?.ultimo_tick || 'Sin conexión reciente'}</Text>
        </View>

        <View className="mb-4">
          <Text className="text-accent text-xs font-bold mb-1 uppercase tracking-wider">Lag (Demora de Red)</Text>
          <View className="flex-row items-center">
            <View className={`w-2 h-2 rounded-full mr-2 ${diagData?.lag === '0s' ? 'bg-green-400' : diagData?.lag ? 'bg-orange-400' : 'bg-red-400'}`} />
            <Text className="text-white text-base font-bold">{diagData?.lag || '--'}</Text>
          </View>
        </View>

        <View>
          <Text className="text-accent text-xs font-bold mb-1 uppercase tracking-wider">ID de Conexión Segura</Text>
          <Text className="text-gray-400 text-xs">{session?.user?.id}</Text>
        </View>
      </View>

      <TouchableOpacity 
        className="bg-red-500 p-5 rounded-2xl w-full flex-row justify-center items-center shadow-sm mb-10"
        onPress={() => supabase.auth.signOut()}
      >
        <Ionicons name="log-out-outline" size={24} color="white" />
        <Text className="text-white font-bold text-xl ml-3">Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


