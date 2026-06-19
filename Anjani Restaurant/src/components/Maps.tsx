/**
 * @file Maps.tsx
 * @description Cross-platform MapView component using react-native-webview for native platforms and iframe for web.
 * It integrates Leaflet maps (hosted externally or locally) to provide a consistent map experience 
 * with markers and polylines across all supported platforms.
 */
import React from 'react';
import { View, Platform } from 'react-native';

let WebViewComponent: any = null;
if (Platform.OS !== 'web') {
  try {
    WebViewComponent = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('react-native-webview not found');
  }
}

export const PROVIDER_DEFAULT = 'default';

/**
 * MapView component handling map logic for both web and native platforms.
 * Uses a WebView (native) or iframe (web) to render an interactive map with markers and polylines.
 * 
 * @param {any} props - Component properties including markers, polyline, region, children, style.
 * @param {React.Ref} ref - Forwarded ref to expose imperative map methods (animateToRegion, getCamera, fitToCoordinates).
 */
export const MapView = React.forwardRef((props: any, ref) => {
  const iframeRef = React.useRef<any>(null);
  const webViewRef = React.useRef<any>(null);
  const lastCenter = React.useRef<{latitude: number, longitude: number} | null>(null);

  /**
   * Parses children and props to build a structured payload of markers and polylines.
   * This payload is then sent to the Leaflet map instance.
   */
  // Build markers + polyline payload
  const buildOverlays = React.useCallback(() => {
    const markers: any[] = [];
    const polyline: any[] = [];

    React.Children.forEach(props.children, (child: any) => {
      if (!React.isValidElement(child)) return;
      const cp = (child as any).props;
      if (cp.coordinate) {
        let type = 'customer';
        if (cp.title?.toLowerCase().includes('restaurant')) type = 'restaurant';
        else if (cp.title?.toLowerCase().includes('rider') || cp.title?.toLowerCase().includes('delivery')) type = 'rider';
        markers.push({ latitude: cp.coordinate.latitude, longitude: cp.coordinate.longitude, title: cp.title || '', type });
      }
      if (cp.coordinates) {
        cp.coordinates.forEach((c: any) => polyline.push({ latitude: c.latitude, longitude: c.longitude }));
      }
    });

    if (props.markers && Array.isArray(props.markers)) {
      props.markers.forEach((m: any) => {
        markers.push({ latitude: m.lat, longitude: m.lng, title: m.title || '', type: m.type || 'customer' });
      });
    }

    if (props.polyline && Array.isArray(props.polyline)) {
      props.polyline.forEach((p: any) => {
        polyline.push({ latitude: p.lat || p.latitude, longitude: p.lng || p.longitude });
      });
    }

    return { markers, polyline };
  }, [props.markers, props.polyline, props.children]);

  /**
   * Unified method to send messages to the Leaflet frame.
   * Handles postMessage for both web iframes and native WebViews.
   * 
   * @param {any} msg - The message object to post to the map window.
   */
  // Unified postMessage to Leaflet frame (iframe on web, WebView on native)
  const postToMap = React.useCallback((msg: any) => {
    if (Platform.OS === 'web') {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(msg, '*');
      }
    } else {
      const webView = webViewRef.current;
      if (webView) {
        const js = `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(msg)} }));`;
        webView.injectJavaScript(js);
      }
    }
  }, []);

  // Initial region for first load
  const initLat = props.region?.latitude || props.initialRegion?.latitude || 17.0765705;
  const initLng = props.region?.longitude || props.initialRegion?.longitude || 82.1340028;
  const initialData = React.useMemo(() => {
    const overlays = buildOverlays();
    return { region: { latitude: initLat, longitude: initLng }, ...overlays };
  }, []);

  const initialSrc = React.useMemo(() => {
    const hash = encodeURIComponent(JSON.stringify(initialData));
    if (Platform.OS === 'web') {
      return `/map.html#${hash}`;
    } else {
      // Point directly to the live deployed map on Firebase so it loads instantly in WebViews
      return `https://anjanirestaurant.web.app/map.html#${hash}`;
    }
  }, []);

  // Update overlays when they change
  const didMount = React.useRef(false);
  React.useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const overlays = buildOverlays();
    postToMap({ type: 'updateOverlays', ...overlays });
  }, [props.markers, props.polyline, buildOverlays, postToMap]);

  // Handle messages from web iframe
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleWebMessage = (event: MessageEvent) => {
      try {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'onRegionChangeComplete' && data.region) {
          lastCenter.current = data.region;
          props.onRegionChangeComplete?.(data.region);
        }
        if (data.type === 'onRegionChange') {
          props.onRegionChange?.();
        }
      } catch (e) {
        console.warn('Failed to handle web message:', e);
      }
    };

    window.addEventListener('message', handleWebMessage);
    return () => {
      window.removeEventListener('message', handleWebMessage);
    };
  }, [props.onRegionChangeComplete, props.onRegionChange]);

  // Imperative methods called via ref (animate, getCamera, fit)
  React.useImperativeHandle(ref, () => ({
    animateToRegion: (r: any) => {
      postToMap({ type: 'setView', lat: r.latitude, lng: r.longitude, zoom: 16 });
    },
    getCamera: async () => {
      const center = lastCenter.current || { latitude: initLat, longitude: initLng };
      return { center };
    },
    fitToCoordinates: () => {
      const overlays = buildOverlays();
      postToMap({ type: 'mapUpdate', payload: { ...overlays, region: { latitude: initLat, longitude: initLng } } });
    }
  }), [postToMap, buildOverlays, initLat, initLng]);

  // Handle messages from native WebView
  const handleNativeMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'onRegionChangeComplete') {
        lastCenter.current = data.region;
        props.onRegionChangeComplete?.(data.region);
      }
      if (data.type === 'onRegionChange') {
        props.onRegionChange?.();
      }
    } catch (e) {
      console.warn('Failed to parse message from WebView:', e);
    }
  };

  // Redefine window.parent.postMessage to forward to WebView inside leaflet map
  const injectedJS = `
    (function() {
      if (window.parent) {
        var originalPost = window.parent.postMessage;
        window.parent.postMessage = function(data, targetOrigin) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
          } else {
            originalPost(data, targetOrigin);
          }
        };
      }
    })();
    true;
  `;

  if (Platform.OS === 'web') {
    return (
      <View style={[props.style, { backgroundColor: '#1C1C1E', overflow: 'hidden' }]}>
        <iframe
          ref={iframeRef}
          width="100%" height="100%"
          frameBorder="0" scrolling="no"
          src={initialSrc}
          style={{ border: 0 }}
          onLoad={props.onLoad}
        />
      </View>
    );
  }

  // Native WebView integration
  if (WebViewComponent) {
    return (
      <View style={[props.style, { backgroundColor: '#1C1C1E', overflow: 'hidden' }]}>
        <WebViewComponent
          ref={webViewRef}
          source={{ uri: initialSrc }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          injectedJavaScript={injectedJS}
          onMessage={handleNativeMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      </View>
    );
  }

  return <View style={[props.style, { backgroundColor: '#1C1C1E' }]} />;
});

/**
 * Dummy Marker component to maintain API compatibility.
 * Actual markers are handled internally by MapView via parsing props.children.
 */
export const Marker = (props: any) => null;

/**
 * Dummy Polyline component to maintain API compatibility.
 * Actual polylines are handled internally by MapView via parsing props.children.
 */
export const Polyline = (props: any) => null;

export default MapView;
