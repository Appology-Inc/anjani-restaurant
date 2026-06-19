import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

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
