import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Image, Text } from 'react-native';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#F7C35F',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#263C28',
          borderTopWidth: 0,
        },
        headerStyle: {
          backgroundColor: '#263C28',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image 
              source={require('../../../assets/images/icon_agro_pulse_2.png')} 
              style={{ width: 32, height: 32, marginRight: 10 }} 
              resizeMode="contain" 
            />
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>AgroPulse</Text>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lots"
        options={{
          title: 'Lotes',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Cuenta',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
