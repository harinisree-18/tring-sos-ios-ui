import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from './config/axios';
import { useTranslation } from 'react-i18next';
import theme from '../utils/theme';

// Validation helper functions
const validatePhoneNumber = phone => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

const validatePassword = password => {
  return password.length >= 6;
};

const validateName = name => {
  if (!name || name.trim().length < 2) {
    return false;
  }
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  return nameRegex.test(name.trim());
};

const formatPhoneNumber = phone => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  } else if (cleaned.length <= 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(
      6,
      10,
    )}`;
  }
};

export default function SignUp({ onClose, onSignUpSuccess }) {
  const { t } = useTranslation();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    phone: '',
    primary_contact: '',
    secondary_contact: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [modalType, setModalType] = useState('terms'); // 'terms' or 'privacy'

  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!newUser.name.trim()) {
      newErrors.name = t('common.validation.nameRequired');
    } else if (!validateName(newUser.name)) {
      newErrors.name = t('common.validation.invalidName');
    }

    // Validate phone
    if (!newUser.phone.trim()) {
      newErrors.phone = t('common.validation.phoneRequired');
    } else if (!validatePhoneNumber(newUser.phone)) {
      newErrors.phone = t('common.validation.invalidPhone');
    }

    // Validate password
    if (!newUser.password) {
      newErrors.password = t('common.validation.passwordRequired');
    } else if (!validatePassword(newUser.password)) {
      newErrors.password = t('common.validation.invalidPassword');
    }

    // Validate confirm password
    if (!newUser.confirmPassword) {
      newErrors.confirmPassword = t('common.validation.confirmPasswordRequired');
    } else if (newUser.password !== newUser.confirmPassword) {
      newErrors.confirmPassword = t('common.validation.passwordsDoNotMatch');
    }

    // Validate primary contact (mandatory)
    if (!newUser.primary_contact.trim()) {
      newErrors.primary_contact = t('common.validation.primaryContactRequired');
    } else if (!validatePhoneNumber(newUser.primary_contact)) {
      newErrors.primary_contact = t('common.validation.invalidPhone');
    }

    // Validate secondary contact (optional)
    if (
      newUser.secondary_contact &&
      !validatePhoneNumber(newUser.secondary_contact)
    ) {
      newErrors.secondary_contact = t('common.validation.invalidPhone');
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      newErrors.terms = 'Please agree to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSigningUp(true);
    try {
      console.log(newUser);
      const response = await api.post('/auth/signup', {
        name: newUser.name.trim(),
        phone: newUser.phone.replace(/\D/g, '')?.replaceAll('-', '')?.toString(),
        primary_contact: newUser.primary_contact
          ? newUser.primary_contact.replace(/\D/g, '')?.replaceAll('-', '')?.toString()
          : '',
        secondary_contact: newUser.secondary_contact
          ? newUser.secondary_contact.replace(/\D/g, '')?.replaceAll('-', '')?.toString()
          : '',
        password: newUser.password,
        // primary_contact: newUser.primary_contact.toString(),
        // secondary_contact: newUser.secondary_contact.toString(),
        role_id: 1,
      });
      if (response.status == 201) {
        setNewUser({
          name: '',
          phone: '',
          primary_contact: '',
          secondary_contact: '',
          password: '',
          confirmPassword: '',
        });
        setErrors({});
        setAcceptedTerms(false);
        if (onSignUpSuccess) onSignUpSuccess();
        if (onClose) onClose();
      } else {
        Alert.alert(t('common.error'), response.data.message || t('common.signUpFailed'));
      }
    } catch (error) {
      console.log('error', error);
      console.log('errorsdf', error.response?.data);
      Alert.alert(t('common.error'), t('common.signUpFailed'));
    } finally {
      setIsSigningUp(false);
    }
  };

  const handlePhoneChange = text => {
    const formatted = formatPhoneNumber(text);
    setNewUser({ ...newUser, phone: formatted });
    if (errors.phone) {
      setErrors({ ...errors, phone: null });
    }
  };

  const handleContactChange = (text, field) => {
    const formatted = formatPhoneNumber(text);
    setNewUser({ ...newUser, [field]: formatted });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const openTermsModal = () => {
    setModalType('terms');
    setShowTermsModal(true);
  };

  const openPrivacyModal = () => {
    setModalType('privacy');
    setShowPrivacyModal(true);
  };

  const closeModal = () => {
    setShowTermsModal(false);
    setShowPrivacyModal(false);
  };

  return (
    <View style={styles.pageContainer}>
      <View style={styles.pageContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.modalTitle}>{t('common.signUp')}</Text>
        </View>
        <ScrollView>
          <View style={styles.inputContainer}>
            <Icon
              name="person"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder={t('common.fullName') + ' *'}
              placeholderTextColor="#999"
              value={newUser.name}
              onChangeText={text => {
                setNewUser({ ...newUser, name: text });
                if (errors.name) {
                  setErrors({ ...errors, name: null });
                }
              }}
              autoCapitalize="words"
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <View style={styles.inputContainer}>
            <Icon
              name="phone"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder={t('common.phone') + ' *'}
              placeholderTextColor="#999"
              value={newUser.phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <View style={styles.inputContainer}>
            <Icon
              name="warning"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                errors.primary_contact && styles.inputError,
              ]}
              placeholder={t('common.primaryContact') + ' *'}
              placeholderTextColor="#999"
              value={newUser.primary_contact}
              onChangeText={text =>
                handleContactChange(text, 'primary_contact')
              }
              keyboardType="phone-pad"
            />
          </View>
          {errors.primary_contact && (
            <Text style={styles.errorText}>{errors.primary_contact}</Text>
          )}

          <View style={styles.inputContainer}>
            <Icon
              name="warning"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                errors.secondary_contact && styles.inputError,
              ]}
              placeholder={t('common.secondaryContact') + ' (' + t('common.optional') + ')'}
              placeholderTextColor="#999"
              value={newUser.secondary_contact}
              onChangeText={text =>
                handleContactChange(text, 'secondary_contact')
              }
              keyboardType="phone-pad"
            />
          </View>
          {errors.secondary_contact && (
            <Text style={styles.errorText}>{errors.secondary_contact}</Text>
          )}

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder={t('common.password') + ' *'}
              placeholderTextColor="#999"
              value={newUser.password}
              onChangeText={text => {
                setNewUser({ ...newUser, password: text });
                if (errors.password) {
                  setErrors({ ...errors, password: null });
                }
              }}
              secureTextEntry
            />
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                errors.confirmPassword && styles.inputError,
              ]}
              placeholder={t('common.confirmPassword') + ' *'}
              placeholderTextColor="#999"
              value={newUser.confirmPassword}
              onChangeText={text => {
                setNewUser({ ...newUser, confirmPassword: text });
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: null });
                }
              }}
              secureTextEntry
            />
          </View>
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}

          {/* Terms and Conditions Section */}
          <View style={styles.termsContainer}>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
                onPress={() => setAcceptedTerms(!acceptedTerms)}>
                {acceptedTerms && (
                  <Icon name="check" size={16} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={openTermsModal}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text style={styles.termsLink} onPress={openPrivacyModal}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
            
            {errors.terms && (
              <Text style={styles.errorText}>{errors.terms}</Text>
            )}
          </View>
        </ScrollView>
        <View style={styles.modalButtonContainer}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}>
            <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.createButton]}
            onPress={handleSignUp}
            disabled={isSigningUp}>
            {isSigningUp ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.modalButtonText}>{t('common.signUp')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('common.alreadyHaveAccount')}{' '}
            <Text style={styles.footerLink} onPress={onClose}>
              {t('common.signInText')}
            </Text>
          </Text>
        </View>
      </View>

      {/* Terms and Conditions Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeModal}>
        <View style={styles.fullScreenOverlay}>
          <View style={styles.fullScreenHeader}>
            <Text style={styles.fullScreenTitle}>Terms of Service</Text>
            <TouchableOpacity onPress={closeModal} style={styles.fullScreenCloseButton}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.fullScreenBody}
            contentContainerStyle={styles.fullScreenScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            alwaysBounceVertical={true}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}>
            <View style={styles.fullScreenTextContainer}>
              <Text style={styles.fullScreenText}>
                <Text style={styles.fullScreenSectionTitle}>1. Acceptance of Terms</Text>{'\n\n'}
                By accessing and using this Women's Safety App, you accept and agree to be bound by the terms and provision of this agreement.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>2. Use License</Text>{'\n\n'}
                Permission is granted to temporarily download one copy of the app per device for personal, non-commercial transitory viewing only.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>3. Safety Features</Text>{'\n\n'}
                This app is designed for women's safety and emergency situations. Users acknowledge that the app's safety features are supplementary and should not replace proper emergency services.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>4. Location Services</Text>{'\n\n'}
                The app requires access to your location for safety features. Location data is used only for emergency purposes and is kept confidential.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>5. Emergency Contacts</Text>{'\n\n'}
                You are responsible for maintaining accurate emergency contact information. The app will use this information only in emergency situations.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>6. Disclaimer</Text>{'\n\n'}
                The app is provided "as is" without warranties. We are not liable for any damages arising from the use of this app.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>7. Modifications</Text>{'\n\n'}
                We reserve the right to modify these terms at any time. Continued use of the app constitutes acceptance of modified terms.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeModal}>
        <View style={styles.fullScreenOverlay}>
          <View style={styles.fullScreenHeader}>
            <Text style={styles.fullScreenTitle}>Privacy Policy</Text>
            <TouchableOpacity onPress={closeModal} style={styles.fullScreenCloseButton}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.fullScreenBody}
            contentContainerStyle={styles.fullScreenScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            alwaysBounceVertical={true}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}>
            <View style={styles.fullScreenTextContainer}>
              <Text style={styles.fullScreenText}>
                <Text style={styles.fullScreenSectionTitle}>1. Information We Collect</Text>{'\n\n'}
                We collect personal information including your name, phone number, emergency contacts, and location data when you use our safety features.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>2. How We Use Your Information</Text>{'\n\n'}
                Your information is used solely for safety and emergency purposes. This includes sharing your location with emergency contacts during SOS alerts.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>3. Location Data</Text>{'\n\n'}
                Location data is collected only when you use safety features. This data is encrypted and used exclusively for emergency situations.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>4. Emergency Contacts</Text>{'\n\n'}
                Your emergency contacts' information is stored securely and used only to notify them during emergency situations.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>5. Data Security</Text>{'\n\n'}
                We implement industry-standard security measures to protect your personal information. All data is encrypted and stored securely.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>6. Third-Party Sharing</Text>{'\n\n'}
                We do not sell, trade, or otherwise transfer your personal information to third parties, except as required by law or for emergency services.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>7. Your Rights</Text>{'\n\n'}
                You have the right to access, modify, or delete your personal information at any time through the app settings.{'\n\n'}
                
                <Text style={styles.fullScreenSectionTitle}>8. Contact Us</Text>{'\n\n'}
                If you have questions about this privacy policy, please contact us through the app's support features.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pageContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '100%',
    maxWidth: 400,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderBottomColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: -5,
    marginBottom: 5,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  createButton: {
    backgroundColor: theme.colors.primary,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#1a237e',
    fontWeight: 'bold',
  },
  // Terms and Conditions Styles
  termsContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 3,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  termsLink: {
    color: theme.colors.primary,
    fontSize: 13,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  // Full Screen Overlay Styles (Updated for better scrolling)
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: theme.colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fullScreenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  fullScreenCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullScreenBody: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullScreenScrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  fullScreenTextContainer: {
    flex: 1,
    minHeight: '100%',
  },
  fullScreenText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'left',
  },
  fullScreenSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 20,
    marginBottom: 10,
  },
});