import {useTranslation} from 'react-i18next';
import {useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useLocalization = () => {
  const {t, i18n} = useTranslation();

  const changeLanguage = useCallback(
    async languageCode => {
      try {
        await i18n.changeLanguage(languageCode);
        await AsyncStorage.setItem('user-language', languageCode);
        return true;
      } catch (error) {
        console.error('Error changing language:', error);
        return false;
      }
    },
    [i18n],
  );

  const getCurrentLanguage = useCallback(() => {
    return i18n.language;
  }, [i18n.language]);

  const getAvailableLanguages = useCallback(() => {
    return [
      {
        code: 'en',
        name: t('common.english'),
        nativeName: 'English',
        flag: '🇺🇸',
      },
      {
        code: 'ta',
        name: t('common.tamil'),
        nativeName: 'தமிழ்',
        flag: '🇮🇳',
      },
      {
        code: 'hi',
        name: t('common.hindi'),
        nativeName: 'हिंदी',
        flag: '🇮🇳',
      },
      {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        flag: '🇮🇹',
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
      },
      {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        flag: '🇵🇹',
      },
      {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        flag: '🇷🇺',
      },
    ];
  }, [t]);

  const isRTL = useCallback(() => {
    return i18n.dir() === 'rtl';
  }, [i18n]);

  const formatNumber = useCallback(
    (number, options = {}) => {
      return new Intl.NumberFormat(i18n.language, options).format(number);
    },
    [i18n.language],
  );

  const formatDate = useCallback(
    (date, options = {}) => {
      const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return new Intl.DateTimeFormat(i18n.language, {
        ...defaultOptions,
        ...options,
      }).format(date);
    },
    [i18n.language],
  );

  const formatTime = useCallback(
    (date, options = {}) => {
      const defaultOptions = {
        hour: '2-digit',
        minute: '2-digit',
      };
      return new Intl.DateTimeFormat(i18n.language, {
        ...defaultOptions,
        ...options,
      }).format(date);
    },
    [i18n.language],
  );

  const formatCurrency = useCallback(
    (amount, currency = 'INR', options = {}) => {
      const defaultOptions = {
        style: 'currency',
        currency,
      };
      return new Intl.NumberFormat(i18n.language, {
        ...defaultOptions,
        ...options,
      }).format(amount);
    },
    [i18n.language],
  );

  return {
    t,
    i18n,
    changeLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
    isRTL,
    formatNumber,
    formatDate,
    formatTime,
    formatCurrency,
  };
};
