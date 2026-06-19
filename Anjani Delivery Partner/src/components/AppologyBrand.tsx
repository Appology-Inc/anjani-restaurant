import React from 'react';
import { Platform, Text, View } from 'react-native';

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
