// theme.js
const theme = {
  colors: {
    primaryGradient: ['#2648B5', '#6dd5ed'], // Blue gradient with new primary
    primary: '#2648B5', // Updated primary blue
    secondary: '#6dd5ed', // Light blue
    accent: '#1976d2', // Strong blue accent
    background: '#F5F6FA',
    card: '#FFFFFF',
    chatSent: '#E3F2FD', // Light blue for sent
    chatReceived: '#F5F6FA',
    button: 'linear-gradient(90deg, #2648B5 0%, #6dd5ed 100%)',
    text: '#2D2D2D',
    textLight: '#FFFFFF',
    border: '#E0E0E0',
    error: '#f44336', // Red color for errors
    success: '#4caf50', // Green color for success
    warning: '#ff9800', // Orange color for warnings
  },
  borderRadius: 12,
  shadow: {
    shadowColor: '#2648B5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
};

export default theme; 