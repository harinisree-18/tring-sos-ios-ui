import { NativeModules, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../components/config/axios';

const { GalleryModule } = NativeModules;

class GalleryService {
  /**
   * Opens the device gallery to select an image
   * @returns {Promise<string>} Promise that resolves with the selected image URI
   */
  openGallery() {
    if (Platform.OS !== 'android') {
      return Promise.reject(new Error('Gallery service is only available on Android'));
    }

    if (!GalleryModule) {
      return Promise.reject(new Error('GalleryModule is not available'));
    }

    return new Promise((resolve, reject) => {
      GalleryModule.openGallery()
        .then((imageUri) => {
          console.log('Image selected:', imageUri);
          resolve(imageUri);
        })
        .catch((error) => {
          console.error('Gallery error:', error);
          reject(error);
        });
    });
  }

  /**
   * Uploads an image to the backend server
   * @param {string} imageUri - Local image URI
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Promise that resolves with upload response
   */
  async uploadImage(imageUri, userId) {
    try {
      // Validate inputs
      if (!imageUri) {
        throw new Error('Image URI is required');
      }
      if (!userId) {
        throw new Error('User ID is required');
      }



      // Create form data
      const formData = new FormData();
      
      // Get file name from URI
      const fileName = imageUri.split('/').pop() || 'profile_image.jpg';
      
      // Append the image file
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg', // You might want to detect the actual type
        name: fileName,
      });

      console.log('Uploading image for user:', userId);
      console.log('Form data created:', formData);
      
      // Debug: Check if token exists
      const token = await AsyncStorage.getItem('token');
      console.log('Token exists:', !!token);
      if (token) {
        console.log('Token length:', token.length);
        console.log('Token preview:', token.substring(0, 20) + '...');
      } else {
        console.log('No token found in AsyncStorage');
      }

      // Test authentication first by trying to get user info
      try {
        console.log('🔍 Testing authentication...');
        const authTest = await api.get(`/users/${userId}`, { timeout: 5000 });
        console.log('✅ Authentication successful, user found:', authTest.data);
      } catch (authError) {
        console.error('❌ Authentication failed:', authError.response?.status, authError.response?.data);
        if (authError.response?.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        // If it's not 401, it might be a different issue, continue with upload
        console.warn('⚠️ Auth test failed but continuing with upload...');
      }
      
      // Use the centralized api instance with multipart headers
      // The api instance already has authentication interceptor
      const uploadConfig = {
        timeout: 60000, // 60 second timeout for uploads
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      
      console.log('📤 Upload config:', uploadConfig);

      // Make the upload request with retry mechanism
      let response;
      let lastError;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Upload attempt ${attempt}/3`);
          response = await api.post(`/users/${userId}/upload-image`, formData, uploadConfig);
          
          // Validate response
          if (!response) {
            throw new Error('No response received from server');
          }

          if (!response.data) {
            throw new Error('No data in response');
          }

          console.log('Image upload response:', response.data);
          return response.data;
        } catch (error) {
          lastError = error;
          console.error(`Upload attempt ${attempt} failed:`, error.message);
          
          if (attempt < 3) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      // All attempts failed
      throw lastError;
    } catch (error) {
      console.error('Image upload error:', error);
      
      // Provide more specific error messages
      if (error.response) {
        // Server responded with error status
        console.error('Server error:', error.response.status, error.response.data);
        throw new Error(`Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        // Request was made but no response received
        console.error('Network error:', error.request);
        throw new Error('Network error: No response from server');
      } else {
        // Something else happened
        console.error('Other error:', error.message);
        throw new Error(`Upload failed: ${error.message}`);
      }
    }
  }

  /**
   * Check if gallery service is available
   * @returns {boolean}
   */
  isAvailable() {
    return Platform.OS === 'android' && GalleryModule !== null;
  }
}

export default new GalleryService(); 