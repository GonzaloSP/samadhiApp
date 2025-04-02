import { owl } from "@lucide/lab";

export default {
  name: 'Samadhi',
  slug: 'buscandocerteza-samadhi',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'myapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  owner: 'gonzalossp',
  android: {
    "package": "com.buscandocerteza.samadhi"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.buscandocerteza.samadhi"
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png'
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true
  },
  extra: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    "eas": {
        "projectId": "3f8d5c97-1b12-41d3-949d-21e365138207"
      }   
  }
};