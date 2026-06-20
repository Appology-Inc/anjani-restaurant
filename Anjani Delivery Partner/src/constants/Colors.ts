import { Platform } from 'react-native';

const baseColors = {
  primary: '#FF6B00',
  dark: '#0D0A06',
  surface: '#18120A',
  card: '#221A0F',
  card2: '#2A1F12',
  border: 'rgba(255,107,0,0.18)',
  text: '#F5ECD7',
  muted: '#9A8A72',
  green: '#22C55E',
  red: '#EF4444',
  white: '#FFFFFF',
};

const webColors = {
  primary: "#FF5A00",
  dark: "#05050A",
  surface: "rgba(10, 12, 18, 0.75)",
  card: "rgba(20, 22, 30, 0.6)",
  card2: "rgba(30, 32, 45, 0.7)",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#FFFFFF",
  muted: "#A0A5B5",
  green: "#00F58D",
  red: "#FF3366",
  white: "#FFFFFF",
};

export const Colors = Platform.OS === 'web' ? webColors : baseColors;
