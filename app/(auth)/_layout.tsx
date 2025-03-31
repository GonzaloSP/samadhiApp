import { Stack } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useLanguageStore } from '@/stores/language';
import Background from '@/components/Background';

export default function AuthLayout() {
  const { t } = useLanguageStore();

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <Background>
      <View style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>{t('skip')}</Text>
        </TouchableOpacity>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(44, 45, 49, 0.8)',
    borderRadius: 20,
    zIndex: 1,
  },
  skipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});