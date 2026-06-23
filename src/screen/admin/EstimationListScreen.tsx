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
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getEstimations, Estimation } from '../../service/inventoryService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Typography, Colors, CommonStyles } from '../../utils/theme';

const EstimationListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEstimations = async () => {
    try {
      const data = await getEstimations();
      setEstimations(data || []);
    } catch (error) {
      console.error('Fetch Estimations Error:', error);
      const dummy: Estimation[] = [
        { 
          id: 1, 
          estimationNumber: 'EST-2024-001', 
          customerName: 'Manmohan Sarvosmi', 
          date: '2024-06-18', 
          totalAmount: 12000, 
          status: 'ACCEPTED',
          itemCount: 3,
          profitAmount: 1800,
          items: [
            { id: 101, name: 'Linen Trousers', quantity: 2, purchasePrice: 4000, mrp: 5000, profitPercentage: '25%' },
            { id: 102, name: 'Silk Scarf', quantity: 1, purchasePrice: 1500, mrp: 2000, profitPercentage: '33%' }
          ]
        },
        { 
          id: 2, 
          estimationNumber: 'EST-2024-002', 
          customerName: 'Reliance Trends', 
          date: '2024-06-17', 
          totalAmount: 38000, 
          status: 'SENT',
          itemCount: 8,
          profitAmount: 5700,
          items: [
            { id: 201, name: 'Bulk Order T-Shirts', quantity: 10, purchasePrice: 200, mrp: 350, profitPercentage: '75%' }
          ]
        },
      ];
      setEstimations(dummy);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEstimations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEstimations();
  };

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleShare = async (est: Estimation) => {
    try {
      await Share.share({
        message: `Estimation ${est.estimationNumber} for ${est.customerName}\nAmount: ₹${est.totalAmount}\nDate: ${est.date}`,
      });
    } catch (error) {
      console.error('Share Error:', error);
    }
  };

  const renderItem = ({ item }: { item: Estimation }) => (
    <TouchableOpacity 
      activeOpacity={0.9} 
      style={styles.itemCard} 
      onPress={() => toggleExpand(item.id)}
    >
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.numberText}>{item.estimationNumber}</Text>
          <Text style={styles.clientName}>{item.customerName}</Text>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
           <TouchableOpacity activeOpacity={0.7} style={styles.miniShare} onPress={() => handleShare(item)}>
              <Icon name="share" size={14} color="#f59e0b" />
           </TouchableOpacity>
           <View style={[styles.statusBadge, { backgroundColor: item.status === 'ACCEPTED' ? '#ecfdf5' : '#fffbeb' }]}>
             <Text style={[styles.statusText, { color: item.status === 'ACCEPTED' ? Colors.success : Colors.warning }]}>
               {item.status}
             </Text>
           </View>
        </View>
      </View>

      {/* Per-Estimation Stats Row */}
      <View style={styles.billStatsRow}>
         <View style={styles.billStat}>
            <Text style={styles.billStatLabel}>ITEMS</Text>
            <Text style={styles.billStatVal}>{item.itemCount || 0}</Text>
         </View>
         <View style={styles.billStat}>
            <Text style={styles.billStatLabel}>EST AMT</Text>
            <Text style={styles.billStatVal}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
         </View>
         <View style={styles.billStat}>
            <Text style={[styles.billStatLabel, { color: Colors.success }]}>PROFIT</Text>
            <Text style={[styles.billStatVal, { color: Colors.success }]}>₹{(item.profitAmount || 0).toLocaleString('en-IN')}</Text>
         </View>
      </View>

      {/* Expandable Item Details */}
      {expandedId === item.id && item.items && (
         <View style={styles.expandedSection}>
            <View style={styles.expandHeader}>
               <Text style={styles.expandTitle}>Estimation Breakdown</Text>
               <Text style={styles.expandMargin}>Margin: {item.totalAmount > 0 ? ((item.profitAmount/item.totalAmount)*100).toFixed(0) : 0}% Avg</Text>
            </View>
            {item.items.map((prod) => (
               <View key={prod.id} style={styles.productRow}>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.prodName}>{prod.name} (x{prod.quantity})</Text>
                     <View style={styles.priceRow}>
                        <Text style={styles.priceSpec}>Cost: ₹{prod.purchasePrice}</Text>
                        <Text style={styles.priceSpec}>MRP: ₹{prod.mrp}</Text>
                     </View>
                  </View>
                  <View style={styles.profitBadge}>
                     <Text style={styles.profitPercent}>+{prod.profitPercentage}</Text>
                  </View>
               </View>
            ))}
         </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
           <Icon name="arrow-back" size={24} color={Colors.text.main} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
           <Text style={styles.headerSubtitle}>ENTRIES</Text>
           <Text style={styles.headerTitle}>Estimations</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('CreateInvoice', { type: 'ESTIMATION' })}>
           <Icon name="add-circle" size={28} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={estimations}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f59e0b']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Icon name="receipt_long" size={48} color={Colors.border} />
               <Text style={styles.emptyText}>No estimations found</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, marginLeft: 10 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: '#f59e0b', letterSpacing: 1.5, fontFamily: Typography.fontFamily.semiBold },
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
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  listContent: { padding: 12, paddingBottom: 40 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    ...CommonStyles.shadow,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  miniShare: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center' },
  numberText: { fontSize: 9, color: Colors.text.light, fontWeight: '700', textTransform: 'uppercase' },
  clientName: { fontSize: 13, fontWeight: '800', color: Colors.text.main },
  dateText: { fontSize: 10, color: Colors.text.light },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  statusText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },

  billStatsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
    marginVertical: 6
  },
  billStat: { alignItems: 'center' },
  billStatLabel: { fontSize: 7, color: Colors.text.light, fontWeight: '700', marginBottom: 1 },
  billStatVal: { fontSize: 11, fontWeight: '800', color: Colors.text.main },

  expandedSection: { 
    marginTop: 4, 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9' 
  },
  expandHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  expandTitle: { fontSize: 10, fontWeight: '800', color: Colors.text.light, textTransform: 'uppercase' },
  expandMargin: { fontSize: 9, fontWeight: '700', color: Colors.success },
  productRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
    marginBottom: 6
  },
  prodName: { fontSize: 11, fontWeight: '700', color: Colors.text.main, marginBottom: 2 },
  priceRow: { flexDirection: 'row', gap: 10 },
  priceSpec: { fontSize: 9, color: Colors.text.light, fontWeight: '600' },
  profitBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  profitPercent: { fontSize: 10, fontWeight: '900', color: Colors.success },

  emptyContainer: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.text.light },
});

export default EstimationListScreen;
