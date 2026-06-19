/**
 * @file Maps.tsx
 * @description Web fallback for react-native-maps. Provides mock components for platforms where
 * native maps are not supported (e.g., the web platform).
 */
import React from 'react';
import { View } from 'react-native';

/**
 * Mock MapView component for web fallback.
 * @param props - Component properties.
 */
export const MapView = (props: any) => <View {...props} />;

/**
 * Mock Marker component for web fallback.
 * @param props - Component properties.
 */
export const Marker = (props: any) => <View {...props} />;

/**
 * Mock Polyline component for web fallback.
 * @param props - Component properties.
 */
export const Polyline = (props: any) => <View {...props} />;

/**
 * Default provider mock constant.
 */
export const PROVIDER_DEFAULT = 'default';
export default MapView;
