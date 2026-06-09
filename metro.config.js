const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// On web builds, replace expo-sqlite with a stub so the native module
// is never bundled. database.web.js handles all storage via localStorage.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-sqlite': path.resolve(__dirname, 'src/services/expo-sqlite-stub.js'),
};

module.exports = config;
