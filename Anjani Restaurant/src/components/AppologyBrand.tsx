/**
 * @file AppologyBrand.tsx
 * @description Renders the Appology Inc. branding with platform-specific
 * rendering (web vs native) for optimal styling and performance.
 */

import React from 'react';
import { Platform, Text, View } from 'react-native';

/**
 * AppologyBrand Component
 * 
 * A functional component that displays the Appology Inc. brand name.
 * It uses a specialized DOM structure with CSS classes on the web to support
 * advanced text effects (like glowing text), while falling back to standard
 * React Native <Text> components on iOS/Android.
 * 
 * @returns {React.JSX.Element} The rendered brand text component.
 */
export const AppologyBrand = () => {
  if (Platform.OS === 'web') {
    return React.createElement(
      'span',
      { className: 'appology-glow-wrapper', style: { fontStyle: 'italic', whiteSpace: 'nowrap' } },
      React.createElement('span', { className: 'appology-gold-text', style: { fontWeight: '900', paddingRight: '3px' } }, 'App'),
      React.createElement('span', { className: 'appology-gold-text', style: { fontWeight: '400', marginLeft: '-3px' } }, 'ology Inc.')
    );
  }
  return (
    <Text style={{ fontStyle: 'italic', color: '#FF6B00' }}>
      <Text style={{ fontWeight: '900', paddingRight: 3 }}>App</Text>
      <Text style={{ fontWeight: '400', marginLeft: -3 }}>ology Inc.</Text>
    </Text>
  );
};
