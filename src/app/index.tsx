import { Redirect } from 'expo-router';
import { useAuth } from '@/components/AuthProvider';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#12723D" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(app)/map" />;
}
