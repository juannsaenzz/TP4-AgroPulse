import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function ResetScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  async function resetPassword() {
    if (!email) {
      Alert.alert('Atención', 'Ingresá tu email para continuar.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Atención', 'Ingresá un correo electrónico válido.');
      return;
    }
    setLoading(true);
    
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'agropulse://login',
    });
    
    Alert.alert(
      'Revisá tu correo',
      'Si el mail está registrado en AgroPulse, recibirás un correo para cambiar tu contraseña.',
      [{ text: 'Entendido', onPress: () => router.back() }]
    );
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 px-6 bg-primary pt-16">
      <TouchableOpacity 
        className="mb-8 w-12 h-12 items-center justify-center rounded-xl"
        onPress={() => router.back()}
      >
        <Image 
          source={require('@/../assets/images/button_back.png')} 
          className="w-8 h-8" 
          resizeMode="contain" 
          style={{ tintColor: '#F7C35F' }}
        />
      </TouchableOpacity>

      <View className="mb-10 items-center">
        <Image 
          source={require('@/../assets/images/icon_agro_pulse.png')} 
          className="w-40 h-40 mb-4 rounded-3xl" 
          resizeMode="contain" 
        />
        <Text className="text-4xl font-bold text-white text-center">Recuperar Contraseña</Text>
        <Text className="text-gray-300 mt-2 text-center px-4">
          Ingresá el email asociado a tu cuenta para recibir las instrucciones.
        </Text>
      </View>

      <View className="space-y-4">
        <TextInput
          className="bg-secondary px-4 py-4 rounded-xl text-white text-base"
          placeholder="email@ejemplo.com"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View className="mt-8">
        <TouchableOpacity
          className="bg-accent py-4 rounded-xl items-center"
          onPress={resetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#263C28" />
          ) : (
            <Text className="text-primary font-bold text-lg">Enviar correo</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}






