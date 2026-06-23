import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { 
  getItems, 
  getAccounts, 
  createPurchaseOrder 
} from '../../service/inventoryService';
import api from '../../service/api';

interface POItem {
  id: string;
  productId?: number;
  name: string;
  qty: number;
  rate: number;
  taxRate: number;
}

const CreatePOScreen: React.FC = () => {
  const navigation = useNavigation();

  const [items, setItems] = useState<POItem[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [poNumber, setPoNumber] = useState(`PO-${Date.now().toString().slice(-6)}`);
  
  const [products, setProducts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInitialData = async () => {
    try {
      const [pData, aData, vRes] = await Promise.all([
        getItems(), 
        getAccounts(),
        api.get('/vendors')
      ]);
      setProducts(pData || []);
      setAccounts(aData || []);
      setVendors(vRes.data.data || []);
    } catch (error) {
      console.error('Fetch Data Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const addItemFromProduct = (product: any) => {
    const newItem: POItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      name: product.productName,
      qty: 1,
      rate: product.purchasePrice || 0,
      taxRate: 18,
    };
    setItems([...items, newItem]);
    setShowProductModal(false);
    setSearchQuery('');
  };

  const updateItem = (id: string, field: keyof POItem, value: any) => {
    setItems(items.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const sub = item.qty * item.rate;
      const tax = sub * (item.taxRate / 100);
      return {
        subtotal: acc.subtotal + sub,
        tax: acc.tax + tax,
        total: acc.total + sub + tax,
      };
    }, { subtotal: 0, tax: 0, total: 0 });
  }, [items]);

  const handleSubmit = async () => {
    if (!selectedVendorId) {
      Alert.alert('Error', 'Vendor is required');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Add at least one item');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Error', 'Select a payment account');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplier: { id: selectedVendorId },
        purchaseDate: new Date(),
        invoiceNumber: poNumber,
        status: 'RECEIVED',
        ledger: { id: selectedAccountId },
        totalAmount: totals.subtotal,
        taxAmount: totals.tax,
        netAmount: totals.total,
        items: items.map(i => ({
          product: { id: i.productId },
          quantity: i.qty,
          unitPrice: i.rate,
          taxAmount: i.qty * i.rate * (i.taxRate / 100),
          totalAmount: i.qty * i.rate * (1 + i.taxRate / 100)
        })),
      };

      const res = await createPurchaseOrder(payload);

      if (res.status === 1) {
        Alert.alert('Success', 'Purchase Order created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', res.message || 'Saving failed');
      }
    } catch (error) {
      console.error('Submit Error:', error);
      Alert.alert('Error', 'Network request failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#7c3aed" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
           <Icon name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
           <Text style={styles.headerSubtitle}>ADMIN ENTRY</Text>
           <Text style={styles.headerTitle}>New Purchase Order</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn}>
           <Icon name="more-vert" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Compact Header replaced by top-padding */}
        
        {/* Vendor Selection */}
        <View style={styles.compactCard}>
           <Text style={styles.compactLabel}>Select Vendor *</Text>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {vendors.map(v => (
                <TouchableOpacity 
                  key={v.id}
                  style={[styles.miniChip, selectedVendorId === v.id && styles.miniChipActive]}
                  onPress={() => setSelectedVendorId(v.id)}
                >
                  <Text style={[styles.miniChipText, selectedVendorId === v.id && styles.miniChipTextActive]}>{v.vendorName || v.supplierName}</Text>
                </TouchableOpacity>
              ))}
           </ScrollView>
           <View style={styles.horizontalDivider} />
           <View style={styles.compactInputRow}>
              <Icon name="tag" size={14} color="#64748b" />
              <TextInput 
                style={styles.compactInput} 
                placeholder="PO Reference Number"
                value={poNumber} 
                onChangeText={setPoNumber} 
              />
           </View>
        </View>

        {/* Payment Account */}
        <View style={styles.compactCard}>
           <Text style={styles.compactLabel}>Payment From *</Text>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {accounts.map(acc => (
                <TouchableOpacity 
                  key={acc.id}
                  style={[styles.miniChip, selectedAccountId === acc.id && styles.miniChipActive]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <Text style={[styles.miniChipText, selectedAccountId === acc.id && styles.miniChipTextActive]}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
           </ScrollView>
        </View>

        <View style={styles.compactRowBetween}>
          <Text style={styles.compactSectionTitle}>items ({items.length})</Text>
          <TouchableOpacity style={styles.compactAddBtn} onPress={() => setShowProductModal(true)}>
            <Icon name="add" size={16} color="#fff" />
            <Text style={styles.compactAddBtnText}>Catalog</Text>
          </TouchableOpacity>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.slimItemCard}>
            <View style={styles.slimItemHeader}>
               <Text style={styles.slimItemName} numberOfLines={1}>{item.name}</Text>
               <TouchableOpacity onPress={() => removeItem(item.id)}>
                 <Icon name="close" size={16} color="#cbd5e1" />
               </TouchableOpacity>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                 <Text style={styles.gridLabel}>Qty</Text>
                 <TextInput
                   style={styles.gridInput}
                   keyboardType="numeric"
                   value={item.qty.toString()}
                   onChangeText={(v) => updateItem(item.id, 'qty', parseFloat(v) || 0)}
                 />
              </View>
              <View style={styles.gridCol}>
                 <Text style={styles.gridLabel}>Rate</Text>
                 <TextInput
                   style={styles.gridInput}
                   keyboardType="numeric"
                   value={item.rate.toString()}
                   onChangeText={(v) => updateItem(item.id, 'rate', parseFloat(v) || 0)}
                 />
              </View>
              <View style={styles.gridCol}>
                 <Text style={styles.gridLabel}>GST%</Text>
                 <TextInput
                   style={styles.gridInput}
                   keyboardType="numeric"
                   value={item.taxRate.toString()}
                   onChangeText={(v) => updateItem(item.id, 'taxRate', parseFloat(v) || 0)}
                 />
              </View>
            </View>

            <View style={styles.slimItemFooter}>
               <Text style={styles.slimTotal}>₹{Math.round((item.qty * item.rate) * (1 + item.taxRate / 100)).toLocaleString()}</Text>
            </View>
          </View>
        ))}

        <View style={styles.proSummary}>
           <View style={styles.proSummaryRow}>
              <Text style={styles.proLabel}>Subtotal</Text>
              <Text style={styles.proValue}>₹{totals.subtotal.toLocaleString()}</Text>
           </View>
           <View style={styles.proSummaryRow}>
              <Text style={styles.proLabel}>Tax Aggregate</Text>
              <Text style={styles.proValue}>₹{totals.tax.toLocaleString()}</Text>
           </View>
           <View style={styles.proDivider} />
           <View style={styles.proTotalRow}>
              <Text style={styles.proTotalLabel}>GRAND TOTAL</Text>
              <Text style={[styles.proTotalValue, { color: '#7c3aed' }]}>₹{totals.total.toLocaleString()}</Text>
           </View>
        </View>

        <TouchableOpacity 
          style={[styles.proSubmit, { backgroundColor: '#7c3aed' }, (saving || totals.total === 0) && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={saving || totals.total === 0}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : 
          <Text style={styles.proSubmitText}>FINALIZE PURCHASE</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Product Selection Modal */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select Item</Text>
               <TouchableOpacity onPress={() => setShowProductModal(false)} style={styles.closeBtn}>
                  <Icon name="close" size={18} color="#64748b" />
               </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
               <Icon name="search" size={16} color="#94a3b8" />
               <TextInput 
                 style={styles.modalSearchInput} 
                 placeholder="Search by name..." 
                 value={searchQuery}
                 onChangeText={setSearchQuery}
               />
            </View>
            <FlatList
              data={products.filter(p => p.productName.toLowerCase().includes(searchQuery.toLowerCase()))}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.itemRow} onPress={() => addItemFromProduct(item)}>
                   <View style={styles.itemIconBox}>
                      <Icon name="radio-button-unchecked" size={20} color="#cbd5e1" />
                   </View>
                   <View style={{ flex: 1 }}>
                      <Text style={styles.itemNameText}>{item.productName}</Text>
                      <Text style={styles.itemPriceText}>Cost: ₹{item.purchasePrice}</Text>
                   </View>
                   <Icon name="add" size={20} color="#7c3aed" />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
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
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: '#7c3aed', letterSpacing: 1.5, fontFamily: 'Poppins-Regular' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', fontFamily: 'Poppins-Regular' },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { padding: 12, paddingBottom: 40 },

  
  compactCard: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  compactInputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  compactInput: { flex: 1, paddingHorizontal: 8, fontSize: 12, color: '#1e293b', fontFamily: 'Poppins-Regular' },
  horizontalDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 6 },
  compactLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 8, fontFamily: 'Poppins-Regular' },

  miniChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  miniChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  miniChipText: { fontSize: 12, color: '#64748b', fontFamily: 'Poppins-Regular' },
  miniChipTextActive: { color: '#fff' },

  compactRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 10 },
  compactSectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', fontFamily: 'Poppins-Regular' },
  compactAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  compactAddBtnText: { fontSize: 12, color: '#fff', fontFamily: 'Poppins-Regular' },

  slimItemCard: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  slimItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  slimItemName: { fontSize: 12, fontWeight: '600', color: '#1e293b', flex: 1, fontFamily: 'Poppins-Regular' },
  gridRow: { flexDirection: 'row', gap: 8 },
  gridCol: { flex: 1 },
  gridLabel: { fontSize: 11, color: '#64748b', marginBottom: 4, fontFamily: 'Poppins-Regular', fontWeight: '500' },
  gridInput: { 
    backgroundColor: '#f8fafc', 
    height: 36, 
    borderRadius: 4, 
    paddingHorizontal: 8, 
    fontSize: 13, 
    color: '#1e293b', 
    fontFamily: 'Poppins-Regular',
    fontWeight: '500',
    textAlignVertical: 'center',
    paddingVertical: 0,
  },
  slimItemFooter: { alignItems: 'flex-end', marginTop: 8, borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 6 },
  slimTotal: { fontSize: 12, fontWeight: '700', color: '#1e293b', fontFamily: 'Poppins-Regular' },

  proSummary: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginTop: 8 },
  proSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  proLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Poppins-Regular' },
  proValue: { fontSize: 12, color: '#fff', fontFamily: 'Poppins-Regular' },
  proDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 8 },
  proTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proTotalLabel: { fontSize: 12, color: '#fff', fontWeight: '700', fontFamily: 'Poppins-Regular' },
  proTotalValue: { fontSize: 20, fontWeight: '700', color: '#fff', fontFamily: 'Poppins-Regular' },

  proSubmit: { height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  proSubmitText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'Poppins-Regular' },
  submitBtnDisabled: { opacity: 0.5 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', fontFamily: 'Poppins-Regular' },
  closeBtn: { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 6 },
  modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, height: 38, marginBottom: 16 },
  modalSearchInput: { flex: 1, marginLeft: 8, fontSize: 12, color: '#1e293b', fontFamily: 'Poppins-Regular' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemIconBox: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInitial: { fontSize: 13, fontWeight: '700', color: '#7c3aed', fontFamily: 'Poppins-Regular' },
  itemNameText: { fontSize: 13, fontWeight: '600', color: '#1e293b', fontFamily: 'Poppins-Regular' },
  itemPriceText: { fontSize: 11, color: '#94a3b8', fontFamily: 'Poppins-Regular' },
});

export default CreatePOScreen;
