import { create } from 'zustand';
import { Language, translations, getStoredLanguage, setStoredLanguage } from '@/lib/i18n/translations';

interface LanguageState {
  language: Language;
  t: (key: keyof typeof translations.en) => string;
  setLanguage: (lang: Language) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  t: (key) => translations[get().language][key],
  setLanguage: async (lang) => {
    await setStoredLanguage(lang);
    set({ language: lang });
  },
  initialize: async () => {
    const storedLang = await getStoredLanguage();
    set({ language: storedLang });
  },
}));