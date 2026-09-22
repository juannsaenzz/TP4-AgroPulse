import { Stack, useRouter } from 'expo-router';
import { Image, TouchableOpacity, View, Text } from 'react-native';

export default function LotsLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#263C28',
        },
        headerTintColor: '#fff',
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image 
              source={require('../../../../assets/images/icon_agro_pulse_2.png')} 
              style={{ width: 32, height: 32, marginRight: 10 }} 
              resizeMode="contain" 
            />
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>AgroPulse</Text>
          </View>
        ),
        headerLeft: ({ canGoBack }) => 
          canGoBack ? (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10, marginRight: 15, padding: 5 }}>
              <Image 
                source={require('../../../../assets/images/button_back.png')} 
                style={{ width: 32, height: 32, tintColor: '#F7C35F' }} 
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : null
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}

