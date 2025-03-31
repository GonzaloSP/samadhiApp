import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Clock, Flame, Calendar, Settings, History } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useLanguageStore } from '@/stores/language';
import { Language } from '@/lib/i18n/translations';
import Background from '@/components/Background';

interface UserStats {
  total_minutes: number;
  current_streak: number;
  total_sessions: number;
}

export default function StatsScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<number[]>(Array(7).fill(0));
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { user, signOut } = useAuthStore();
  const { t, language, setLanguage } = useLanguageStore();

  const weekDays = [
    { key: 'mon', label: 'L' },
    { key: 'tue', label: 'M' },
    { key: 'wed', label: 'X' },
    { key: 'thu', label: 'J' },
    { key: 'fri', label: 'V' },
    { key: 'sat', label: 'S' },
    { key: 'sun', label: 'D' }
  ];

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const { data: statsData, error: statsError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (statsError) throw statsError;
        setStats(statsData);

        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        
        const { data: weeklyStats, error: weeklyError } = await supabase
          .from('meditation_sessions')
          .select('duration, started_at')
          .eq('user_id', user.id)
          .gte('started_at', weekStart.toISOString())
          .order('started_at', { ascending: true });

        if (weeklyError) throw weeklyError;

        const weekData = Array(7).fill(0);
        let total = 0;
        weeklyStats?.forEach(session => {
          const day = new Date(session.started_at).getDay();
          weekData[day] += session.duration;
          total += session.duration;
        });
        setWeeklyData(weekData);
        setWeeklyTotal(Math.round(total / 60)); // Convert to minutes
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();

    const subscription = supabase
      .channel('stats_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_stats',
        filter: `user_id=eq.${user.id}`,
      }, fetchStats)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

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

  if (!stats) {
    return (
      <Background>
        <View style={[styles.container, styles.centered]}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettingsModal(true)}>
            <Settings size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.loadingText}>{t('loadingStats')}</Text>
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

        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('meditationJourney')}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Clock size={24} color="#9775fa" />
              <Text style={styles.statValue}>{stats.total_minutes}</Text>
              <Text style={styles.statLabel}>{t('minutesToday')}</Text>
            </View>

            <View style={styles.statCard}>
              <Flame size={24} color="#9775fa" />
              <Text style={styles.statValue}>{stats.current_streak}</Text>
              <Text style={styles.statLabel}>{t('dayStreak')}</Text>
            </View>

            <View style={styles.statCard}>
              <Calendar size={24} color="#9775fa" />
              <Text style={styles.statValue}>{stats.total_sessions}</Text>
              <Text style={styles.statLabel}>{t('sessions')}</Text>
            </View>
          </View>

          <View style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <History size={24} color="#9775fa" />
              <Text style={styles.weeklyTitle}>This Week</Text>
            </View>
            <Text style={styles.weeklyTotal}>{weeklyTotal} minutes</Text>
          </View>

          <View style={styles.weeklyProgress}>
            <Text style={styles.sectionTitle}>{t('weeklyProgress')}</Text>
            <View style={styles.progressBars}>
              {weekDays.map((day, index) => (
                <View key={day.key} style={styles.dayProgress}>
                  <View 
                    style={[
                      styles.progressBar,
                      { height: `${(weeklyData[index] / Math.max(...weeklyData)) * 100 || 0}%` }
                    ]} 
                  />
                  <Text style={styles.dayLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.achievements}>
            <Text style={styles.sectionTitle}>{t('achievements')}</Text>
            <View style={styles.achievementsList}>
              {['Early Bird', 'Zen Master', 'Consistent'].map((achievement) => (
                <View key={achievement} style={styles.achievementCard}>
                  <Text style={styles.achievementTitle}>{achievement}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  statCard: {
    backgroundColor: 'rgba(44, 45, 49, 0.8)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    width: '30%',
  },
  weeklyCard: {
    backgroundColor: 'rgba(44, 45, 49, 0.8)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    marginHorizontal: 20,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  weeklyTotal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  weeklyProgress: {
    backgroundColor: 'rgba(44, 45, 49, 0.8)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  progressBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 150,
    alignItems: 'flex-end',
  },
  dayProgress: {
    width: 30,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    backgroundColor: '#9775fa',
    borderRadius: 5,
  },
  dayLabel: {
    color: '#a1a1aa',
    marginTop: 8,
  },
  achievements: {
    backgroundColor: 'rgba(44, 45, 49, 0.8)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    marginHorizontal: 20,
  },
  achievementsList: {
    gap: 10,
  },
  achievementCard: {
    backgroundColor: 'rgba(26, 27, 30, 0.8)',
    padding: 15,
    borderRadius: 10,
  },
  achievementTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(44, 45, 49, 0.8)',
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(26, 27, 30, 0.8)',
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