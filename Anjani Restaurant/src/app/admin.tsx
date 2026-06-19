/**
 * @file admin.tsx
 * @description Admin dashboard allowing restaurant owners to manage the menu 
 * (price, availability) and track active orders.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, TextInput, Modal, Alert, Platform, Linking } from 'react-native';
import { useAppStore } from '../state/AppStore';
import { MenuItems } from '../data/MenuData';
import { db, isFirebaseConfigured } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * AdminDashboard Component
 * 
 * Secure interface to manage restaurant operations.
 * Includes capabilities to:
 * - View and manage active orders (including navigation to customers).
 * - Edit menu items (price, description, availability).
 * - Initialize or sync the menu with Firebase.
 * 
 * @returns {React.JSX.Element} The administrative dashboard interface.
 */
export default function AdminDashboard() {
  const { menuItems, toggleDishAvailability, updateMenuItem, deleteMenuItem, systemOrders, updateOrderStatus } = useAppStore();
  const [seeding, setSeeding] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'Menu' | 'Orders'>('Orders');

  const handleSeedFirebase = async () => {
    if (!isFirebaseConfigured) {
      Alert.alert('Error', 'Firebase is not configured!');
      return;
    }
    setSeeding(true);
    try {
      let count = 0;
      for (const item of MenuItems) {
        const itemRef = doc(db, 'menu', item.id);
        await setDoc(itemRef, {
          name: item.name,
          category: item.category,
          description: item.description || '',
          price: Number(item.price),
          imageUrl: item.imageUrl || '',
          isVeg: !!item.isVeg,
          rating: Number(item.rating || 4),
          isAvailable: true,
          isDeleted: false
        });
        count++;
      }
      Alert.alert('Success', `Seeded ${count} items to Firebase!`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSeeding(false);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    await updateMenuItem(
      editingItem.id,
      editingItem.name,
      editingItem.description,
      Number(editingItem.price),
      editingItem.isAvailable
    );
    setEditingItem(null);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
        <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.switchRow}>
          <Text style={{ color: item.isAvailable ? '#4CAF50' : '#F44336', fontSize: 12, fontWeight: 'bold' }}>
            {item.isAvailable ? 'IN STOCK' : 'SOLD OUT'}
          </Text>
          <Switch 
            value={item.isAvailable} 
            onValueChange={() => toggleDishAvailability(item.id)} 
          />
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditingItem(item)}>
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => {
          Alert.alert('Confirm', 'Delete this item?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMenuItem(item.id) }
          ])
        }}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeaderRow}>
        <Text style={styles.orderId}>{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'DELIVERED' ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.statusTxt}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.orderDetailRow}>
        <Text style={styles.orderLabel}>Contact:</Text>
        <Text style={styles.orderValue}>{item.customerPhone}</Text>
      </View>
      <View style={styles.orderDetailRow}>
        <Text style={styles.orderLabel}>Address:</Text>
        <Text style={styles.orderValue}>{item.customerAddress}</Text>
      </View>
      <View style={styles.orderDetailRow}>
        <Text style={styles.orderLabel}>Items:</Text>
        <Text style={styles.orderValue}>
          {(item.items || []).map((i: any) => `${i.quantity}x ${i?.item?.name || 'Item'}`).join(', ')}
        </Text>
      </View>
      
      <View style={styles.orderActions}>
        {item.status !== 'DELIVERED' && (
          <TouchableOpacity 
            style={[styles.navBtn, { marginBottom: 8 }]} 
            onPress={() => {
              const url = Platform.OS === 'ios' 
                ? `maps:0,0?q=${item.userLat},${item.userLng}`
                : `geo:0,0?q=${item.userLat},${item.userLng}(Customer)`;
              Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open maps'));
            }}
          >
            <Text style={styles.btnText}>Navigate to Customer</Text>
          </TouchableOpacity>
        )}
        
        {item.status !== 'DELIVERED' && (
          <TouchableOpacity 
            style={[styles.navBtn, { backgroundColor: '#4CAF50' }]} 
            onPress={() => {
              Alert.alert('Confirm Delivery', 'Mark this order as delivered?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, Delivered', onPress: () => updateOrderStatus(item.id, 'DELIVERED') }
              ]);
            }}
          >
            <Text style={styles.btnText}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.seedBtn} onPress={handleSeedFirebase} disabled={seeding}>
          <Text style={styles.btnText}>{seeding ? 'Syncing...' : 'Initialize Menu'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'Orders' && styles.tabBtnActive]} onPress={() => setActiveTab('Orders')}>
          <Text style={[styles.tabTxt, activeTab === 'Orders' && styles.tabTxtActive]}>Active Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'Menu' && styles.tabBtnActive]} onPress={() => setActiveTab('Menu')}>
          <Text style={[styles.tabTxt, activeTab === 'Menu' && styles.tabTxtActive]}>Menu Management</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Menu' ? (
        <FlatList
          data={menuItems}
          keyExtractor={(item, index) => item?.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          initialNumToRender={100}
          maxToRenderPerBatch={100}
          windowSize={101}
          removeClippedSubviews={false}
          updateCellsBatchingPeriod={10}
        />
      ) : (
        <FlatList
          data={systemOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')}
          keyExtractor={(item, index) => item?.id || index.toString()}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 50, color: '#666'}}>No active orders right now.</Text>}
          initialNumToRender={100}
          maxToRenderPerBatch={100}
          windowSize={101}
          removeClippedSubviews={false}
          updateCellsBatchingPeriod={10}
        />
      )}

      <Modal visible={!!editingItem} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Item</Text>
            
            <Text style={styles.label}>Name</Text>
            <TextInput 
              style={styles.input} 
              value={editingItem?.name} 
              onChangeText={t => setEditingItem({...editingItem, name: t})} 
            />
            
            <Text style={styles.label}>Price (₹)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric"
              value={String(editingItem?.price || '')} 
              onChangeText={t => setEditingItem({...editingItem, price: t})} 
            />

            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              multiline
              value={editingItem?.description} 
              onChangeText={t => setEditingItem({...editingItem, description: t})} 
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingItem(null)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.btnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { padding: 20, backgroundColor: '#FF5A00', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  seedBtn: { backgroundColor: '#333', padding: 10, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: 'bold' },
  itemCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row' },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemPrice: { fontSize: 14, color: '#666', marginTop: 4 },
  itemDesc: { fontSize: 12, color: '#999', marginTop: 4 },
  actions: { justifyContent: 'space-between', alignItems: 'flex-end', width: 100 },
  switchRow: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  editBtn: { backgroundColor: '#2196F3', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginTop: 8, width: '100%', alignItems: 'center' },
  deleteBtn: { backgroundColor: '#F44336', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginTop: 8, width: '100%', alignItems: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 16 },
  saveBtn: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#999', padding: 12, borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' },
  
  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: '#FF5A00' },
  tabTxt: { fontSize: 15, fontWeight: '600', color: '#666' },
  tabTxtActive: { color: '#FF5A00' },
  
  // Orders
  orderCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  orderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusTxt: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  orderDetailRow: { flexDirection: 'row', marginBottom: 6 },
  orderLabel: { width: 70, fontSize: 13, color: '#666', fontWeight: 'bold' },
  orderValue: { flex: 1, fontSize: 13, color: '#333' },
  orderActions: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  navBtn: { backgroundColor: '#2196F3', padding: 12, borderRadius: 8, alignItems: 'center' },
});
