import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../components/config/axios';
import { useTranslation } from 'react-i18next';
import theme from '../utils/theme';

// Validation helper functions
const validatePhoneNumber = (phone) => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

const validatePassword = (password) => {
  return password.length >= 6;
};

const validateName = (name) => {
  if (!name || name.trim().length < 2) {
    return false;
  }
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  return nameRegex.test(name.trim());
};

const formatPhoneNumber = (phone) => {
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
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
};

export default function CreateUserModal({ visible, onClose, onUserCreated }) {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    primary_contact: '',
    secondary_contact: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = t('common.validation.nameRequired');
    } else if (!validateName(formData.name)) {
      newErrors.name = t('common.validation.invalidName');
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = t('common.validation.phoneRequired');
    } else if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = t('common.validation.invalidPhone');
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = t('common.validation.passwordRequired');
    } else if (!validatePassword(formData.password)) {
      newErrors.password = t('common.validation.invalidPassword');
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('common.validation.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('common.validation.passwordsDoNotMatch');
    }

    // Validate primary contact (mandatory)
    if (!formData.primary_contact.trim()) {
      newErrors.primary_contact = t('common.validation.primaryContactRequired');
    } else if (!validatePhoneNumber(formData.primary_contact)) {
      newErrors.primary_contact = t('common.validation.invalidPhone');
    }

    // Validate secondary contact (optional)
    if (formData.secondary_contact && !validatePhoneNumber(formData.secondary_contact)) {
      newErrors.secondary_contact = t('common.validation.invalidPhone');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/signup', {
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, ''),
        primary_contact: formData.primary_contact ? formData.primary_contact.replace(/\D/g, '') : '',
        secondary_contact: formData.secondary_contact ? formData.secondary_contact.replace(/\D/g, '') : '',
        password: formData.password,
      });

      if (response.data.success) {
        Alert.alert(t('common.success'), t('admin.userCreatedSuccessfully'));
        setFormData({
          name: '',
          phone: '',
          primary_contact: '',
          secondary_contact: '',
          password: '',
          confirmPassword: '',
        });
        setErrors({});
        if (onUserCreated) onUserCreated();
        if (onClose) onClose();
      } else {
        Alert.alert(t('common.error'), response.data.message || t('admin.failedToCreateEmployee'));
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('admin.failedToCreateEmployee'),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handlePhoneChange = (text) => {
    const formatted = formatPhoneNumber(text);
    setFormData({ ...formData, phone: formatted });
    if (errors.phone) {
      setErrors({ ...errors, phone: null });
    }
  };

  const handleContactChange = (text, field) => {
    const formatted = formatPhoneNumber(text);
    setFormData({ ...formData, [field]: formatted });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      primary_contact: '',
      secondary_contact: '',
      password: '',
      confirmPassword: '',
    });
    setErrors({});
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('admin.createUser')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Icon name="person" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder={t('common.fullName') + ' *'}
                placeholderTextColor="#999"
                value={formData.name}
                onChangeText={text => {
                  setFormData({ ...formData, name: text });
                  if (errors.name) {
                    setErrors({ ...errors, name: null });
                  }
                }}
                autoCapitalize="words"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <View style={styles.inputContainer}>
              <Icon name="phone" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder={t('common.phone') + ' *'}
                placeholderTextColor="#999"
                value={formData.phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

            <View style={styles.inputContainer}>
              <Icon name="warning" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, errors.primary_contact && styles.inputError]}
                placeholder={t('common.primaryContact') + ' *'}
                placeholderTextColor="#999"
                value={formData.primary_contact}
                onChangeText={text => handleContactChange(text, 'primary_contact')}
                keyboardType="phone-pad"
              />
            </View>
            {errors.primary_contact && <Text style={styles.errorText}>{errors.primary_contact}</Text>}

            <View style={styles.inputContainer}>
              <Icon name="warning" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, errors.secondary_contact && styles.inputError]}
                placeholder={t('common.secondaryContact') + ' (' + t('common.optional') + ')'}
                placeholderTextColor="#999"
                value={formData.secondary_contact}
                onChangeText={text => handleContactChange(text, 'secondary_contact')}
                keyboardType="phone-pad"
              />
            </View>
            {errors.secondary_contact && <Text style={styles.errorText}>{errors.secondary_contact}</Text>}

            <View style={styles.inputContainer}>
              <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder={t('common.password') + ' *'}
                placeholderTextColor="#999"
                value={formData.password}
                onChangeText={text => {
                  setFormData({ ...formData, password: text });
                  if (errors.password) {
                    setErrors({ ...errors, password: null });
                  }
                }}
                secureTextEntry
              />
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <View style={styles.inputContainer}>
              <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder={t('common.confirmPassword') + ' *'}
                placeholderTextColor="#999"
                value={formData.confirmPassword}
                onChangeText={text => {
                  setFormData({ ...formData, confirmPassword: text });
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: null });
                  }
                }}
                secureTextEntry
              />
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                resetForm();
                onClose();
              }}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateUser}
              disabled={isCreating}>
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>{t('admin.createUser')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 10,
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
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  createButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
