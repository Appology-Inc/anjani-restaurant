import { Platform } from 'react-native';

const baseColors = {
  primary: "#FF6B00",
  dark: "#0D0A06",
  surface: "#18120A",
  card: "#221A0F",
  card2: "#2A1F12",
  border: "rgba(255,107,0,0.18)",
  text: "#F5ECD7",
  muted: "#9A8A72",
  green: "#22C55E",
  red: "#EF4444",
  white: "#FFFFFF",
  gold: "#FFD700",
};

const webColors = {
  primary: "#FF5A00", // Bright appetizing orange
  dark: "#08080C",    // bg-main: Deep rich slate
  surface: "rgba(12, 14, 20, 0.85)", // glass-bg
  card: "rgba(22, 24, 30, 0.75)",     // bg-card: higher opacity for legibility
  card2: "rgba(32, 35, 45, 0.85)",    // bg-card-hover
  border: "rgba(255, 255, 255, 0.12)", // crisper borders
  text: "#FFFFFF",     // pure white for maximum legibility
  muted: "#9CA3AF",    // crisp light grey, avoids muddy look
  green: "#10B981",   // premium emerald success
  red: "#EF4444",     // elegant crimson danger
  white: "#FFFFFF",
  gold: "#F59E0B",    // elegant amber accent
};

export const Colors = Platform.OS === 'web' ? webColors : baseColors;
