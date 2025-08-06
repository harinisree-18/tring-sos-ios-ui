import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import CustomCountryPicker, { validatePhoneNumber, getPhonePlaceholder } from './CustomCountryPicker';
import theme from '../utils/theme';
import axios from './config/axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ForgotPassword = ({ onClose }) => {
  const [countryCode, setCountryCode] = useState('IN');
  const [country, setCountry] = useState({ 
    cca2: 'IN', 
    name: 'India',
    callingCode: ['91'], 
    flag: '🇮🇳',
    phoneLength: [10]
  });
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  
  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRefs = useRef([]);

  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'password'
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordFieldError, setPasswordFieldError] = useState({ new: '', confirm: '' });
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const onSelect = (selectedCountry) => {
    setCountryCode(selectedCountry.cca2);
    setCountry(selectedCountry);
    // Clear phone number and error when country changes
    setPhone('');
    setPhoneError('');
  };

  const handlePhoneChange = (text) => {
    // Only allow digits
    const cleanText = text.replace(/\D/g, '');
    setPhone(cleanText);
    
    // Clear error when user starts typing
    if (phoneError) {
      setPhoneError('');
    }
  };

  const validatePhone = () => {
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }

    const validation = validatePhoneNumber(phone, country.cca2);
    if (!validation.isValid) {
      setPhoneError(validation.message);
      return false;
    }

    setPhoneError('');
    return true;
  };

  // Timer effect
  useEffect(() => {
    if (!otpSent) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          setIsResendDisabled(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [otpSent]);

  // Update step on OTP sent/verified
  useEffect(() => {
    if (otpSent) setStep('otp');
  }, [otpSent]);

  // Password validation
  useEffect(() => {
    if (step === 'password') {
      if (!newPassword || !confirmPassword) {
        setPasswordError('');
      } else if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match');
      } else {
        setPasswordError('');
      }
    }
  }, [newPassword, confirmPassword, step]);

  useEffect(() => {
    if (
      newPassword &&
      confirmPassword &&
      newPassword !== confirmPassword
    ) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  }, [newPassword, confirmPassword]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (text, index) => {
    if (text.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!validatePhone()) {
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+${country.callingCode[0]}${phone}`;
      console.log('Requesting OTP for:', fullPhone);
      
      const res = await axios.post('/otp/request', {
        phoneNumber: fullPhone,
        scenario: 'FP', // FP = Forgot Password
      });
      
      if (res.data.success) {
        setOtpSent(true);
        setTimeLeft(300);
        setIsResendDisabled(true);
        Alert.alert(
          'OTP Sent',
          res.data.message || `A verification code has been sent to ${fullPhone}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (err) {
      console.error('OTP Request Error:', err.response?.data || err.message);
      
      if (err.response?.status === 500) {
        Alert.alert('Error', 'Something went wrong on our end. Please try again later.');
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to request OTP. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    try {
      const fullPhone = `+${country.callingCode[0]}${phone}`;
      const res = await axios.post('/otp/verify', {
        phoneNumber: fullPhone,
        otp: otpString
      });

      if (res.data.success) {
        setStep('password');
        setPasswordError('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (err) {
      console.error('OTP Verification Error:', err.response?.data || err.message);
      if (err.response?.status === 500) {
        Alert.alert('Error', 'Something went wrong on our end. Please try again later.');
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to verify OTP. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      const fullPhone = `+${country.callingCode[0]}${phone}`;
      const res = await axios.post('/otp/request', {
        phoneNumber: fullPhone,
        scenario: 'FP',
      });

      if (res.data.success) {
        Alert.alert('OTP Resent', res.data.message || 'A new verification code has been sent.');
        setTimeLeft(300);
        setIsResendDisabled(true);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (err) {
      console.error('Resend OTP Error:', err.response?.data || err.message);
      
      if (err.response?.status === 500) {
        Alert.alert('Error', 'Something went wrong on our end. Please try again later.');
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to resend OTP. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {step === 'phone' && 'Forgot Password'}
          {step === 'otp' && 'Verification'}
          {step === 'password' && 'New Password'}
        </Text>
        
        {/* PHONE STEP */}
        {step === 'phone' && (
          <>
            <View style={styles.inputRow}>
              <TouchableOpacity onPress={() => setShowCountryPicker(true)} style={styles.countryButton}>
                <Text style={styles.countryFlag}>{country.flag}</Text>
              </TouchableOpacity>
              <Text style={styles.callingCode}>+{country.callingCode[0]}</Text>
              <TextInput
                style={styles.input}
                placeholder={getPhonePlaceholder(country.cca2)}
                placeholderTextColor="#888"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={handlePhoneChange}
                maxLength={Math.max(...country.phoneLength)}
              />
            </View>
            {phoneError && (
              <Text style={styles.errorText}>{phoneError}</Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Request OTP</Text>}
            </TouchableOpacity>
          </>
        )}
        {/* OTP STEP */}
        {step === 'otp' && (
          <>
            <View style={styles.phoneDisplayRow}>
              <Text style={styles.phoneDisplayText}>
                {country.flag} +{country.callingCode[0]} {phone}
              </Text>
            </View>
            
            <Text style={styles.otpLabel}>Enter 6-digit verification code</Text>
            
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    focusedIndex === index && styles.otpInputFocused
                  ]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(-1)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <View style={styles.timerContainer}>
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={isResendDisabled || isResending}
              >
                <Text style={[styles.timerText, !isResendDisabled && styles.resendLinkText]}>
                  {timeLeft > 0 ? `Resend code in ${formatTime(timeLeft)}` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, (otp.join('').length !== 6 || isVerifying) && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={otp.join('').length !== 6 || isVerifying}
            >
              {isVerifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
            </TouchableOpacity>
          </>
        )}
        {/* PASSWORD STEP */}
        {step === 'password' && (
          <>
            <View style={styles.passwordInputRow}>
                              <TextInput
                  style={styles.passwordInput}
                  placeholder="New Password"
                  placeholderTextColor="#888"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                onChangeText={text => {
                  setNewPassword(text);
                  // Clear error when user starts typing or meets requirement
                  if (text.length >= 6 || text.length === 0) {
                    setPasswordFieldError(prev => ({ ...prev, new: '' }));
                  }
                  setPasswordError(''); // Clear backend error when typing
                }}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(v => !v)}>
                <Icon
                  name={showNewPassword ? 'visibility' : 'visibility-off'}
                  size={22}
                  color="#222"
                />
              </TouchableOpacity>
            </View>
            {passwordFieldError.new ? <Text style={styles.errorText}>{passwordFieldError.new}</Text> : null}
            {newPassword && newPassword.length < 6 && (
              <Text style={styles.helperText}>Password must be at least 6 characters</Text>
            )}

            <View style={styles.passwordInputRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm New Password"
                placeholderTextColor="#888"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  // Clear error when user starts typing or meets requirement
                  if (text.length >= 6 || text.length === 0) {
                    setPasswordFieldError(prev => ({ ...prev, confirm: '' }));
                  }
                  setPasswordError(''); // Clear backend error when typing
                }}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)}>
                <Icon
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={22}
                  color="#222"
                />
              </TouchableOpacity>
            </View>
            {passwordFieldError.confirm ? <Text style={styles.errorText}>{passwordFieldError.confirm}</Text> : null}
            {confirmPassword && confirmPassword.length < 6 && (
              <Text style={styles.helperText}>Password must be at least 6 characters</Text>
            )}

            {/* Show mismatch error above the button */}
            {(newPassword && confirmPassword && newPassword !== confirmPassword) ? (
              <Text style={styles.errorText}>Passwords do not match</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, isSettingPassword && styles.buttonDisabled]}
              disabled={isSettingPassword}
              onPress={async () => {
                let newErr = '';
                let confirmErr = '';
                if (!newPassword) {
                  newErr = 'Password is required';
                } else if (newPassword.length < 6) {
                  newErr = 'Password must be at least 6 characters';
                }
                if (!confirmPassword) {
                  confirmErr = 'Password is required';
                } else if (confirmPassword.length < 6) {
                  confirmErr = 'Password must be at least 6 characters';
                }
                setPasswordFieldError({ new: newErr, confirm: confirmErr });
                // Do not call backend if passwords do not match or validation fails
                if (newErr || confirmErr || (newPassword && confirmPassword && newPassword !== confirmPassword)) return;
                setPasswordError(''); // Only clear backend error
                setIsSettingPassword(true);
                try {
                  const fullPhone = `+${country.callingCode[0]}${phone}`;
                  const res = await axios.post('/auth/forgot-password', {
                    phoneNumber: fullPhone,
                    newPassword,
                    confirmPassword,
                  });
                  if (res.data.success) {
                    Alert.alert('Success', res.data.message || 'Password updated successfully!', [
                      { text: 'OK', onPress: onClose }
                    ]);
                  } else {
                    setPasswordError(res.data.message || 'Failed to update password.');
                  }
                } catch (err) {
                  if (err.response?.status === 500) {
                    setPasswordError('Something went wrong on our end. Please try again later.');
                  } else {
                    const errorMessage = err.response?.data?.message || 'Failed to update password. Please try again.';
                    setPasswordError(errorMessage);
                  }
                } finally {
                  setIsSettingPassword(false);
                }
              }}
            >
              <Text style={styles.buttonText}>{isSettingPassword ? 'Setting...' : 'Set New Password'}</Text>
            </TouchableOpacity>
            {/* Show backend error below the button if needed */}
            {/* {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null} */}
          </>
        )}
        
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Back to </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CustomCountryPicker
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={onSelect}
        selectedCountry={country}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a237e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '100%',
    maxWidth: 400,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  countryButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  countryFlag: {
    fontSize: 24,
  },
  callingCode: {
    fontSize: 16,
    marginHorizontal: 8,
    color: '#333',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginBottom: 10,
  },
  helpText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#1a237e',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#b0b8d1', // lighter blue for disabled
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    justifyContent: 'center',
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#1a237e',
  },
  footerLink: {
    fontSize: 14,
    color: '#1a237e',
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // OTP styles
  phoneDisplayRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  phoneDisplayText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  otpLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  otpInputFocused: {
    borderColor: '#1a237e',
    borderWidth: 2,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 14,
    color: '#666',
  },
  resendLinkText: {
    color: '#1a237e',
    fontWeight: 'bold',
  },
  // Password input styles
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: -15,
    marginBottom: 10,
    marginLeft: 4,
  },
  eyeIcon: {
    fontSize: 22,
    marginLeft: 10,
  },
});

export default ForgotPassword;
