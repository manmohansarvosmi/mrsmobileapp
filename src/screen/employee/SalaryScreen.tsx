import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { getEmployeePayrollHistory, getPaySlip, getAttendanceDetails, PayrollRecord, PaySlipData } from '../../service/salaryService';

const SalaryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipData, setSlipData] = useState<PaySlipData | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);
  
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);

  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmployeePayrollHistory();
      setPayrollRecords(data || []);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch payroll history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayroll();
  };

  const handleViewSlip = async (payrollId: number) => {
    try {
      setSlipLoading(true);
      setShowSlipModal(true);
      const data = await getPaySlip(payrollId);
      setSlipData(data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch pay slip');
      setShowSlipModal(false);
    } finally {
      setSlipLoading(false);
    }
  };

  const handleViewAttendance = async (userId: number, month: string) => {
    try {
      setAttLoading(true);
      setShowAttendanceModal(true);
      const data = await getAttendanceDetails(userId, month);
      setAttendanceList(data || []);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch attendance details');
      setShowAttendanceModal(false);
    } finally {
      setAttLoading(false);
    }
  };

  const renderPayrollItem = ({ item }: { item: PayrollRecord }) => {
    const isPaid = item.status?.toUpperCase() === 'PAID';

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <View>
            <Text style={styles.recordMonth}>{item.month}</Text>
            <Text style={[styles.recordStatus, { color: isPaid ? '#16a34a' : '#f59e0b' }]}>
              {item.status?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.recordNetSalary}>₹{(item.netSalary || 0).toLocaleString()}</Text>
        </View>
        
        <View style={styles.recordDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Present</Text>
            <Text style={styles.detailValue}>{item.daysPresent || 0} Days</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Gross</Text>
            <Text style={styles.detailValue}>₹{(item.grossSalary || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Deductions</Text>
            <Text style={[styles.detailValue, { color: '#ef4444' }]}>-₹{(item.deductions || 0).toLocaleString()}</Text>
          </View>
        </View>
  
        <View style={styles.btnRow}>
          <TouchableOpacity 
            style={[
              styles.viewSlipBtn, 
              { flex: 1, marginRight: 8 },
              !isPaid && { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }
            ]}
            onPress={() => isPaid ? handleViewSlip(item.id) : Alert.alert('Action Restricted', 'Pay slip is only available after salary is marked as PAID.')}
          >
            <Icon 
              name={isPaid ? "receipt" : "lock"} 
              size={18} 
              color={isPaid ? "#b8001d" : "#94a3b8"} 
              style={{ marginRight: 8 }} 
            />
            <Text style={[styles.viewSlipText, !isPaid && { color: '#94a3b8' }]}>
              {isPaid ? "Pay Slip" : "Pending"}
            </Text>
          </TouchableOpacity>
  
          <TouchableOpacity 
            style={[styles.viewAttBtn, { flex: 1 }]}
            onPress={() => handleViewAttendance(item.user?.id || 1, item.month)}
          >
            <Icon name="event-note" size={18} color="#4b5563" style={{ marginRight: 8 }} />
            <Text style={styles.viewAttText}>Attendance</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#1a1c1c" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Payroll History</Text>
          <Text style={styles.headerSubtitle}>View all your past salary statements</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#b8001d" />
        </View>
      ) : (
        <FlatList
          data={payrollRecords}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPayrollItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#b8001d']} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="event-busy" size={64} color="#e2e8f0" />
              <Text style={styles.emptyText}>No payroll records found for this month.</Text>
            </View>
          }
        />
      )}

      {/* Pay Slip Modal */}
      <Modal visible={showSlipModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Electronic Pay Slip</Text>
              <TouchableOpacity onPress={() => setShowSlipModal(false)}>
                <Icon name="close" size={24} color="#1a1c1c" />
              </TouchableOpacity>
            </View>

            {slipLoading ? (
              <ActivityIndicator size="large" color="#b8001d" style={{ marginVertical: 40 }} />
            ) : slipData ? (
              <ScrollView>
                <View style={styles.slipContainer}>
                  <Text style={styles.orgName}>{slipData.organizationName}</Text>
                  <Text style={styles.slipSubTitle}>Salary Statement for {slipData.payroll.month}</Text>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>Employee Name</Text>
                    <Text style={styles.slipValue}>{slipData.payroll.user?.fullName}</Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>Employee ID</Text>
                    <Text style={styles.slipValue}>EMP-{slipData.payroll.user?.id}</Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>Days Present</Text>
                    <Text style={styles.slipValue}>{slipData.payroll.daysPresent} / {slipData.payroll.totalDaysInMonth}</Text>
                  </View>

                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>EARNINGS</Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>Base Salary</Text>
                    <Text style={styles.slipValue}>₹{slipData.config?.baseSalary.toLocaleString()}</Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>Bonus / Allowances</Text>
                    <Text style={styles.slipValue}>₹{slipData.config?.bonus.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.slipRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Gross Earnings</Text>
                    <Text style={styles.totalValue}>₹{slipData.payroll.grossSalary.toLocaleString()}</Text>
                  </View>

                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>DEDUCTIONS</Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>Attendance Deductions</Text>
                    <Text style={[styles.slipValue, { color: '#ef4444' }]}>₹{slipData.payroll.deductions.toLocaleString()}</Text>
                  </View>
                  
                  <View style={styles.divider} />

                  <View style={styles.netSalaryContainer}>
                    <Text style={styles.netSalaryLabel}>NET PAYABLE</Text>
                    <Text style={styles.netSalaryValue}>₹{slipData.payroll.netSalary.toLocaleString()}</Text>
                  </View>

                  <TouchableOpacity style={styles.downloadBtn}>
                    <Icon name="file-download" size={20} color="#fff" />
                    <Text style={styles.downloadText}>Download PDF</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Attendance Modal */}
      <Modal visible={showAttendanceModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendance Details</Text>
              <TouchableOpacity onPress={() => setShowAttendanceModal(false)}>
                <Icon name="close" size={24} color="#1a1c1c" />
              </TouchableOpacity>
            </View>

            {attLoading ? (
              <ActivityIndicator size="large" color="#b8001d" style={{ marginVertical: 40 }} />
            ) : (
              <FlatList
                data={attendanceList}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.attRow}>
                    <View style={styles.attDateBox}>
                      <Text style={styles.attDate}>{new Date(item.punchInTime).getDate()}</Text>
                      <Text style={styles.attMonth}>{new Date(item.punchInTime).toLocaleString('default', { month: 'short' })}</Text>
                    </View>
                    <View style={styles.attTimeBox}>
                      <Text style={styles.attTimeLabel}>Punch In: <Text style={styles.attTimeValue}>{new Date(item.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></Text>
                      <Text style={styles.attTimeLabel}>Punch Out: <Text style={styles.attTimeValue}>{item.punchOutTime ? new Date(item.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text></Text>
                    </View>
                    <View style={[styles.statusTag, item.punchOutTime ? styles.bgGreenLight : styles.bgAmberLight]}>
                      <Text style={[styles.statusTagText, item.punchOutTime ? styles.textGreen : styles.textAmber]}>
                        {item.punchOutTime ? 'PRESENT' : 'ACTIVE'}
                      </Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No attendance records for this user.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    height: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 2,
  },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1c1c' },
  headerSubtitle: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  backBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  monthSelector: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  monthArrow: { padding: 8 },
  monthLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthLabelText: { fontSize: 14, fontWeight: '800', color: '#1a1c1c', marginLeft: 6 },
  listContent: { padding: 16 },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  recordMonth: { fontSize: 16, fontWeight: '700', color: '#1a1c1c' },
  recordStatus: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginTop: 2 },
  recordNetSalary: { fontSize: 20, fontWeight: '800', color: '#b8001d' },
  recordDetails: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 10, color: '#64748b', marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#1a1c1c' },
  btnRow: { flexDirection: 'row', marginTop: 16 },
  viewSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#b8001d',
    borderRadius: 8,
  },
  viewSlipText: { color: '#b8001d', fontSize: 13, fontWeight: '700' },
  viewAttBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  viewAttText: { color: '#4b5563', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 14, color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1c1c' },
  slipContainer: { padding: 4 },
  orgName: { fontSize: 22, fontWeight: '900', color: '#b8001d', textAlign: 'center', marginBottom: 4 },
  slipSubTitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },
  slipRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  slipLabel: { fontSize: 14, color: '#64748b' },
  slipValue: { fontSize: 14, fontWeight: '600', color: '#1a1c1c' },
  sectionHeader: { backgroundColor: '#f8fafc', padding: 8, marginVertical: 12, borderRadius: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  totalRow: { marginTop: 8 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1a1c1c' },
  totalValue: { fontSize: 15, fontWeight: '700', color: '#1a1c1c' },
  netSalaryContainer: { 
    backgroundColor: '#fff5f5', 
    padding: 20, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#feb2b2',
    marginVertical: 10
  },
  netSalaryLabel: { fontSize: 14, fontWeight: '800', color: '#c53030', marginBottom: 4 },
  netSalaryValue: { fontSize: 32, fontWeight: '900', color: '#b8001d' },
  downloadBtn: {
    backgroundColor: '#1a1c1c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40
  },
  downloadText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  attRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  attDateBox: { width: 50, alignItems: 'center' },
  attDate: { fontSize: 18, fontWeight: '800', color: '#1a1c1c' },
  attMonth: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  attTimeBox: { flex: 1, paddingLeft: 12 },
  attTimeLabel: { fontSize: 11, color: '#64748b' },
  attTimeValue: { fontWeight: '700', color: '#1a1c1c' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTagText: { fontSize: 10, fontWeight: '700' },
  bgGreenLight: { backgroundColor: '#dcfce7' },
  bgAmberLight: { backgroundColor: '#fef3c7' },
  textGreen: { color: '#16a34a' },
  textAmber: { color: '#d97706' },
});

export default SalaryScreen;
