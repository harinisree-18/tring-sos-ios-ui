// src/config/axios.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.145:3001/api/v1';
const SOCKET_URL = 'http://192.168.1.145:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  async config => {
    // Get token from AsyncStorage
    const token = await AsyncStorage.getItem('token');
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Add a response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    console.log('Error response:', error);
    console.log('Original response:', error.response.data);
    // If error is 401 (Unauthorized) and we haven't already tried to refresh
    if (error?.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      // Try to refresh the token here if you have a refresh token mechanism
      // For now, we'll just clear storage and redirect to login
      if (error.response.data.message === 'Token expired') {
        await AsyncStorage.clear();
        // You might want to navigate to login screen here
        // navigation.navigate('Login');
      } 
    }

    return Promise.reject(error);
  },
);

export default api;
export {SOCKET_URL, API_URL};
