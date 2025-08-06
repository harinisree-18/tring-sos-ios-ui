const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolverMainFields: ['react-native', 'browser', 'main'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

// Suppress specific warnings
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('@mauron85/react-native-background-geolocation') && 
      message.includes('dependency.hooks')) {
    return; // Suppress this specific warning
  }
  originalConsoleWarn.apply(console, args);
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
