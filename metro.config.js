const { getDefaultConfig } = require('expo/metro-config');

// Expo's default config already handles .web.js platform resolution.
// No extra config needed — just re-export the default.
module.exports = getDefaultConfig(__dirname);
