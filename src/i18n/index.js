import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {I18nManager} from 'react-native';

// Import translation files
import en from './locales/en.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';
import it from './locales/it.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';

const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: async callback => {
    try {
      // Get stored language preference
      const storedLanguage = await AsyncStorage.getItem('user-language');
      if (storedLanguage) {
        console.log('Detected stored language:', storedLanguage);
        callback(storedLanguage);
        return;
      }

      // Get device language
      const deviceLanguage = I18nManager.isRTL ? 'ar' : 'en';
      console.log('No stored language, using device language:', deviceLanguage);
      callback(deviceLanguage);
    } catch (error) {
      console.error('Error detecting language:', error);
      callback('en'); // Always call callback!
    }
  },
  init: () => {},
  cacheUserLanguage: async language => {
    try {
      await AsyncStorage.setItem('user-language', language);
    } catch (error) {
      console.error('Error caching language:', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ta: { translation: ta },
      hi: { translation: hi },
      it: { translation: it },
      es: { translation: es },
      fr: { translation: fr },
      pt: { translation: pt },
      ru: { translation: ru },
    },
    fallbackLng: 'en',
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
