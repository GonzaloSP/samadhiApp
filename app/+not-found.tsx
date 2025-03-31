import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Background from '@/components/Background';

export default function NotFoundScreen() {
  return (
    <Background>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  text: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: '#9775fa',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});