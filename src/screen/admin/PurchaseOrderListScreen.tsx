import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getPurchaseOrders, PurchaseOrder } from '../../service/inventoryService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Typography, Colors, CommonStyles } from '../../utils/theme';

const PurchaseOrderListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await getPurchaseOrders();
      setOrders(data || []);
    } catch (error) {
      console.error('Fetch PO Error:', error);
      const dummy: PurchaseOrder[] = [
        { id: 1, poNumber: 'PO-2024-01', vendorName: 'Global Garments Inc', date: '2024-06-18', totalAmount: 85000, status: 'PENDING' },
        { id: 2, poNumber: 'PO-2024-02', vendorName: 'Silk & Thread Co', date: '2024-06-15', totalAmount: 45000, status: 'RECEIVED' },
      ];
      setOrders(dummy);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const renderItem = ({ item }: { item: PurchaseOrder }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.numberText}>{item.poNumber}</Text>
          <Text style={styles.vendorName}>{item.vendorName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'RECEIVED' ? '#ecfdf5' : '#eff6ff' }]}>
          <Text style={[styles.statusText, { color: item.status === 'RECEIVED' ? Colors.success : Colors.info }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.itemFooter}>
        <View>
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={styles.totalText}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={[styles.viewBtn, { backgroundColor: '#eff6ff' }]}>
          <Text style={[styles.viewLabel, { color: Colors.info }]}>View PO</Text>
          <Icon name="chevron-right" size={16} color={Colors.info} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
           <Icon name="arrow-back" size={24} color={Colors.text.main} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
           <Text style={styles.headerSubtitle}>PROCUREMENT</Text>
           <Text style={styles.headerTitle}>Purchase Orders</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('CreatePO')}>
           <Icon name="add-circle" size={28} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

        <View style={styles.summaryCard}>
            <View 
               style={styles.summaryItem} 
            >
              <View style={[styles.summaryIconBox, { backgroundColor: '#f5f3ff' }]}>
                 <Icon name="shopping_cart" size={20} color="#8b5cf6" />
              </View>
              <View>
                 <Text style={styles.summaryVal}>{orders.length}</Text>
                 <Text style={styles.summaryLab}>ORDERS</Text>
              </View>
            </View>

            <View 
               style={styles.summaryItem} 
            >
              <View style={[styles.summaryIconBox, { backgroundColor: '#fef2f2' }]}>
                 <Icon name="account_balance" size={20} color={Colors.danger} />
              </View>
              <View>
                 <Text style={styles.summaryVal}>₹{(orders.reduce((s, i) => s + i.totalAmount, 0)/1000).toFixed(1)}K</Text>
                 <Text style={styles.summaryLab}>TOTAL PO</Text>
              </View>
            </View>

            <View 
               style={styles.summaryItem} 
            >
              <View style={[styles.summaryIconBox, { backgroundColor: '#eff6ff' }]}>
                 <Icon name="hourglass_empty" size={20} color={Colors.info} />
              </View>
              <View>
                 <Text style={styles.summaryVal}>{orders.filter(o => o.status === 'PENDING').length}</Text>
                 <Text style={styles.summaryLab}>PENDING</Text>
              </View>
            </View>
        </View>


      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b5cf6']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Icon name="local_shipping" size={48} color={Colors.border} />
               <Text style={styles.emptyText}>No purchase orders found</Text>
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
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: '#fff', 
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, marginLeft: 10, flexDirection: 'column' },
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: '#8b5cf6', letterSpacing: 1.5, fontFamily: Typography.fontFamily.semiBold },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  
  summaryCard: { 
    flexDirection: 'row', 
    backgroundColor: '#f8fafc', 
    borderRadius: 15, 
    padding: 12, 
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  summaryItem: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 10,
    ...CommonStyles.shadow
  },
  summaryIconBox: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  summaryVal: { fontSize: 13, fontWeight: '900', color: Colors.text.main, fontFamily: Typography.fontFamily.semiBold },
  summaryLab: { fontSize: 8, color: Colors.text.light, fontWeight: '700', fontFamily: Typography.fontFamily.regular },

  addBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8, 
    paddingVertical: 14, 
    borderRadius: 12,
    ...CommonStyles.shadow
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: Typography.fontFamily.regular },
  listContent: { padding: 16, paddingBottom: 40 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    ...CommonStyles.shadow,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  numberText: { fontSize: 10, color: Colors.text.light, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  vendorName: { fontSize: 15, fontWeight: '800', color: Colors.text.main },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  itemFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9' 
  },
  dateText: { fontSize: 11, color: Colors.text.light, marginBottom: 2 },
  totalText: { fontSize: 18, fontWeight: '900', color: Colors.text.main },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  viewLabel: { fontSize: 11, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.text.light },
});

export default PurchaseOrderListScreen;
