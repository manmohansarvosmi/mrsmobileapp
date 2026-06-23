import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getItems, Item } from '../../service/inventoryService';
import { useNavigation } from '@react-navigation/native';
import { Typography, Colors, CommonStyles } from '../../utils/theme';

const InventoryListScreen: React.FC = () => {
  const navigation = useNavigation();

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await getItems();
      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error) {
      console.error('Fetch Items Error:', error);
      const dummyItems: Item[] = [
        { id: 1, name: 'Cotton Fabric A', quantity: 500, price: 120, unit: 'Meters' },
        { id: 2, name: 'Silk Yarn Red', quantity: 20, price: 500, unit: 'Kg' },
        { id: 3, name: 'Buttons Metallic', quantity: 1500, price: 2, unit: 'Pcs' },
        { id: 4, name: 'Zippers 8 inch', quantity: 50, price: 15, unit: 'Pcs' },
      ];
      setItems(dummyItems);
      setFilteredItems(dummyItems);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const filtered = items.filter(item => {
      const name = item.name || (item as any).productName || '';
      const sku = item.sku || '';
      return name.toLowerCase().includes(search.toLowerCase()) || 
             sku.toLowerCase().includes(search.toLowerCase());
    });
    setFilteredItems(filtered);
  }, [search, items]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const renderItem = ({ item }: { item: Item }) => {
    const name = item.name || (item as any).productName || 'Unnamed';
    const price = item.price || (item as any).sellingPrice || 0;
    const qty = item.quantity || (item as any).stockQuantity || 0;
    const isLowStock = qty < 50;
    
    return (
      <TouchableOpacity activeOpacity={0.7} style={styles.itemCard}>
        <View style={styles.compactRow}>
          <View style={[styles.miniIconBox, { backgroundColor: isLowStock ? '#fef2f2' : '#f0fdf4' }]}>
             <Icon name={isLowStock ? "priority-high" : "inventory-2"} size={14} color={isLowStock ? Colors.danger : Colors.success} />
          </View>
          <View style={{ flex: 1.5, marginLeft: 10 }}>
            <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
            <Text style={styles.itemPrice}>Price: ₹{price}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
             <Text style={[styles.itemQty, { color: isLowStock ? Colors.danger : Colors.text.main }]}>
                {qty} {item.unit || 'Pcs'}
             </Text>
             <Text style={styles.qtyLabel}>{isLowStock ? 'LOW STOCK' : 'AVAILABLE'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Custom Header */}
      <View style={[styles.header, { paddingVertical: 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
           <Icon name="arrow-back" size={24} color={Colors.text.main} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
           <Text style={styles.headerTitle}>Items Master</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn}>
           <Icon name="filter-list" size={24} color={Colors.text.main} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={Colors.text.light} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={Colors.text.light}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="inventory" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No items found in inventory</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, marginLeft: 10 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: Colors.secondary, letterSpacing: 1.5, fontFamily: Typography.fontFamily.semiBold },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  searchSection: { paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: Typography.size.lg, fontWeight: '700', color: Colors.text.main, marginBottom: 12, fontFamily: Typography.fontFamily.regular },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: Typography.size.md, color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  listContent: { padding: 12, paddingBottom: 30 },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    ...CommonStyles.shadow
  },
  compactRow: { flexDirection: 'row', alignItems: 'center' },
  miniIconBox: { width: 30, height: 30, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 13, fontWeight: '700', color: Colors.text.main, marginBottom: 2, fontFamily: Typography.fontFamily.semiBold },
  itemPrice: { fontSize: 11, color: Colors.text.light, fontFamily: Typography.fontFamily.regular },
  itemQty: { fontSize: 14, fontWeight: '800', fontFamily: Typography.fontFamily.semiBold },
  qtyLabel: { fontSize: 8, fontWeight: '900', color: Colors.text.muted, letterSpacing: 0.5 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, fontSize: Typography.size.md, color: Colors.text.light, fontFamily: Typography.fontFamily.regular, fontWeight: '500' },
});

export default InventoryListScreen;
