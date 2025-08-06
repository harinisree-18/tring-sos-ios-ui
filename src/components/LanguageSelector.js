import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LanguageSelector = ({ visible, onClose, onLanguageChange }) => {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  const languages = [
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

  const handleLanguageChange = async languageCode => {
    try {
      setSelectedLanguage(languageCode);

      // Find the selected language object to get the native name
      const selectedLanguageObj = languages.find(lang => lang.code === languageCode);
      const languageName = selectedLanguageObj ? selectedLanguageObj.nativeName : languageCode;

      // Change the language
      await i18n.changeLanguage(languageCode);

      // Save the language preference
      await AsyncStorage.setItem('user-language', languageCode);

      // Notify parent component
      if (onLanguageChange) {
        onLanguageChange(languageCode);
      }

      // Close the modal
      onClose();

      // Show success message with language name
      Alert.alert(
        t('common.success'),
        t('common.languageChanged', { languageName }),
        [{ text: t('common.ok') }],
      );
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(t('common.error'), t('errors.unknownError'), [
        { text: t('common.ok') },
      ]);
    }
  };

  const LanguageOption = ({ language }) => (
    <TouchableOpacity
      style={[
        styles.languageOption,
        selectedLanguage === language.code && styles.selectedLanguage,
      ]}
      onPress={() => handleLanguageChange(language.code)}>
      <View style={styles.languageInfo}>
        <Text style={styles.flag}>{language.flag}</Text>
        <View style={styles.languageText}>
          <Text
            style={[
              styles.languageName,
              selectedLanguage === language.code && styles.selectedLanguageText,
            ]}>
            {language.nativeName}
          </Text>
          <Text
            style={[
              styles.languageNameSecondary,
              selectedLanguage === language.code &&
              styles.selectedLanguageTextSecondary,
            ]}>
            {language.name}
          </Text>
        </View>
      </View>
      {selectedLanguage === language.code && (
        <Icon name="check" size={24} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('common.language')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.languageList}
            contentContainerStyle={{ paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}>
            {languages.map(language => (
              <LanguageOption key={language.code} language={language} />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  languageList: {
    padding: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
  },
  selectedLanguage: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 24,
    marginRight: 15,
  },
  languageText: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  languageNameSecondary: {
    fontSize: 14,
    color: '#666',
  },
  selectedLanguageText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedLanguageTextSecondary: {
    color: '#007AFF',
  },
});

export default LanguageSelector;
