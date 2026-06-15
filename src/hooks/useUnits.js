import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { nsKey } from '../services/activeUser';

const UNITS_KEY = 'gymmate_units';

const UnitsContext = createContext();

// Conversion functions
export const kgToLbs = (kg) => kg * 2.20462;
export const lbsToKg = (lbs) => lbs / 2.20462;
export const cmToFeet = (cm) => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};
export const feetToCm = (feet, inches) => ((feet * 12) + inches) * 2.54;

// Detect system preference based on locale
function getSystemUnits() {
  try {
    const locale = Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : Platform.OS === 'android'
      ? NativeModules.I18nManager?.localeIdentifier
      : null;

    // US, Liberia, Myanmar use imperial
    const imperialCountries = ['en-US', 'en_US', 'US'];
    if (locale && imperialCountries.some(c => locale.includes(c))) {
      return 'imperial';
    }

    // Default to metric for rest of world
    return 'metric';
  } catch (e) {
    return 'metric'; // Safe default
  }
}

export function UnitsProvider({ children }) {
  const [units, setUnits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(nsKey(UNITS_KEY)).then((stored) => {
      if (stored) {
        setUnits(stored);
      } else {
        // No preference saved - use system default
        const systemUnits = getSystemUnits();
        setUnits(systemUnits);
      }
      setLoading(false);
    });
  }, []);

  const setUnitsPreference = async (newUnits) => {
    setUnits(newUnits);
    await AsyncStorage.setItem(nsKey(UNITS_KEY), newUnits);
  };

  // Helper functions for common conversions
  const formatWeight = (kg, options = {}) => {
    if (!kg && kg !== 0) return '';
    const { decimals = 1, showUnit = true } = options;
    if (units === 'imperial') {
      const lbs = kgToLbs(kg);
      return `${lbs.toFixed(decimals)}${showUnit ? ' lbs' : ''}`;
    }
    return `${kg.toFixed(decimals)}${showUnit ? ' kg' : ''}`;
  };

  const formatHeight = (cm, options = {}) => {
    if (!cm && cm !== 0) return '';
    const { showUnit = true } = options;
    if (units === 'imperial') {
      const { feet, inches } = cmToFeet(cm);
      return `${feet}${showUnit ? '\'' : ''} ${inches}${showUnit ? '"' : ''}`;
    }
    return `${Math.round(cm)}${showUnit ? ' cm' : ''}`;
  };

  const parseWeight = (input) => {
    const num = parseFloat(input);
    if (isNaN(num)) return null;
    return units === 'imperial' ? lbsToKg(num) : num;
  };

  const displayWeight = (kg) => {
    if (!kg && kg !== 0) return '';
    if (units === 'imperial') {
      return kgToLbs(kg).toFixed(1);
    }
    return kg.toFixed(1);
  };

  const weightUnit = units === 'imperial' ? 'lbs' : 'kg';
  const heightUnit = units === 'imperial' ? 'ft/in' : 'cm';

  return (
    <UnitsContext.Provider
      value={{
        units,
        setUnits: setUnitsPreference,
        loading,
        formatWeight,
        formatHeight,
        parseWeight,
        displayWeight,
        weightUnit,
        heightUnit,
        kgToLbs,
        lbsToKg,
        cmToFeet,
        feetToCm,
      }}
    >
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error('useUnits must be used within UnitsProvider');
  }
  return context;
}
