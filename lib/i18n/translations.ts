import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the system language
const getSystemLanguage = (): string => {
  try {
    if (Platform.OS === 'ios') {
      if (
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      ) {
        return (
          NativeModules.SettingsManager.settings.AppleLocale ||
          NativeModules.SettingsManager.settings.AppleLanguages[0]
        ).slice(0, 2);
      }
    } else if (Platform.OS === 'android') {
      if (NativeModules.I18nManager?.localeIdentifier) {
        return NativeModules.I18nManager.localeIdentifier.slice(0, 2);
      }
    } else if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return navigator.language.slice(0, 2);
    }
  } catch (error) {
    console.warn('Error getting system language:', error);
  }
  return 'en';
};

export type Language = 'en' | 'es';

export const translations = {
  en: {
    // Auth
    welcomeBack: 'Welcome Back',
    continueJourney: 'Continue your meditation journey',
    createAccount: 'Create Account',
    startJourney: 'Start your meditation journey today',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    invalidCredentials: 'Invalid email or password',
    accountError: 'Error creating account. Please try again.',
    haveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",

    // Meditation
    meditate: 'Meditate',
    minutes: 'm',
    reset: 'Reset',

    // Stats
    meditationJourney: 'Your Meditation Journey',
    minutesToday: 'Minutes Today',
    dayStreak: 'Day Streak',
    sessions: 'Sessions',
    weeklyProgress: 'Weekly Progress',
    achievements: 'Achievements',
    loadingStats: 'Loading stats...',

    // Map
    globalMeditation: 'Meditators',
    shareLocation: 'Share My Location',
    stopSharing: 'Stop Sharing Location',
    meditatingNow: 'person meditating',
    meditatingNowPlural: 'people meditating',
    loginRequired: 'You must be logged in to share your location',
    locationError: 'Error updating meditation status',
    mapUnavailable: 'Map view is not available on web platform.\nPlease use the mobile app to access this feature.',
    mapLoadError: 'Unable to load map component.\nPlease try again later.',
    locationPrivacyNotice: 'We do not share your precise location for safety reasons',

    // Profile
    profile: 'Profile',
    language: 'Language',
    english: 'English',
    spanish: 'Spanish',
    signOut: 'Sign Out',
  },
  es: {
    // Auth
    welcomeBack: 'Bienvenido de nuevo',
    continueJourney: 'Continúa tu viaje de meditación',
    createAccount: 'Crear cuenta',
    startJourney: 'Comienza tu viaje de meditación hoy',
    email: 'Correo electrónico',
    password: 'Contraseña',
    signIn: 'Iniciar sesión',
    signUp: 'Registrarse',
    invalidCredentials: 'Correo o contraseña inválidos',
    accountError: 'Error al crear la cuenta. Por favor, inténtalo de nuevo.',
    haveAccount: '¿Ya tienes una cuenta?',
    noAccount: '¿No tienes una cuenta?',

    // Meditation
    meditate: 'Meditar',
    minutes: 'm',
    reset: 'Reiniciar',

    // Stats
    meditationJourney: 'Tu viaje de meditación',
    minutesToday: 'Minutos hoy',
    dayStreak: 'Racha diaria',
    sessions: 'Sesiones',
    weeklyProgress: 'Progreso semanal',
    achievements: 'Logros',
    loadingStats: 'Cargando estadísticas...',

    // Map
    globalMeditation: 'Meditadores',
    shareLocation: 'Compartir mi ubicación',
    stopSharing: 'Dejar de compartir',
    meditatingNow: 'persona meditando',
    meditatingNowPlural: 'personas meditando',
    loginRequired: 'Debes iniciar sesión para compartir tu ubicación',
    locationError: 'Error al actualizar el estado de meditación',
    mapUnavailable: 'La vista del mapa no está disponible en la plataforma web.\nPor favor, usa la aplicación móvil para acceder a esta función.',
    mapLoadError: 'No se pudo cargar el componente del mapa.\nPor favor, inténtalo de nuevo más tarde.',
    locationPrivacyNotice: 'No compartimos tu ubicación exacta por razones de seguridad',

    // Profile
    profile: 'Perfil',
    language: 'Idioma',
    english: 'Inglés',
    spanish: 'Español',
    signOut: 'Cerrar sesión',
  }
};

export const getStoredLanguage = async (): Promise<Language> => {
  try {
    const storedLang = await AsyncStorage.getItem('userLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'es')) {
      return storedLang;
    }
    const systemLang = getSystemLanguage();
    return systemLang === 'es' ? 'es' : 'en';
  } catch (error) {
    console.error('Error getting stored language:', error);
    return 'en';
  }
};

export const setStoredLanguage = async (language: Language) => {
  try {
    await AsyncStorage.setItem('userLanguage', language);
  } catch (error) {
    console.error('Error storing language:', error);
  }
};