import React, { useRef, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Colors } from '../constants/Colors';

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

interface CategoryTabsProps {
  activeCat: string;
  setActiveCat: (cat: string) => void;
}

export const CategoryTabs = React.memo(function CategoryTabs({ activeCat, setActiveCat }: CategoryTabsProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [localCat, setLocalCat] = useState(activeCat);

  useEffect(() => {
    setLocalCat(activeCat);
  }, [activeCat]);

  const scrollToTab = (cat: string) => {
    const layout = tabLayouts.current[cat];
    if (layout && scrollViewRef.current) {
      const { x, width } = layout;
      // Center the active tab on the screen
      const targetX = x - SCREEN_WIDTH / 2 + width / 2;
      scrollViewRef.current.scrollTo({ x: Math.max(0, targetX), y: 0, animated: true });
    }
  };

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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 13, // Scaled down slightly to match the sleeker theme
  },
  tabTextActive: {
    color: Colors.white,
  },
});
