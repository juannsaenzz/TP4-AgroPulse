import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function updatePassword() {
    if (!password || password.length < 6) {
      Alert.alert('Atención', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await supabase.auth.signOut();
      Alert.alert('Éxito', 'Tu contraseña ha sido actualizada. Iniciá sesión con tu nueva clave.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 px-6 bg-primary pt-20">
      <View className="mb-10 items-center">
        <Image 
          source={require('@/../assets/images/icon_agro_pulse.png')} 
          className="w-40 h-40 mb-4 rounded-3xl" 
          resizeMode="contain" 
        />
        <Text className="text-4xl font-bold text-white text-center">Nueva Contraseña</Text>
        <Text className="text-gray-300 mt-2 text-center px-4">
          Por favor, ingresá tu nueva contraseña para acceder a la plataforma.
        </Text>
      </View>

      <View className="space-y-4">
        <TextInput
          className="bg-secondary px-4 py-4 rounded-xl text-white text-base"
          placeholder="Nueva Contraseña (mínimo 6 caracteres)"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <View className="mt-8">
        <TouchableOpacity
          className="bg-accent py-4 rounded-xl items-center"
          onPress={updatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#263C28" />
          ) : (
            <Text className="text-primary font-bold text-lg">Guardar Contraseña</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}


