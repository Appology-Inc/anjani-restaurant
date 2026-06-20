import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export const Marker = () => null;
export const Polyline = () => null;
export const PROVIDER_DEFAULT = 'default';

const MapView = React.forwardRef(({ initialRegion, markers = [], style, onRegionChange, onRegionChangeComplete, scrollEnabled = true, zoomEnabled = true }: any, ref: any) => {
  const webViewRef = useRef<WebView>(null);

  React.useImperativeHandle(ref, () => ({
    getCamera: async () => {
        return new Promise((resolve) => {
            const id = Date.now().toString();
            const handleMessage = (event: any) => {
                try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'cameraResult' && data.id === id) {
                        resolve({
                            center: { latitude: data.latitude, longitude: data.longitude }
                        });
                    }
                } catch (e) {}
            };
            
            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                    var center = map.getCenter();
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'cameraResult',
                        id: '${id}',
                        latitude: center.lat,
                        longitude: center.lng
                    }));
                    true;
                `);
            } else {
                resolve({ center: { latitude: initialRegion?.latitude || 0, longitude: initialRegion?.longitude || 0 }});
            }
        });
    },
    animateToRegion: (region: any) => {
        if (webViewRef.current) {
            let zoom = 18;
            if (region.latitudeDelta > 0.05) zoom = 12;
            else if (region.latitudeDelta > 0.01) zoom = 15;
            
            webViewRef.current.injectJavaScript(`
                if (typeof map !== 'undefined') {
                    map.setView([${region.latitude}, ${region.longitude}], ${zoom});
                }
                true;
            `);
        }
    },
    fitToCoordinates: (coords: any[]) => {
        if (webViewRef.current && coords.length > 0) {
            const bounds = coords.map(c => [c.latitude, c.longitude]);
            webViewRef.current.injectJavaScript(`
                if (typeof L !== 'undefined' && typeof map !== 'undefined') {
                    map.fitBounds(${JSON.stringify(bounds)}, { padding: [50, 50], maxZoom: 19 });
                }
                true;
            `);
        }
    }
  }));

  const initialLat = initialRegion?.latitude || 17.0765705;
  const initialLng = initialRegion?.longitude || 82.1340028;
  const initialZoom = initialRegion?.latitudeDelta && initialRegion.latitudeDelta < 0.01 ? 18 : 14;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        html, body, #map { height: 100%; width: 100vw; margin: 0; padding: 0; background-color: #F9F9F9; touch-action: none; }
        .marker-wrapper {
            position: relative;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .pulse-ring {
            position: absolute;
            width: 48px;
            height: 48px;
            background-color: rgba(59, 130, 246, 0.4);
            border-radius: 50%;
            animation: pulse 1.5s ease-out infinite;
            z-index: 1;
        }
        @keyframes pulse {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
        }
        .custom-marker {
            width: 36px;
            height: 36px;
            border-radius: 18px;
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            position: relative;
            z-index: 2;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        const map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false,
            dragging: ${scrollEnabled ? 'true' : 'false'},
            touchZoom: ${zoomEnabled ? 'true' : 'false'},
            scrollWheelZoom: ${zoomEnabled ? 'true' : 'false'},
            doubleClickZoom: ${zoomEnabled ? 'true' : 'false'}
        }).setView([${initialLat}, ${initialLng}], ${initialZoom});

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
        }).addTo(map);

        map.on('moveend', function() {
            const center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'regionChangeComplete', 
                latitude: center.lat, 
                longitude: center.lng 
            }));
        });

        map.on('move', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'regionChange' }));
        });

        const markersData = ${JSON.stringify(markers)};
        
        if (markersData && markersData.length > 0) {
            const bounds = L.latLngBounds();
            markersData.forEach(m => {
                let color = '#3B82F6';
                let emoji = '📍';
                let pulseHtml = '';
                
                if (m.type === 'restaurant') { color = '#10B981'; emoji = '🍽️'; }
                if (m.type === 'customer' || m.type === 'home') { color = '#F59E0B'; emoji = '🏠'; }
                if (m.type === 'rider') { 
                    color = '#3B82F6'; 
                    emoji = '🛵';
                    pulseHtml = '<div class="pulse-ring"></div>';
                }

                const iconHtml = \`
                    <div class="marker-wrapper">
                        \${pulseHtml}
                        <div class="custom-marker" style="background-color: \${color};">\${emoji}</div>
                    </div>
                \`;
                
                const icon = L.divIcon({ className: 'dummy', html: iconHtml, iconSize: [36, 36], iconAnchor: [18, 18] });
                L.marker([m.lat, m.lng], { icon }).addTo(map);
                bounds.extend([m.lat, m.lng]);
            });
            
            // Draw stunning navigation route using OSRM between exactly two logical points
            if (markersData.length > 1) {
                let startMarker = markersData.find(m => m.type === 'rider');
                let endMarker = markersData.find(m => m.type === 'customer' || m.type === 'home');
                
                if (!startMarker) {
                    startMarker = markersData.find(m => m.type === 'restaurant') || markersData[0];
                }
                if (!endMarker) {
                    endMarker = markersData.find(m => m !== startMarker) || markersData[markersData.length - 1];
                }

                if (startMarker && endMarker && startMarker !== endMarker) {
                    // Only route if points are valid and not at 0,0
                    if (startMarker.lat !== 0 && endMarker.lat !== 0) {
                        const coordsString = \`\${startMarker.lng},\${startMarker.lat};\${endMarker.lng},\${endMarker.lat}\`;
                        fetch(\`https://router.project-osrm.org/route/v1/driving/\${coordsString}?overview=full&geometries=geojson\`)
                          .then(res => res.json())
                          .then(data => {
                              if (data.routes && data.routes[0]) {
                                  L.geoJSON(data.routes[0].geometry, {
                                      style: { color: '#3B82F6', weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round', dashArray: '1, 10' }
                                  }).addTo(map);
                              }
                          }).catch(e => {
                              L.polyline([[startMarker.lat, startMarker.lng], [endMarker.lat, endMarker.lng]], {color: '#3B82F6', dashArray: '5, 10', weight: 4}).addTo(map);
                          });
                    }
                }
            }

            setTimeout(() => {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
            }, 500);
        }
    </script>
</body>
</html>
  `;

  return (
    <View style={style}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={StyleSheet.absoluteFillObject}
        scrollEnabled={false}
        javaScriptEnabled={true}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'regionChange' && onRegionChange) {
              onRegionChange();
            } else if (data.type === 'regionChangeComplete' && onRegionChangeComplete) {
              onRegionChangeComplete({ latitude: data.latitude, longitude: data.longitude });
            }
          } catch (e) {}
        }}
      />
    </View>
  );
});

export { MapView };
export default MapView;
