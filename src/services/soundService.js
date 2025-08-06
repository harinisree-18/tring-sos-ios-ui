// services/soundService.js
import Sound from 'react-native-sound';
import {Platform} from 'react-native';

// Initialize sound in the beginning
Sound.setCategory('Playback');

let emergencySound = null;
let isSoundPlaying = false;
let isInitialized = false;

export const initializeSound = () => {
  try {
    if (isInitialized) return;
    const soundPath = Platform.OS === 'android' ? 'emergency' : 'emergency.mp3';

    // Load your emergency sound file (must be included in your project)
    emergencySound = new Sound(soundPath, Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.log('Failed to load the sound', error);
        return;
      }
      console.log('Sound initialized successfully');
      isInitialized = true;
      // Set volume to maximum
      emergencySound.setVolume(1.0);
    });
  } catch (error) {
    console.error('Error initializing sound:', error);
  }
};

export const playEmergencySound = () => {
  try {
    if (!isInitialized) {
      initializeSound();
      // Wait a short time for initialization
      setTimeout(() => {
        if (emergencySound) {
          emergencySound.setNumberOfLoops(-1);
          emergencySound.play(success => {
            if (!success) console.log('Sound playback failed');
            isSoundPlaying = false;
          });
          isSoundPlaying = true;
        }
      }, 500);
      return;
    }

    if (emergencySound) {
      emergencySound.setNumberOfLoops(-1);
      emergencySound.play(success => {
        if (!success) console.log('Sound playback failed');
        isSoundPlaying = false;
      });
      isSoundPlaying = true;
      console.log('Emergency sound started playing');
    } else {
      console.log('Emergency sound not initialized');
    }
  } catch (error) {
    console.error('Error playing emergency sound:', error);
  }
};

export const stopEmergencySound = () => {
  try {
    if (emergencySound && isSoundPlaying) {
      emergencySound.stop(() => {
        console.log('Sound stopped successfully');
        isSoundPlaying = false;
      });
    }
  } catch (error) {
    console.error('Error stopping emergency sound:', error);
  }
};

export const isEmergencySoundPlaying = () => {
  return isSoundPlaying;
};
