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
    try {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      console.log('Token retrieved:', token ? 'exists' : 'missing');
      
      // If token exists, add it to the Authorization header
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Authorization header set');
      } else {
        console.log('No token found, request will be sent without authorization');
      }

      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return Promise.reject(error);
    }
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  },
);

// Add a response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    console.log('Error response:', error);
    console.log('Error status:', error?.response?.status);
    console.log('Error data:', error?.response?.data);
    console.log('Request URL:', error?.config?.url);
    console.log('Request headers:', error?.config?.headers);
    
    // If error is 401 (Unauthorized) and we haven't already tried to refresh
    if (error?.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      console.log('401 Unauthorized error detected, attempting to handle...');

      // Check if it's a token expired issue
      if (error.response.data?.message === 'Token expired') {
        console.log('Token expired, clearing storage...');
        await AsyncStorage.clear();
        // You might want to navigate to login screen here
        // navigation.navigate('Login');
      } else {
        console.log('401 error but not token expired, might be missing token');
        // Check if we have a token stored
        const storedToken = await AsyncStorage.getItem('token');
        console.log('Stored token exists:', !!storedToken);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export {SOCKET_URL, API_URL};
