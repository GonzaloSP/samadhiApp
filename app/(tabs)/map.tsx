import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, Modal, Image } from 'react-native';
import * as Location from 'expo-location';
import { Users, Settings, LogIn } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useLanguageStore } from '@/stores/language';
import { Language } from '@/lib/i18n/translations';
import { router } from 'expo-router';
import Background from '@/components/Background';

const getMapComponents = () => {
  if (Platform.OS === 'web') {
    return {
      MapView: null,
      Marker: null,
    };
  }
  try {
    const { default: MapView, Marker } = require('react-native-maps');
    return { MapView, Marker };
  } catch (error) {
    console.warn('Error loading react-native-maps:', error);
    return {
      MapView: null,
      Marker: null,
    };
  }
};

const { MapView, Marker } = getMapComponents();

const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#746855' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#242f3e' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
];

interface MeditationLocation {
  id: string;
  latitude: number;
  longitude: number;
  started_at: string;
}

const addRandomOffset = (coordinate: number): number => {
  const randomOffset = (Math.random() - 0.5) * 0.005;
  return coordinate + randomOffset;
};

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [meditationLocations, setMeditationLocations] = useState<MeditationLocation[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { user, signOut } = useAuthStore();
  const { t, language, setLanguage } = useLanguageStore();
  const mapRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    if (Platform.OS === 'web') return;

    const setupLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setError('Location permission not granted');
          }
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        if (isMounted) {
          setLocation(location);
          if (mapRef.current && location) {
            mapRef.current.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 1000);
          }
        }
      } catch (error) {
        if (isMounted) {
          setError('Error getting location');
        }
      }
    };

    setupLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;

    const fetchMeditationLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('meditation_locations')
          .select('*')
          .eq('is_meditating', true);

        if (error) throw error;

        if (data && isMounted) {
          setMeditationLocations(data);
          setActiveUsers(data.length);
        }
      } catch (error) {
        console.error('Error fetching meditation locations:', error);
      }
    };

    fetchMeditationLocations();
    
    const subscription = supabase
      .channel('meditation_locations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meditation_locations'
      }, () => {
        if (isMounted) {
          fetchMeditationLocations();
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const checkLocationSharing = async () => {
      const { data } = await supabase
        .from('meditation_locations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setIsSharing(!!data);
    };

    checkLocationSharing();
  }, [user]);

  const toggleLocationSharing = async () => {
    if (!location) return;
    try {
      if (!user?.id) {
        setError(t('loginRequired'));
        return;
      }

      if (isSharing) {
        await supabase
          .from('meditation_locations')
          .delete()
          .eq('user_id', user.id);
      } else {
        const randomizedLatitude = addRandomOffset(location.coords.latitude);
        const randomizedLongitude = addRandomOffset(location.coords.longitude);

        const { error } = await supabase
          .from('meditation_locations')
          .upsert({
            user_id: user.id,
            latitude: randomizedLatitude,
            longitude: randomizedLongitude,
            is_meditating: true,
          });

        if (error) throw error;
      }

      setIsSharing(!isSharing);
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      setError(t('locationError'));
    }
  };

  const handleLanguageChange = async (newLang: Language) => {
    await setLanguage(newLang);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  if (!user) {
    return (
      <Background>
        <View style={styles.authContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop' }}
            style={styles.authImage}
          />
          <Text style={styles.authTitle}>Join the Global Meditation Community</Text>
          <Text style={styles.authDescription}>
            Connect with meditators around the world. Sign in to see who's meditating near you and share your own meditation journey.
          </Text>
          <TouchableOpacity style={styles.authButton} onPress={handleLogin}>
            <LogIn size={24} color="#fff" style={styles.authIcon} />
            <Text style={styles.authButtonText}>Sign In to Access</Text>
          </TouchableOpacity>
        </View>
      </Background>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <Background>
        <View style={[styles.container, styles.webFallback]}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettingsModal(true)}>
            <Settings size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.webText}>{t('mapUnavailable')}</Text>
        </View>
      </Background>
    );
  }

  if (!MapView) {
    return (
      <Background>
        <View style={[styles.container, styles.webFallback]}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettingsModal(true)}>
            <Settings size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.webText}>{t('mapLoadError')}</Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}>
          <Settings size={24} color="#fff" />
        </TouchableOpacity>

        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location?.coords?.latitude || 0,
            longitude: location?.coords?.longitude || 0,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          customMapStyle={darkMapStyle}
          showsUserLocation
          showsMyLocationButton>
          {meditationLocations.map((loc) => (
            <Marker
              key={loc.id}
              coordinate={{
                latitude: loc.latitude,
                longitude: loc.longitude,
              }}
              pinColor="#9775fa"
            />
          ))}
        </MapView>

        <View style={styles.overlay}>
          <View style={styles.statsCard}>
            <Users size={24} color="#9775fa" />
            <Text style={styles.statsText}>
              {activeUsers} {activeUsers === 1 ? t('meditatingNow') : t('meditatingNowPlural')}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.shareButton,
              isSharing && styles.shareButtonActive
            ]}
            onPress={toggleLocationSharing}>
            <Text style={styles.shareButtonText}>
              {isSharing ? t('stopSharing') : t('shareLocation')}
            </Text>
          </TouchableOpacity>

          {isSharing && (
            <View style={styles.privacyNotice}>
              <Text style={styles.privacyText}>{t('locationPrivacyNotice')}</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <Modal
          visible={showSettingsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSettingsModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.settingsContent]}>
              <Text style={styles.modalTitle}>{t('language')}</Text>
              <View style={styles.languageButtons}>
                <TouchableOpacity
                  style={[styles.languageButton, language === 'en' && styles.activeLanguage]}
                  onPress={() => handleLanguageChange('en')}>
                  <Text style={[styles.languageText, language === 'en' && styles.activeLanguageText]}>
                    {t('english')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.languageButton, language === 'es' && styles.activeLanguage]}
                  onPress={() => handleLanguageChange('es')}>
                  <Text style={[styles.languageText, language === 'es' && styles.activeLanguageText]}>
                    {t('spanish')}
                  </Text>
                </TouchableOpacity>
              </View>
              {user && (
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                  <Text style={styles.signOutText}>{t('signOut')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowSettingsModal(false)}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  authDescription: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 400,
    lineHeight: 24,
  },
  authButton: {
    backgroundColor: '#9775fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
  },
  authIcon: {
    marginRight: 8,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    right: 20,
    zIndex: 1,
    padding: 12,
    backgroundColor: 'rgba(44, 45, 49, 0.8)',
    borderRadius: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  webFallback: {
    backgroundColor: '#1a1b1e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  overlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    gap: 10,
  },
  statsCard: {
    backgroundColor: 'rgba(28, 29, 32, 0.9)',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#9775fa',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonActive: {
    backgroundColor: '#7950f2',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyNotice: {
    backgroundColor: 'rgba(28, 29, 32, 0.9)',
    padding: 15,
    borderRadius: 12,
  },
  privacyText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorCard: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    padding: 15,
    borderRadius: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2c2d31',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  settingsContent: {
    gap: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#2c2d31',
    borderWidth: 1,
    borderColor: '#9775fa',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  languageButtons: {
    gap: 10,
  },
  languageButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1b1e',
    alignItems: 'center',
  },
  activeLanguage: {
    backgroundColor: '#9775fa',
  },
  languageText: {
    color: '#fff',
    fontSize: 16,
  },
  activeLanguageText: {
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});