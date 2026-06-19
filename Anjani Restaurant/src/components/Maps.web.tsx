/**
 * @file Maps.web.tsx
 * @description Web implementation of the MapView component. 
 * This component renders an OpenStreetMap inside an iframe for web platforms, 
 * providing a lightweight and dependency-free map view.
 */

import React from 'react';
import { View } from 'react-native';

export const PROVIDER_DEFAULT = 'default';

/**
 * MapView component for web.
 * Renders an iframe displaying a map centered at the provided initialRegion or region.
 *
 * @param {any} props - Component properties, including style, initialRegion, region.
 * @param {React.Ref} ref - Forwarded ref.
 */
export const MapView = React.forwardRef((props: any, ref) => {
  // Determine the center latitude and longitude, falling back to a default location (Anjani Restaurant area)
  const lat = props.initialRegion?.latitude || props.region?.latitude || 17.0765705;
  const lng = props.initialRegion?.longitude || props.region?.longitude || 82.1340028;
  
  return (
    <View style={[props.style, { backgroundColor: '#e5e5e5', overflow: 'hidden' }]}>
      <iframe 
        width="100%" 
        height="100%" 
        frameBorder="0" 
        scrolling="no" 
        // @ts-ignore
        marginHeight="0" 
        marginWidth="0" 
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01}%2C${lat-0.01}%2C${lng+0.01}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
        style={{ border: 0 }}
      />
    </View>
  );
});

/**
 * Dummy Marker component for web to maintain API compatibility with native maps.
 */
export const Marker = (props: any) => null;

/**
 * Dummy Polyline component for web to maintain API compatibility with native maps.
 */
export const Polyline = (props: any) => null;

export default MapView;
