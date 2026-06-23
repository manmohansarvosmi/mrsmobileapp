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
import { getInvoices, Invoice } from '../../service/inventoryService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Typography, Colors, CommonStyles } from '../../utils/theme';

const InvoiceListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoices = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data || []);
    } catch (error) {
      console.error('Fetch Invoices Error:', error);
      // Dummy data Fallback
      const dummy: Invoice[] = [
        { 
          id: 1, 
          invoiceNumber: 'INV-2024-001', 
          customerName: 'Manmohan Sarvosmi', 
          date: '2024-06-18T10:30:00', 
          totalAmount: 15600, 
          status: 'PAID',
          itemCount: 4,
          profitAmount: 2340,
          items: [
             { id: 101, name: 'Mens Denim Slim', quantity: 1, purchasePrice: 1200, mrp: 1800, profitPercentage: '33%' },
             { id: 102, name: 'Cotton Shirt XL', quantity: 2, purchasePrice: 800, mrp: 1200, profitPercentage: '33%' }
          ]
        },
      ];
      setInvoices(dummy);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const handleShare = async (inv: Invoice) => {
    try {
      await Share.share({
        message: `Invoice ${inv.invoiceNumber} for ${inv.customerName}\nAmount: ₹${inv.totalAmount}\nDate: ${inv.date}`,
      });
    } catch (error) {
      console.error('Share Error:', error);
    }
  };

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) {
         const parts = dateStr.split('T');
         if (parts.length > 0) {
            const dateParts = parts[0].split('-');
            if(dateParts.length === 3) return { date: `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`, time: '' };
         }
         return { date: dateStr, time: '' };
      }
      
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const yyyy = dt.getFullYear();
      
      let hours = dt.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const mins = String(dt.getMinutes()).padStart(2, '0');
      
      const hasTime = dateStr.includes('T') || dateStr.includes(':');

      return {
        date: `${dd}/${mm}/${yyyy}`,
        time: hasTime ? `${hours}:${mins} ${ampm}` : ''
      };
    } catch (e) {
      return { date: dateStr, time: '' };
    }
  };

  const renderItem = ({ item }: { item: Invoice }) => {
    const { date, time } = formatDateTime(item.date);
    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        style={styles.itemCard} 
        onPress={() => toggleExpand(item.id)}
      >
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.numberText}>{item.invoiceNumber}</Text>
            <Text style={styles.clientName}>{item.customerName}</Text>
            <Text style={styles.dateText}>
              <Icon name="calendar-today" size={10} color={Colors.text.light} /> {date}
              {time ? <Text style={styles.timeText}>  •  <Icon name="access-time" size={10} color={Colors.text.light} /> {time}</Text> : null}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
             <TouchableOpacity activeOpacity={0.7} style={styles.miniShare} onPress={() => handleShare(item)}>
                <Icon name="share" size={14} color={Colors.primary} />
             </TouchableOpacity>
             <View style={[styles.statusBadge, { backgroundColor: item.status === 'PAID' ? '#ecfdf5' : '#fffbeb' }]}>
               <Text style={[styles.statusText, { color: item.status === 'PAID' ? Colors.success : Colors.warning }]}>
                 {item.status}
               </Text>
             </View>
          </View>
        </View>

        <View style={styles.billStatsRow}>
           <View style={styles.billStat}>
              <Text style={styles.billStatLabel}>ITEMS</Text>
              <Text style={styles.billStatVal}>{item.itemCount || 0}</Text>
           </View>
           <View style={styles.billStat}>
              <Text style={styles.billStatLabel}>BILL AMT</Text>
              <Text style={styles.billStatVal}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
           </View>
           <View style={styles.billStat}>
              <Text style={[styles.billStatLabel, { color: Colors.success }]}>PROFIT</Text>
              <Text style={[styles.billStatVal, { color: Colors.success }]}>₹{(item.profitAmount || 0).toLocaleString('en-IN')}</Text>
           </View>
        </View>

        {expandedId === item.id && item.items && (
           <View style={styles.expandedSection}>
              <View style={styles.expandHeader}>
                 <Text style={styles.expandTitle}>Bill Breakdown</Text>
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
           <Icon name="arrow-back" size={24} color={Colors.text.main} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
           <Text style={styles.headerTitle}>Invoices</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('CreateInvoice', { type: 'INVOICE' })}>
           <Icon name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={invoices}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Icon name="receipt-long" size={48} color={Colors.border} />
               <Text style={styles.emptyText}>No invoices generated yet</Text>
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
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, marginLeft: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 12, paddingBottom: 40 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    ...CommonStyles.shadow,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  miniShare: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  numberText: { fontSize: 9, color: Colors.text.light, fontWeight: '700', textTransform: 'uppercase' },
  clientName: { fontSize: 13, fontWeight: '800', color: Colors.text.main },
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
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  statusText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  dateText: { fontSize: 10, color: Colors.text.light, marginTop: 2, fontWeight: '500' },
  timeText: { color: Colors.text.muted, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.text.light },
});

export default InvoiceListScreen;
