import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, Modal, AppState, AppStateStatus } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Play, Pause, RefreshCw, Plus, Settings } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useLanguageStore } from '@/stores/language';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '@/lib/i18n/translations';
import { router } from 'expo-router';
import Background from '@/components/Background';

const DURATIONS = [5, 10, 15, 20, 30, 60];
const LAST_DURATION_KEY = 'lastMeditationDuration';
const MEDITATION_STATE_KEY = 'meditationState';

interface WebAudio {
  playAsync: () => Promise<void>;
  setPositionAsync: (position: number) => Promise<void>;
  unloadAsync: () => Promise<void>;
}

interface MeditationState {
  isActive: boolean;
  timeLeft: number;
  endTime: number | null;
}

export default function MeditationScreen() {
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(selectedDuration * 60);
  const soundRef = useRef<Audio.Sound | WebAudio | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const { t, language, setLanguage } = useLanguageStore();
  const { user, signOut } = useAuthStore();
  const appState = useRef(AppState.currentState);
  const endTimeRef = useRef<number | null>(null);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withRepeat(
            withSequence(
              withTiming(1.2, { duration: 1000, easing: Easing.ease }),
              withTiming(1, { duration: 1000, easing: Easing.ease })
            ),
            -1,
            true
          ),
        },
      ],
    };
  });

  // Load saved meditation state
  useEffect(() => {
    const loadMeditationState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(MEDITATION_STATE_KEY);
        if (savedState) {
          const state: MeditationState = JSON.parse(savedState);
          if (state.isActive && state.endTime) {
            const now = Date.now();
            if (now < state.endTime) {
              const remainingTime = Math.ceil((state.endTime - now) / 1000);
              setTimeLeft(remainingTime);
              setIsActive(true);
              endTimeRef.current = state.endTime;
            } else {
              // Meditation ended while app was in background
              await AsyncStorage.removeItem(MEDITATION_STATE_KEY);
              setIsActive(false);
              playGong();
            }
          }
        }
      } catch (error) {
        console.error('Error loading meditation state:', error);
      }
    };

    loadMeditationState();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        if (isActive && endTimeRef.current) {
          const now = Date.now();
          if (now < endTimeRef.current) {
            const remainingTime = Math.ceil((endTimeRef.current - now) / 1000);
            setTimeLeft(remainingTime);
          } else {
            setIsActive(false);
            endTimeRef.current = null;
            await AsyncStorage.removeItem(MEDITATION_STATE_KEY);
            playGong();
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App is going to background
        if (isActive) {
          const state: MeditationState = {
            isActive,
            timeLeft,
            endTime: endTimeRef.current,
          };
          await AsyncStorage.setItem(MEDITATION_STATE_KEY, JSON.stringify(state));
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    let sound: Audio.Sound | WebAudio | null = null;

    const loadSound = async () => {
      try {
        if (Platform.OS === 'web') {
          const audio = new window.Audio(require('../resources/meditation-gong.mp3'));
          sound = {
            async playAsync() {
              try {
                await audio.play();
              } catch (error) {
                console.error('Error playing audio:', error);
              }
            },
            async setPositionAsync(position: number) {
              audio.currentTime = position / 1000;
            },
            async unloadAsync() {
              audio.pause();
              audio.src = '';
            }
          };
        } else {
          const { sound: expSound } = await Audio.Sound.createAsync(
            require('../resources/meditation-gong.mp3'),
            { 
              shouldPlay: false,
              volume: 1.0,
            }
          );
          sound = expSound;
        }
        soundRef.current = sound;
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    };

    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      soundRef.current = null;
    };
  }, []);

  const playGong = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        const now = Date.now();
        if (endTimeRef.current && now >= endTimeRef.current) {
          setIsActive(false);
          setTimeLeft(0);
          endTimeRef.current = null;
          AsyncStorage.removeItem(MEDITATION_STATE_KEY);
          playGong();
        } else {
          setTimeLeft((time) => time - 1);
        }
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      endTimeRef.current = null;
      AsyncStorage.removeItem(MEDITATION_STATE_KEY);
      playGong();
    }

    return () => {
      clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = async () => {
    setIsActive(false);
    setTimeLeft(selectedDuration * 60);
    endTimeRef.current = null;
    await AsyncStorage.removeItem(MEDITATION_STATE_KEY);
  };

  const handleStartPause = async () => {
    if (!isActive) {
      await playGong();
      endTimeRef.current = Date.now() + (timeLeft * 1000);
      const state: MeditationState = {
        isActive: true,
        timeLeft,
        endTime: endTimeRef.current,
      };
      await AsyncStorage.setItem(MEDITATION_STATE_KEY, JSON.stringify(state));
    } else {
      endTimeRef.current = null;
      await AsyncStorage.removeItem(MEDITATION_STATE_KEY);
    }
    setIsActive(!isActive);
  };

  const handleDurationSelect = async (duration: number) => {
    setSelectedDuration(duration);
    setTimeLeft(duration * 60);
    setIsActive(false);
    endTimeRef.current = null;
    await AsyncStorage.removeItem(MEDITATION_STATE_KEY);
    try {
      await AsyncStorage.setItem(LAST_DURATION_KEY, duration.toString());
    } catch (error) {
      console.error('Error saving duration:', error);
    }
  };

  const handleCustomDuration = async () => {
    const duration = parseInt(customDuration);
    if (duration > 0) {
      await handleDurationSelect(duration);
      setShowCustomModal(false);
      setCustomDuration('');
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

  return (
    <Background>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}>
          <Settings size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.durationContainer}>
          {DURATIONS.map((duration) => (
            <TouchableOpacity
              key={duration}
              style={[
                styles.durationButton,
                selectedDuration === duration && styles.selectedDuration,
              ]}
              onPress={() => handleDurationSelect(duration)}>
              <Text
                style={[
                  styles.durationText,
                  selectedDuration === duration && styles.selectedDurationText,
                ]}>
                {duration}m
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.durationButton}
            onPress={() => setShowCustomModal(true)}>
            <Plus size={20} color="#a1a1aa" />
          </TouchableOpacity>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.timerContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleStartPause}
              style={styles.timerButton}>
              <Animated.View style={[styles.pulseCircle, pulseStyle]}>
                <View style={styles.innerCircle}>
                  <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleStartPause}>
              {isActive ? (
                <Pause size={32} color="#fff" />
              ) : (
                <Play size={32} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
              <RefreshCw size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={showCustomModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCustomModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Custom Duration</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="number-pad"
                placeholder="Enter minutes"
                placeholderTextColor="#a1a1aa"
                value={customDuration}
                onChangeText={setCustomDuration}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowCustomModal(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleCustomDuration}>
                  <Text style={styles.modalButtonText}>Set</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
    paddingTop: Platform.OS === 'web' ? 40 : 60,
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
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    padding: 30,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 120,
  },
  durationButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(44, 45, 49, 0.8)',
    minWidth: 60,
    alignItems: 'center',
  },
  selectedDuration: {
    backgroundColor: '#9775fa',
  },
  durationText: {
    color: '#a1a1aa',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedDurationText: {
    color: '#fff',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    transform: [{ translateY: -20 }],
  },
  timerButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(44, 45, 49, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(151, 117, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#9775fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
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
  modalInput: {
    backgroundColor: '#1a1b1e',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  confirmButton: {
    backgroundColor: '#9775fa',
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