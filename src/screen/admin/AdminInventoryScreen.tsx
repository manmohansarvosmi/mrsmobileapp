import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { getInventoryStats, getInvoices, InventoryStats } from '../../service/inventoryService';
import { Typography, Colors, CommonStyles } from '../../utils/theme';

const { width } = Dimensions.get('window');

const AdminInventoryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayLabels, setDayLabels] = useState<string[]>(['M', 'T', 'W', 'T', 'F', 'S', 'S']);

  const fetchStats = async () => {
    try {
      const [statsData, invoicesData] = await Promise.all([
        getInventoryStats(),
        getInvoices()
      ]);
      setStats(statsData);
      setInvoices(invoicesData || []);
      calculateSalesHistory(invoicesData || [], weekOffset);
    } catch (error) {
      console.error('Fetch Stats Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateSalesHistory = (invoiceList: any[], offset: number) => {
    const history = [0, 0, 0, 0, 0, 0, 0];
    const labels = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const targetEnd = new Date(today);
    targetEnd.setDate(today.getDate() - (offset * 7));
    
    // Generate day labels for this range
    for (let i = 6; i >= 0; i--) {
       const d = new Date(targetEnd);
       d.setDate(targetEnd.getDate() - i);
       labels.push(d.toLocaleDateString('en-US', { weekday: 'narrow' }));
    }
    setDayLabels(labels);

    invoiceList.forEach(inv => {
      const invDate = new Date(inv.date);
      const diffDays = Math.floor((targetEnd.getTime() - invDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        history[6 - diffDays] += (inv.totalAmount || 0);
      }
    });

    const maxSale = Math.max(...history, 1);
    const normalized = history.map(val => (val / maxSale) * 100);
    setSalesHistory(normalized);
  };

  useEffect(() => {
    fetchStats();
  }, [weekOffset]);

  const getWeekRangeLabel = () => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() - (weekOffset * 7));
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    
    if (weekOffset === 0) return 'Last 7 Days';
    
    const options: any = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-IN', options)} - ${end.toLocaleDateString('en-IN', options)}`;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const avgSales = invoices.length > 0 ? invoices.reduce((acc, inv) => acc + inv.totalAmount, 0) / invoices.length : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#e11d2e" />
      
      {/* Premium Header */}
      <View style={[styles.header, { paddingVertical: 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
           <Icon name="arrow-back" size={24} color={Colors.text.main} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
           <Text style={styles.headerTitle}>Inventory Master</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn}>
           <Icon name="history" size={24} color={Colors.text.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scrollBody}
      >
        {/* Main Stats Row */}
        <View style={styles.mainStats}>
           <View style={[styles.mainStatBox, { backgroundColor: '#eff6ff' }]}>
              <Text style={[styles.mainStatVal, { color: Colors.info }]}>{stats?.totalItems || 0}</Text>
              <Text style={styles.mainStatLab}>Total SKUs</Text>
           </View>
           <View style={[styles.mainStatBox, { backgroundColor: '#f0fdf4' }]}>
              <Text style={[styles.mainStatVal, { color: Colors.success }]}>₹{((stats?.totalValue || 0)/1000).toFixed(1)}K</Text>
              <Text style={styles.mainStatLab}>Net Value</Text>
           </View>
        </View>

        {/* Shortage Alert */}
        {stats?.lowStockItems ? (
           <View style={styles.warningBanner}>
              <View style={styles.bannerIcon}><Icon name="warning-amber" size={20} color="#fff" /></View>
              <Text style={styles.bannerText}>{stats.lowStockItems} items are running low</Text>
              <TouchableOpacity style={styles.bannerAction}>
                 <Text style={styles.bannerActionText}>VIEW ALL</Text>
              </TouchableOpacity>
           </View>
        ) : null}

        {/* Sales Performance Graph */}
        <View style={styles.insightCard}>
           <View style={styles.insightHeader}>
              <Text style={styles.insightTitle}>Sales Insight</Text>
              <View style={styles.navRow}>
                 <TouchableOpacity onPress={() => setWeekOffset(p => p + 1)}>
                   <Icon name="chevron-left" size={20} color={Colors.text.light} />
                 </TouchableOpacity>
                 <Text style={styles.insightSub}>{getWeekRangeLabel()}</Text>
                 <TouchableOpacity onPress={() => setWeekOffset(p => Math.max(0, p - 1))} disabled={weekOffset === 0}>
                   <Icon name="chevron-right" size={20} color={weekOffset === 0 ? Colors.border : Colors.text.light} />
                 </TouchableOpacity>
              </View>
           </View>
           <View style={styles.chartContainer}>
              {dayLabels.map((day, idx) => (
                <View key={idx} style={styles.chartCol}>
                   <View style={[styles.chartBar, { height: Math.max((salesHistory[idx] / 100) * 120, 5), backgroundColor: (weekOffset === 0 && idx === 6) ? Colors.primary : '#e2e8f0' }]} />
                   <Text style={styles.chartLabel}>{day}</Text>
                </View>
              ))}
           </View>
           <View style={styles.insightFooter}>
              <View style={styles.insightMetric}>
                 <Text style={styles.metricVal}>LIVE</Text>
                 <Text style={styles.metricLab}>Actual Data</Text>
              </View>
              <View style={styles.insightMetric}>
                 <Text style={styles.metricVal}>₹{(avgSales/1000).toFixed(1)}K</Text>
                 <Text style={styles.metricLab}>Avg Sales</Text>
              </View>
           </View>
        </View>

        {/* Module Grid (2x2) */}
        <View style={styles.moduleGrid}>
            <View style={styles.gridRow}>
              <LargeModuleBtn 
                title="Invoices" 
                count={`${invoices.length} Records`} 
                icon="receipt" 
                color="#ef4444" 
                onPress={() => navigation.navigate('InvoiceList' as any)} 
              />
              <LargeModuleBtn 
                title="Estimations" 
                count="Live Data" 
                icon="assignment" 
                color="#f59e0b" 
                onPress={() => navigation.navigate('EstimationList' as any)} 
              />
           </View>
           <View style={styles.gridRow}>
              <LargeModuleBtn 
                title="Items Master" 
                count="Active" 
                icon="archive" 
                color="#3b82f6" 
                onPress={() => navigation.navigate('InventoryList' as any)} 
              />
              <LargeModuleBtn 
                title="Purchase Orders" 
                count="Status Tracker" 
                icon="payments" 
                color="#8b5cf6" 
                onPress={() => navigation.navigate('PurchaseOrderList' as any)} 
              />
           </View>
        </View>
        
        {/* Quick Report */}
        <TouchableOpacity style={styles.primaryAction}>
           <Icon name="summarize" size={22} color="#fff" />
           <Text style={styles.primaryActionText}>Export Inventory Ledger</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const LargeModuleBtn = ({ title, count, icon, color, onPress }: any) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.gridItem} onPress={onPress}>
     <View style={[styles.gridIconBox, { backgroundColor: `${color}10` }]}>
        <Icon name={icon} size={28} color={color} />
     </View>
     <Text style={styles.gridTitle}>{title}</Text>
     <View style={styles.gridBadge}>
        <Text style={[styles.gridBadgeText, { color: color }]}>{count}</Text>
     </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, marginLeft: 10 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: Colors.primary, letterSpacing: 1.5, fontFamily: Typography.fontFamily.semiBold },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  
  scrollBody: { paddingHorizontal: 20, paddingBottom: 40 },
  
  mainStats: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 15 },
  mainStatBox: { flex: 1, padding: 20, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  mainStatVal: { fontSize: 20, fontWeight: '800', fontFamily: Typography.fontFamily.semiBold },
  mainStatLab: { fontSize: 11, color: Colors.text.light, marginTop: 4, fontWeight: '700', fontFamily: Typography.fontFamily.regular },
  
  warningBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ef4444', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 20 
  },
  bannerIcon: { width: 32, height: 32, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bannerText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: Typography.fontFamily.regular },
  bannerAction: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  bannerActionText: { fontSize: 10, fontWeight: '800', color: '#ef4444' },

  insightCard: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 20, 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: '#f1f5f9',
    ...CommonStyles.shadow 
  },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  insightSub: { fontSize: 11, color: Colors.text.light, fontWeight: '700', fontFamily: Typography.fontFamily.regular },
  
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingBottom: 10 },
  chartCol: { alignItems: 'center', width: 30 },
  chartBar: { width: 12, borderRadius: 6, marginBottom: 8 },
  chartLabel: { fontSize: 9, color: Colors.text.light, fontWeight: '700' },
  
  insightFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15, marginTop: 5 },
  insightMetric: { flex: 1, alignItems: 'center' },
  metricVal: { fontSize: 15, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  metricLab: { fontSize: 9, color: Colors.text.light, marginTop: 2, fontWeight: '700', fontFamily: Typography.fontFamily.regular },

  moduleGrid: { gap: 12, marginBottom: 30 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridItem: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#f1f5f9', 
    ...CommonStyles.shadow 
  },
  gridIconBox: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  gridTitle: { fontSize: 15, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  gridBadge: { marginTop: 6 },
  gridBadgeText: { fontSize: 11, fontWeight: '800', fontFamily: Typography.fontFamily.regular },
  
  primaryAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.text.main, 
    padding: 18, 
    borderRadius: 8, 
    gap: 12,
    ...CommonStyles.shadow
  },
  primaryActionText: { color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: Typography.fontFamily.regular },
});

export default AdminInventoryScreen;
