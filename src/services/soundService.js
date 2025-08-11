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
    console.log('initializeSound called, isInitialized:', isInitialized, 'Platform:', Platform.OS);
    
    if (isInitialized) {
      console.log('Sound already initialized, returning early');
      return;
    }
    
    let soundPath;
    if (Platform.OS === 'android') {
      soundPath = 'emergency';
    } else {
      // For iOS, we need to use the full filename with extension
      soundPath = 'emergency.mp3';
    }

    console.log('Initializing sound with path:', soundPath, 'on platform:', Platform.OS);
    console.log('Sound.MAIN_BUNDLE available:', !!Sound.MAIN_BUNDLE);

    // Load your emergency sound file (must be included in your project)
    emergencySound = new Sound(soundPath, Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.log('Failed to load the sound', error);
        console.log('Error details:', error);
        console.log('Error code:', error.code);
        console.log('Error description:', error.description);
        return;
      }
      console.log('Sound initialized successfully');
      console.log('Sound object created:', !!emergencySound);
      console.log('Sound duration:', emergencySound.getDuration());
      isInitialized = true;
      // Set volume to maximum
      emergencySound.setVolume(1.0);
      console.log('Volume set to maximum');
    });
    
    console.log('Sound constructor called, emergencySound object:', !!emergencySound);
  } catch (error) {
    console.error('Error initializing sound:', error);
    console.error('Error stack:', error.stack);
  }
};

export const playEmergencySound = () => {
  try {
    console.log('playEmergencySound called, isInitialized:', isInitialized, 'Platform:', Platform.OS);
    
    if (!isInitialized) {
      console.log('Sound not initialized, initializing now...');
      initializeSound();
      // Wait a short time for initialization
      setTimeout(() => {
        console.log('Timeout callback - emergencySound exists:', !!emergencySound);
        if (emergencySound) {
          emergencySound.setNumberOfLoops(-1);
          emergencySound.play(success => {
            if (!success) {
              console.log('Sound playback failed in timeout callback');
            } else {
              console.log('Sound playback started successfully in timeout callback');
            }
            isSoundPlaying = false;
          });
          isSoundPlaying = true;
          console.log('Emergency sound started playing in timeout callback');
        } else {
          console.log('Emergency sound still not available after timeout');
        }
      }, 500);
      return;
    }

    if (emergencySound) {
      console.log('Playing sound with existing emergencySound object');
      emergencySound.setNumberOfLoops(-1);
      emergencySound.play(success => {
        if (!success) {
          console.log('Sound playback failed');
        } else {
          console.log('Sound playback started successfully');
        }
        isSoundPlaying = false;
      });
      isSoundPlaying = true;
      console.log('Emergency sound started playing');
    } else {
      console.log('Emergency sound not initialized, trying to initialize again');
      initializeSound();
      // Try to play after a short delay
      setTimeout(() => {
        if (emergencySound) {
          emergencySound.setNumberOfLoops(-1);
          emergencySound.play(success => {
            if (!success) console.log('Sound playback failed on retry');
            isSoundPlaying = false;
          });
          isSoundPlaying = true;
          console.log('Emergency sound started playing on retry');
        }
      }, 300);
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
