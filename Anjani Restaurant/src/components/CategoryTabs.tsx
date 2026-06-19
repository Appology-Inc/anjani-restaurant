/**
 * @file CategoryTabs.tsx
 * @description A horizontally scrollable tab bar for menu categories. Features
 * smooth scrolling animations and instant UI feedback.
 */

import React, { useRef, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Colors } from '../constants/Colors';

/**
 * Pre-defined list of available food categories.
 */
const CATEGORIES = [
  "All",
  "Veg Soups",
  "Non Veg Soups",
  "Salads",
  "Tandoori Starters",
  "Veg Starters",
  "Non Veg Starters",
  "Veg Main Course",
  "Non Veg Main Course",
  "Breads",
  "Rice",
  "Veg Biryani",
  "Non Veg Biryani",
  "Fried Rice",
  "Noodles",
  "Snacks"
];

const CAT_ICONS: Record<string, string> = {
  "All": "🍽️",
  "Veg Soups": "🥣",
  "Non Veg Soups": "🍲",
  "Salads": "🥗",
  "Tandoori Starters": "🍢",
  "Veg Starters": "🥦",
  "Non Veg Starters": "🍗",
  "Veg Main Course": "🫕",
  "Non Veg Main Course": "🍖",
  "Breads": "🫓",
  "Rice": "🍚",
  "Veg Biryani": "🍛",
  "Non Veg Biryani": "🥘",
  "Fried Rice": "🥡",
  "Noodles": "🍜",
  "Snacks": "🍟"
};

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Props for the CategoryTabs component.
 */
interface CategoryTabsProps {
  /** The currently active category name */
  activeCat: string;
  /** Callback function triggered when a category is selected */
  setActiveCat: (cat: string) => void;
}

/**
 * CategoryTabs Component
 * 
 * Renders a horizontal list of category tabs. It automatically centers the selected tab
 * on the screen using a smooth scrolling animation. Uses React.memo for performance optimization
 * to prevent unnecessary re-renders.
 * 
 * @param {CategoryTabsProps} props - The component props.
 * @returns {React.JSX.Element} The scrollable category tabs.
 */
export const CategoryTabs = React.memo(function CategoryTabs({ activeCat, setActiveCat }: CategoryTabsProps) {
  // Reference to the ScrollView to trigger scroll animations
  const scrollViewRef = useRef<ScrollView>(null);
  // Stores the layout metrics (x position and width) of each tab for accurate scroll calculation
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  // Local state for immediate UI updates, bypassing parent component's render cycle delay
  const [localCat, setLocalCat] = useState(activeCat);

  useEffect(() => {
    setLocalCat(activeCat);
  }, [activeCat]);

  /**
   * Calculates and performs a smooth scroll to center the given category tab on the screen.
   * 
   * @param {string} cat - The name of the category to scroll to.
   */
  const scrollToTab = (cat: string) => {
    const layout = tabLayouts.current[cat];
    if (layout && scrollViewRef.current) {
      const { x, width } = layout;
      // Center the active tab on the screen
      const targetX = x - SCREEN_WIDTH / 2 + width / 2;
      scrollViewRef.current.scrollTo({ x: Math.max(0, targetX), y: 0, animated: true });
    }
  };

  /**
   * Handles user interaction when a tab is pressed.
   * Updates local state instantly for quick UI response, then defers the parent state update.
   * 
   * @param {string} cat - The selected category name.
   */
  const handleTabPress = (cat: string) => {
    setLocalCat(cat); // Instant UI feedback
    scrollToTab(cat);
    
    // Defer the heavy parent list re-render so the tab scroll animation is buttery smooth
    setTimeout(() => {
      setActiveCat(cat);
    }, 50);
  };

  // Scroll to active tab when it changes or on mount once layouts are measured
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToTab(activeCat);
    }, 150);
    return () => clearTimeout(timer);
  }, [activeCat]);

  return (
    <ScrollView 
      ref={scrollViewRef}
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.scrollContent}
    >
      {CATEGORIES.map(cat => {
        const isOn = localCat === cat;
        return (
          <TouchableOpacity 
            key={cat} 
            style={[styles.tab, isOn && styles.tabActive]} 
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              tabLayouts.current[cat] = { x, width };
            }}
            onPress={() => handleTabPress(cat)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isOn && styles.tabTextActive]}>
              {CAT_ICONS[cat]} {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    color: Colors.muted,
    fontWeight: '700',
    fontSize: 14,
  },
  tabTextActive: {
    color: Colors.white,
  },
});
