import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SectionList, Alert, Modal, Platform, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../state/AppStore';
import { MenuItemCard } from '../../components/MenuItemCard';
import { TopHeader } from '../../components/TopHeader';
import { MenuCategories, MenuItem } from '../../data/MenuData';

const SCREEN_WIDTH = require('react-native').Dimensions.get('window').width;
const SCREEN_HEIGHT = require('react-native').Dimensions.get('window').height;

const CAT_ICONS: Record<string, string> = {
  "All": "🍽️", "Veg Soups": "🥣", "Non Veg Soups": "🍲", "Salads": "🥗", "Tandoori Starters": "🍢",
  "Veg Starters": "🥦", "Non Veg Starters": "🍗", "Veg Main Course": "🫕", "Non Veg Main Course": "🍖",
  "Breads": "🫓", "Rice": "🍚", "Veg Biryani": "🍛", "Non Veg Biryani": "🥘", "Fried Rice": "🥡",
  "Noodles": "🍜", "Snacks": "🍟"
};

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const menuItems = useAppStore(state => state.menuItems);
  const soldOutDishIds = useAppStore(state => state.soldOutDishIds);
  const toggleDishAvailability = useAppStore(state => state.toggleDishAvailability);
  const updateMenuItem = useAppStore(state => state.updateMenuItem);

  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuSelectedCategory, setMenuSelectedCategory] = useState('All');
  const [localMenuCat, setLocalMenuCat] = useState('All');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);

  const menuCategoryScrollViewRef = useRef<ScrollView>(null);
  const menuCategoryTabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  const scrollMenuCategoryToTab = (cat: string) => {
    const layout = menuCategoryTabLayouts.current[cat];
    if (layout && menuCategoryScrollViewRef.current) {
      const { x, width } = layout;
      const targetX = x - SCREEN_WIDTH / 2 + width / 2;
      menuCategoryScrollViewRef.current.scrollTo({ x: Math.max(0, targetX), y: 0, animated: true });
    }
  };

  const handleMenuCategoryPress = (cat: string) => {
    setLocalMenuCat(cat);
    scrollMenuCategoryToTab(cat);
    setTimeout(() => setMenuSelectedCategory(cat), 50);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollMenuCategoryToTab(menuSelectedCategory);
    }, 150);
    return () => clearTimeout(timer);
  }, [menuSelectedCategory]);

  const categories = ['All', ...MenuCategories];
  const query = (menuSearchQuery || '').trim().toLowerCase();
  
  const filtered = menuItems.filter(item => {
    if (item.isDeleted) return false;
    const n = (item.name || '').toLowerCase();
    const d = (item.description || '').toLowerCase();
    const matchesSearch = query === '' || n.includes(query) || d.includes(query);
    const matchesCategory = query !== '' ? true : (menuSelectedCategory === 'All' || item.category === menuSelectedCategory);
    return matchesSearch && matchesCategory;
  });

  const sections = MenuCategories
    .filter(cat => query !== '' || menuSelectedCategory === "All" || cat === menuSelectedCategory)
    .map(cat => ({ title: cat, data: filtered.filter(i => i.category === cat) }))
    .filter(section => section.data.length > 0);

  const handleSave = async () => {
    if (!editingItem) return;
    if (!editName.trim() || !editPrice.trim()) {
      Alert.alert('Validation Error', 'Dish name and price cannot be empty.');
      return;
    }
    const parsedPrice = parseFloat(editPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive price.');
      return;
    }
    await updateMenuItem(editingItem.id, editName.trim(), editDescription.trim(), parsedPrice, editAvailable);
    Alert.alert('Catalog Updated', `"${editName}" details have been updated and synchronized!`);
    setEditingItem(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TopHeader />



      <SectionList
        sections={sections}
        keyExtractor={(item: MenuItem, index) => item?.id || index.toString()}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <View style={styles.catalogHeader}>
            <Text style={styles.catalogTitle}>Menu Catalog</Text>
            <Text style={styles.catalogSubtitle}>Manage items, pricing, and availability</Text>
            
            <View style={styles.menuSearchRow}>
              <Ionicons name="search" size={20} color="#9A8A72" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.menuSearchInput}
                placeholder="Search dishes..."
                placeholderTextColor="#9A8A72"
                value={menuSearchQuery}
                onChangeText={setMenuSearchQuery}
                autoCorrect={false}
              />
              {menuSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMenuSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9A8A72" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView 
              ref={menuCategoryScrollViewRef}
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.categoriesScroll}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {categories.map(cat => {
                const isActive = cat === localMenuCat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, isActive && styles.catPillActive]}
                    onLayout={(event) => {
                      const { x, width } = event.nativeEvent.layout;
                      menuCategoryTabLayouts.current[cat] = { x, width };
                    }}
                    onPress={() => handleMenuCategoryPress(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                      {CAT_ICONS[cat] || '🍽️'} {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        ListFooterComponent={<View style={{ height: 60 }} />}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <View style={styles.emptyCatalogCard}>
              <Ionicons name="alert-circle-outline" size={32} color="#9A8A72" />
              <Text style={styles.emptyCatalogText}>No dishes found matching search parameters.</Text>
            </View>
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.catalogCategoryHeader}>
              <Text style={styles.catalogCategoryTitle}>
                {CAT_ICONS[title] || '🍽️'} {title.toUpperCase()}
              </Text>
              <View style={styles.catalogCategoryBadge}>
                <Text style={styles.catalogCategoryBadgeText}>
                  {filtered.filter(i => i.category === title).length} items
                </Text>
              </View>
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          const isSoldOut = soldOutDishIds.includes(item.id) || item.isAvailable === false;
          return (
            <MenuItemCard
              item={item}
              isSoldOut={isSoldOut}
              onToggle={toggleDishAvailability}
              onEdit={(i: any) => {
                setEditingItem(i);
                setEditName(i.name);
                setEditDescription(i.description);
                setEditPrice(String(i.price));
                setEditAvailable(i.isAvailable !== false);
              }}
            />
          );
        }}
      />

      {/* Edit Modal */}
      {editingItem && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setEditingItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Dish Details</Text>
                <TouchableOpacity onPress={() => setEditingItem(null)}>
                  <Ionicons name="close-circle-sharp" size={24} color="#757575" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalLabel}>Dish Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. Special Chicken Biryani"
                  placeholderTextColor="#9E9E9E"
                />

                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalInputMultiLine]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="e.g. Traditional slow-cooked layered rice dish..."
                  placeholderTextColor="#9E9E9E"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.modalLabel}>Price (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editPrice}
                  onChangeText={setEditPrice}
                  placeholder="e.g. 250"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="numeric"
                />

                <TouchableOpacity 
                  style={styles.primaryBtn}
                  onPress={handleSave}
                >
                  <Text style={styles.primaryBtnTxt}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18120A',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  catalogHeader: {
    padding: 16,
    backgroundColor: '#0D0A06',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,0,0.18)',
  },
  catalogTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F5ECD7',
  },
  catalogSubtitle: {
    fontSize: 12,
    color: '#9A8A72',
    marginTop: 2,
  },
  menuSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#221A0F',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
  },
  menuSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#F5ECD7',
    padding: 0,
  },
  categoriesScroll: {
    marginTop: 12,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#221A0F',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
  },
  catPillActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A8A72',
  },
  catPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  emptyCatalogCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#221A0F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
    marginTop: 20,
  },
  emptyCatalogText: {
    fontSize: 13,
    color: '#9A8A72',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionHeaderContainer: {
    backgroundColor: '#18120A',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  catalogCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogCategoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F5ECD7',
    letterSpacing: 1,
  },
  catalogCategoryBadge: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  catalogCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.88,
    maxHeight: SCREEN_HEIGHT * 0.75,
    backgroundColor: '#221A0F',
    borderRadius: 20,
    padding: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,0,0.18)',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5ECD7',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A8A72',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F5ECD7',
    backgroundColor: '#18120A',
    marginBottom: 16,
  },
  modalInputMultiLine: {
    height: 70,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    backgroundColor: '#FF6D00',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#FF6D00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  primaryBtnTxt: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
