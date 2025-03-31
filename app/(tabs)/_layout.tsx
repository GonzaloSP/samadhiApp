import { Tabs } from 'expo-router';
import { Clock, Map, ChartLine as LineChart } from 'lucide-react-native';
import { useLanguageStore } from '@/stores/language';
import { View, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = height * 0.1; // Adjust based on your needs (10% of screen height)

export default function TabLayout() {
  const { t } = useLanguageStore();
  return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(26, 27, 30, 0.6)',
            borderTopColor: 'rgba(44, 45, 49, 0.5)',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
            borderTopWidth: 0,
            height: TAB_BAR_HEIGHT,
            paddingBottom: 0,
            paddingTop: 5,
          },
          tabBarActiveTintColor: '#9775fa',
          tabBarInactiveTintColor: '#a1a1aa',
          tabBarItemStyle: {
            paddingVertical: 8,
          },
          tabBarIconStyle: {
            marginBottom: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('meditate'),
            tabBarIcon: ({ size, color }) => (
              <Clock size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: t('achievements'),
            tabBarIcon: ({ size, color }) => (
              <LineChart size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: t('globalMeditation'),
            tabBarIcon: ({ size, color }) => (
              <Map size={size} color={color} />
            ),
          }}
        />
      </Tabs>
  );
}