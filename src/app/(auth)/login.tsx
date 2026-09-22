import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, Link } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Error', 'Completá email y contraseña');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Atención', 'Ingresá un correo electrónico válido.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center px-6 bg-primary">
      <View className="mb-10 items-center">
        <Image 
          source={require('@/../assets/images/icon_agro_pulse.png')} 
          className="w-40 h-40 mb-4 rounded-3xl" 
          resizeMode="contain" 
        />
        <Text className="text-4xl font-bold text-white">Iniciar Sesión</Text>
        <Text className="text-gray-300 mt-2 text-center">
          Ingresá con tu cuenta para acceder a los lotes.
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
        <View>
          <TextInput
            className="bg-secondary px-4 py-4 rounded-xl text-white text-base mt-4"
            placeholder="Contraseña"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Link href="/(auth)/reset" asChild>
            <TouchableOpacity className="mt-3 self-end">
              <Text className="text-accent font-medium">¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      <View className="mt-8 space-y-3">
        <TouchableOpacity
          className="bg-accent py-4 rounded-xl items-center"
          onPress={signInWithEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#263C28" />
          ) : (
            <Text className="text-primary font-bold text-lg">Ingresar</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity className="py-4 items-center mt-3">
            <Text className="text-gray-300">¿No tenés cuenta? <Text className="text-accent font-bold">Registrate</Text></Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}



