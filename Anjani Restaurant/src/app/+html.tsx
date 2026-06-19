/**
 * @file +html.tsx
 * @description Web-only root HTML configuration. Injects global font faces and metadata
 * into the document head before JavaScript hydration occurs.
 */

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every web page during static rendering.
// It injects the icon fonts at the HTML level so they are available before JavaScript hydrates.

/**
 * Root HTML Component (Web Only)
 * 
 * Customizes the root HTML structure for web exports. Crucial for pre-loading 
 * assets like icon fonts to prevent layout shift or invisible icons upon initial load.
 * 
 * @param {PropsWithChildren} props - The component children.
 * @returns {React.JSX.Element} The structured root HTML element.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#08080C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Pre-load icon fonts at the HTML level before JS hydration */}
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'ionicons';
            src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'Ionicons';
            src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf') format('truetype');
            font-display: swap;
          }
        `}} />

        {/* Expo's required ScrollView style reset */}
        <ScrollViewStyleReset />

        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json?v=6" />
        <link rel="apple-touch-icon" href="/icon-192-v2.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
