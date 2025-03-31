import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      const user = { id: data.user.id, email: data.user.email! };
      set({ user });
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
  },
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      const user = { id: data.user.id, email: data.user.email! };
      set({ user });
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
    await AsyncStorage.removeItem('user');
  },
  checkUser: async () => {
    try {
      // First check AsyncStorage for cached user
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        set({ user: JSON.parse(storedUser), loading: false });
        return;
      }

      // If no cached user, check session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Set up auth state change listener
      supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ? {
          id: session.user.id,
          email: session.user.email!
        } : null;

        set({ user, loading: false });
        
        // Update AsyncStorage
        if (user) {
          AsyncStorage.setItem('user', JSON.stringify(user));
        } else {
          AsyncStorage.removeItem('user');
        }
      });

      // Set initial user state
      set({ 
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email!
        } : null,
        loading: false
      });
    } catch (error) {
      console.error('Error checking user:', error);
      set({ user: null, loading: false });
    }
  },
}));