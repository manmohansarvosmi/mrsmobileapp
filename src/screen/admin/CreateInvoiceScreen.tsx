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
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  getItems, 
  getAccounts, 
  createInvoice, 
  createEstimation 
} from '../../service/inventoryService';
import { Typography, Colors, CommonStyles } from '../../utils/theme';

interface InvoiceItem {
  id: string;
  productId?: number;
  name: string;
  qty: number;
  purchasePrice: number;
  margin: number;
  rate: number;
  taxRate: number;
}

const CreateInvoiceScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const isQuotation = route.params?.type === 'ESTIMATION';

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [ledgerAccount, setLedgerAccount] = useState<number | null>(null);
  
  const [products, setProducts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const fetchInitialData = async () => {
    try {
      const [pData, aData] = await Promise.all([getItems(), getAccounts()]);
      setProducts(pData || []);
      setAccounts(aData || []);
    } catch (error) {
      console.error('Fetch Data Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const addSelectedItems = () => {
    const newItems: InvoiceItem[] = [];
    selectedProductIds.forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        const cost = product.purchasePrice || 0;
        const sell = product.sellingPrice || 0;
        const margin = cost > 0 ? ((sell / cost - 1) * 100) : 0;
        
        newItems.push({
          id: Math.random().toString(36).substr(2, 9),
          productId: product.id,
          name: product.productName,
          qty: 1,
          purchasePrice: cost,
          margin: Math.round(margin * 100) / 100,
          rate: sell,
          taxRate: 18,
        });
      }
    });
    
    setItems([...items, ...newItems]);
    setShowProductModal(false);
    setSelectedProductIds([]);
    setSearchQuery('');
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      if (field === 'margin' || field === 'purchasePrice') {
        updated.rate = Math.round(updated.purchasePrice * (1 + (updated.margin || 0) / 100));
      } else if (field === 'rate') {
        if (updated.purchasePrice > 0) {
          updated.margin = Math.round(((updated.rate / updated.purchasePrice - 1) * 100) * 100) / 100;
        }
      }
      
      return updated;
    }));
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
    if (!clientName) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Add at least one item');
      return;
    }
    if (!isQuotation && !ledgerAccount) {
      Alert.alert('Error', 'Select a deposit account');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerName: clientName,
        customerAddress: clientAddress,
        customerGstin: clientGstin,
        items: items.map(i => ({
          product: i.productId ? { id: i.productId } : null,
          name: i.name,
          quantity: i.qty,
          unitPrice: i.rate,
          taxRate: i.taxRate,
          totalPrice: (i.qty * i.rate) * (1 + i.taxRate / 100)
        })),
        totalAmount: totals.total,
        netAmount: totals.subtotal,
        taxAmount: totals.tax,
        status: isQuotation ? 'DRAFT' : 'PAID',
        financialAccountId: ledgerAccount
      };

      console.log('Submission Payload:', JSON.stringify(payload, null, 2));

      const res = isQuotation 
        ? await createEstimation(payload) 
        : await createInvoice({ ...payload, isPos: false });

      console.log('Server Response:', res);

      if (res.status === 1 || res.success) {
        Alert.alert('Success', `${isQuotation ? 'Estimation' : 'Invoice'} created successfully!`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', res.message || 'Saving failed. Please check your inputs.');
      }
    } catch (error: any) {
      console.error('Submit Error Details:', error);
      const msg = error?.response?.data?.message || error.message || 'Network request failed';
      Alert.alert('Error', `Submit failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
           <Icon name="arrow-back" size={24} color={Colors.text.main} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
           <Text style={styles.headerSubtitle}>ADMIN ENTRY</Text>
           <Text style={styles.headerTitle}>{isQuotation ? 'Create Estimation' : 'Generate Invoice'}</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn}>
           <Icon name="more-vert" size={24} color={Colors.text.main} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.compactCard}>
           <View style={styles.compactInputRow}>
              <Icon name="person" size={18} color={Colors.primary} />
              <TextInput
                style={styles.compactInput}
                placeholder="Customer Name *"
                placeholderTextColor={Colors.text.light}
                value={clientName}
                onChangeText={setClientName}
              />
              <View style={styles.verticalDivider} />
              <Icon name="phone" size={18} color={Colors.text.light} />
              <TextInput
                style={[styles.compactInput, { width: 120 }]}
                placeholder="Mobile"
                placeholderTextColor={Colors.text.light}
                value={clientPhone}
                onChangeText={setClientPhone}
                keyboardType="phone-pad"
              />
           </View>
           <View style={styles.horizontalDivider} />
           <View style={styles.compactInputRow}>
              <Icon name="verified" size={18} color={Colors.text.light} />
              <TextInput
                style={[styles.compactInput, { textTransform: 'uppercase' }]}
                placeholder="GSTIN (Optional)"
                placeholderTextColor={Colors.text.light}
                value={clientGstin}
                onChangeText={setClientGstin}
              />
           </View>
        </View>

        {!isQuotation && (
          <View style={styles.compactAccountBox}>
             <Text style={styles.compactLabel}>Deposit to:</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 5 }}>
                {accounts.map(acc => (
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    key={acc.id}
                    style={[styles.miniChip, ledgerAccount === acc.id && styles.miniChipActive]}
                    onPress={() => setLedgerAccount(acc.id)}
                  >
                    <Text style={[styles.miniChipText, ledgerAccount === acc.id && styles.miniChipTextActive]}>{acc.name}</Text>
                  </TouchableOpacity>
                ))}
             </ScrollView>
          </View>
        )}

        <View style={styles.compactRowBetween}>
          <Text style={styles.compactSectionTitle}>Items ({items.length})</Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.compactAddBtn} onPress={() => setShowProductModal(true)}>
            <Icon name="add" size={18} color="#fff" />
            <Text style={styles.compactAddBtnText}>Catalog</Text>
          </TouchableOpacity>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.slimItemCard}>
            <View style={styles.slimItemHeader}>
               <Text style={styles.slimItemName} numberOfLines={1}>{item.name}</Text>
               <TouchableOpacity activeOpacity={0.7} onPress={() => removeItem(item.id)}>
                 <Icon name="close" size={18} color={Colors.text.light} />
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
                 <Text style={styles.gridLabel}>Cost</Text>
                 <TextInput
                   style={styles.gridInput}
                   keyboardType="numeric"
                   value={item.purchasePrice.toString()}
                   onChangeText={(v) => updateItem(item.id, 'purchasePrice', parseFloat(v) || 0)}
                 />
              </View>
              <View style={styles.gridCol}>
                 <Text style={[styles.gridLabel, { color: Colors.success }]}>Margin%</Text>
                 <TextInput
                   style={[styles.gridInput, { color: Colors.success }]}
                   keyboardType="numeric"
                   value={item.margin.toString()}
                   onChangeText={(v) => updateItem(item.id, 'margin', parseFloat(v) || 0)}
                 />
              </View>
              <View style={styles.gridCol}>
                 <Text style={styles.gridLabel}>Sell Rate</Text>
                 <TextInput
                   style={[styles.gridInput, { fontWeight: '900', color: Colors.primary }]}
                   keyboardType="numeric"
                   value={item.rate.toString()}
                   onChangeText={(v) => updateItem(item.id, 'rate', parseFloat(v) || 0)}
                 />
              </View>
            </View>

            <View style={styles.slimItemFooter}>
               <Text style={styles.profitBadge}>Profit: ₹{Math.round(item.rate - item.purchasePrice)}</Text>
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
            <Text style={styles.proLabel}>Tax (GST 18%)</Text>
            <Text style={styles.proValue}>₹{totals.tax.toLocaleString()}</Text>
          </View>
          <View style={styles.proDivider} />
          <View style={styles.proTotalRow}>
            <Text style={styles.proTotalLabel}>Grand Total</Text>
            <Text style={styles.proTotalValue}>₹{totals.total.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity 
          activeOpacity={0.7}
          style={[styles.proSubmit, (saving || totals.total === 0) && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={saving || totals.total === 0}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : 
          <Text style={styles.proSubmitText}>FINALIZE {isQuotation ? 'ESTIMATE' : 'INVOICE'}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <View>
                 <Text style={styles.modalTitle}>Product Catalog</Text>
                 <Text style={styles.modalSubtitle}>Select items to add to bill</Text>
               </View>
               <TouchableOpacity activeOpacity={0.7} style={styles.closeBtn} onPress={() => setShowProductModal(false)}>
                  <Icon name="close" size={20} color={Colors.text.main} />
               </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
               <Icon name="search" size={20} color={Colors.text.light} />
               <TextInput 
                 style={styles.modalSearchInput} 
                 placeholder="Search by name or category..." 
                 placeholderTextColor={Colors.text.light}
                 value={searchQuery}
                 onChangeText={setSearchQuery}
               />
            </View>
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedProductIds.includes(item.id);
                return (
                  <TouchableOpacity 
                    style={[styles.productCard, isSelected && styles.productCardSelected]} 
                    onPress={() => toggleProductSelection(item.id)}
                    activeOpacity={0.7}
                  >
                     <View style={[styles.productIconBox, isSelected && styles.productIconBoxSelected]}>
                        <Icon 
                          name={isSelected ? "check-circle" : "inventory"} 
                          size={22} 
                          color={isSelected ? "#fff" : Colors.text.light} 
                        />
                     </View>
                     <View style={{ flex: 1 }}>
                       <Text style={styles.productName}>{item.productName || 'Unnamed Product'}</Text>
                       <View style={styles.productSpecs}>
                          <Text style={styles.specLabel}>MRP: <Text style={styles.specValue}>₹{item.sellingPrice || 0}</Text></Text>
                          <View style={styles.specDot} />
                          <Text style={styles.specLabel}>COST: <Text style={styles.specValue}>₹{item.purchasePrice || 0}</Text></Text>
                       </View>
                     </View>
                     <View style={[styles.selectionCircle, isSelected && styles.selectionCircleActive]}>
                        {isSelected && <View style={styles.selectionDot} />}
                     </View>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
            {selectedProductIds.length > 0 && (
              <View style={styles.modalFooter}>
                 <TouchableOpacity activeOpacity={0.7} style={styles.bulkAddBtn} onPress={addSelectedItems}>
                    <Text style={styles.bulkAddText}>ADD {selectedProductIds.length} ITEMS TO BILL</Text>
                    <Icon name="arrow-forward" size={20} color="#fff" />
                 </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: Colors.primary, letterSpacing: 1.5, fontFamily: Typography.fontFamily.semiBold },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { padding: 12, paddingBottom: 40 },
  
  compactCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, ...CommonStyles.shadow },
  compactInputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  compactInput: { flex: 1, paddingHorizontal: 8, fontSize: Typography.size.md, color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  verticalDivider: { width: 1, height: 16, backgroundColor: Colors.border, marginHorizontal: 8 },
  horizontalDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },

  compactAccountBox: { marginBottom: 15 },
  compactLabel: { fontSize: Typography.size.xs, fontWeight: '600', color: Colors.text.light, marginBottom: 8, fontFamily: Typography.fontFamily.regular, textTransform: 'uppercase', letterSpacing: 0.5 },
  miniChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  miniChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  miniChipText: { fontSize: Typography.size.sm, color: Colors.text.muted, fontFamily: Typography.fontFamily.regular, fontWeight: '600' },
  miniChipTextActive: { color: '#fff' },

  compactRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  compactSectionTitle: { fontSize: Typography.size.md, fontWeight: '700', color: Colors.text.muted, fontFamily: Typography.fontFamily.regular, textTransform: 'uppercase' },
  compactAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.secondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, ...CommonStyles.shadow },
  compactAddBtnText: { fontSize: Typography.size.sm, color: '#fff', fontFamily: Typography.fontFamily.regular, fontWeight: '700' },

  slimItemCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, ...CommonStyles.shadow },
  slimItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  slimItemName: { fontSize: Typography.size.md, fontWeight: '700', color: Colors.text.main, flex: 1, fontFamily: Typography.fontFamily.regular },
  gridRow: { flexDirection: 'row', gap: 10 },
  gridCol: { flex: 1 },
  gridLabel: { fontSize: 10, color: Colors.text.light, marginBottom: 4, fontFamily: Typography.fontFamily.regular, fontWeight: '700', textTransform: 'uppercase' },
  gridInput: { 
    backgroundColor: '#f8fafc', 
    height: 40, 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    fontSize: Typography.size.md, 
    color: Colors.text.main, 
    fontFamily: Typography.fontFamily.regular,
    fontWeight: '700',
    textAlignVertical: 'center',
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: Colors.border
  },
  slimItemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  profitBadge: { fontSize: Typography.size.xs, color: Colors.success, fontFamily: Typography.fontFamily.regular, fontWeight: '700' },
  slimTotal: { fontSize: Typography.size.md, fontWeight: '800', color: Colors.primary, fontFamily: Typography.fontFamily.regular },

  proSummary: { backgroundColor: Colors.secondary, borderRadius: 16, padding: 16, marginTop: 8, ...CommonStyles.shadow },
  proSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  proLabel: { fontSize: Typography.size.xs, color: 'rgba(255,255,255,0.7)', fontFamily: Typography.fontFamily.regular, fontWeight: '600' },
  proValue: { fontSize: Typography.size.sm, color: '#fff', fontFamily: Typography.fontFamily.regular, fontWeight: '700' },
  proDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 },
  proTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proTotalLabel: { fontSize: Typography.size.md, color: '#fff', fontWeight: '800', fontFamily: Typography.fontFamily.regular },
  proTotalValue: { fontSize: Typography.size.xxl, fontWeight: '800', color: '#fff', fontFamily: Typography.fontFamily.regular },

  proSubmit: { backgroundColor: Colors.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20, ...CommonStyles.shadow },
  proSubmitText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700', fontFamily: Typography.fontFamily.regular },
  submitBtnDisabled: { opacity: 0.5, backgroundColor: Colors.text.light },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', padding: 20, paddingBottom: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: '700', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  modalSubtitle: { fontSize: Typography.size.xs, color: Colors.text.light, fontFamily: Typography.fontFamily.regular },
  closeBtn: { padding: 8, backgroundColor: Colors.background, borderRadius: 10 },
  modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 15, borderWidth: 1, borderColor: Colors.border },
  modalSearchInput: { flex: 1, marginLeft: 8, fontSize: Typography.size.md, color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  
  productCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', ...CommonStyles.shadow },
  productCardSelected: { borderColor: Colors.primary, backgroundColor: '#fff5f5' },
  productIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  productIconBoxSelected: { backgroundColor: Colors.primary },
  productName: { fontSize: Typography.size.md, fontWeight: '700', color: Colors.text.main, marginBottom: 4, fontFamily: Typography.fontFamily.regular },
  productSpecs: { flexDirection: 'row', alignItems: 'center' },
  specLabel: { fontSize: Typography.size.xs, color: Colors.text.light, fontFamily: Typography.fontFamily.regular },
  specValue: { color: Colors.text.muted, fontWeight: '700' },
  specDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginHorizontal: 8 },
  selectionCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  selectionCircleActive: { borderColor: Colors.primary },
  selectionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  
  modalFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  bulkAddBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, ...CommonStyles.shadow },
  bulkAddText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700', fontFamily: Typography.fontFamily.regular },
});

export default CreateInvoiceScreen;
