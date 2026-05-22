import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
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

interface CategoryTabsProps {
  activeCat: string;
  setActiveCat: (cat: string) => void;
}

export function CategoryTabs({ activeCat, setActiveCat }: CategoryTabsProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.scrollContent}
    >
      {CATEGORIES.map(cat => {
        const isOn = activeCat === cat;
        return (
          <TouchableOpacity 
            key={cat} 
            style={[styles.tab, isOn && styles.tabActive]} 
            onPress={() => setActiveCat(cat)}
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
}

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
