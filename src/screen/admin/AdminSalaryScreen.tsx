import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Linking,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { getAllEmployees } from '../../service/adminService';
import { 
  getSalaryConfig, 
  saveSalaryConfig, 
  getPayrollRecords, 
  generatePayroll,
  getAllSalaryConfigs,
  updatePayrollStatus,
  SalaryConfig,
  PayrollRecord 
} from '../../service/salaryService';
import { User } from '../../service/userService';
import { Typography, Colors, CommonStyles } from '../../utils/theme';

const { width } = Dimensions.get('window');

const AdminSalaryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [employees, setEmployees] = useState<User[]>([]);
  const [allConfigs, setAllConfigs] = useState<SalaryConfig[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paidLoadingId, setPaidLoadingId] = useState<number | null>(null);
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }); // YYYY-MM
  const [viewMode, setViewMode] = useState<'CONFIG' | 'SUMMARY'>('SUMMARY');
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [operatingRecord, setOperatingRecord] = useState<PayrollRecord | null>(null);

  // Form states for configuration
  const [baseSalary, setBaseSalary] = useState('');
  const [bonus, setBonus] = useState('');
  const [workingDays, setWorkingDays] = useState('26');
  const [allowedLeaves, setAllowedLeaves] = useState('2');
  const [leavePenalty, setLeavePenalty] = useState('');
  const [lateCharge, setLateCharge] = useState('');

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [empData, payrollData, configData] = await Promise.all([
        getAllEmployees(),
        getPayrollRecords(currentMonth),
        getAllSalaryConfigs()
      ]);
      setEmployees(empData || []);
      setPayrollRecords(payrollData || []);
      setAllConfigs(configData || []);
    } catch (error) {
      console.error('Fetch Initial Data Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [currentMonth]);

  const fetchEmployeeSalaryData = useCallback(async (userId: number) => {
    try {
      setLoading(true);
      const config = await getSalaryConfig(userId);
      setSalaryConfig(config);
      
      if (config) {
        setBaseSalary(config.baseSalary?.toString() || '');
        setBonus(config.bonus?.toString() || config.incentive?.toString() || '');
        setWorkingDays(config.workingDaysPerMonth?.toString() || '26');
        setAllowedLeaves(config.allowedLeavesPerMonth?.toString() || '2');
        setLeavePenalty(config.extraLeavePenaltyPerDay?.toString() || '');
        setLateCharge(config.latePunchCharge?.toString() || '');
      } else {
        // Reset form for new config
        setBaseSalary('');
        setBonus('');
        setWorkingDays('26');
        setAllowedLeaves('2');
        setLeavePenalty('');
        setLateCharge('');
      }
    } catch (error) {
      console.error('Fetch Employee Salary Error:', error);
      setSalaryConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEmployeeSelect = (emp: User) => {
    setSelectedEmployee(emp);
    fetchEmployeeSalaryData(emp.id);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
    if (selectedEmployee) fetchEmployeeSalaryData(selectedEmployee.id);
  };

  const handleSaveConfig = async () => {
    if (!selectedEmployee) return;
    
    try {
      setSaving(true);
      const payload = {
        userId: selectedEmployee.id,
        baseSalary: parseFloat(baseSalary) || 0,
        bonus: parseFloat(bonus) || 0,
        incentive: parseFloat(bonus) || 0,
        workingDaysPerMonth: parseInt(workingDays) || 26,
        allowedLeavesPerMonth: parseInt(allowedLeaves) || 0,
        extraLeavePenaltyPerDay: parseFloat(leavePenalty) || 0,
        latePunchCharge: parseFloat(lateCharge) || 0,
        shiftStart: salaryConfig?.shiftStart || "09:30:00",
        shiftEnd: salaryConfig?.shiftEnd || "18:30:00",
      };
      
      await saveSalaryConfig(payload);
      Alert.alert('Success', 'Configuration saved for ' + selectedEmployee.fullName);
      setSelectedEmployee(null); // Return to list
      fetchInitialData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Check if any record in current month is already PAID → block re-generation
  const hasAnyPaid = payrollRecords.some(r => r.status?.toUpperCase() === 'PAID');

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '0';
    // If it's a whole number, don't show decimals
    if (val % 1 === 0) return val.toLocaleString();
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleShareWhatsApp = (record: PayrollRecord, wDays: number, absent: number) => {
    const empConfig = allConfigs.find(
      (c: any) => c.userId === record.user?.id || (c as any).user?.id === record.user?.id
    );
    const msg =
      `💼 *Salary Statement — ${currentMonth}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *${record.user?.fullName}*\n\n` +
      `📅 Working Days : ${wDays}\n` +
      `✅ Present          : ${record.daysPresent}\n` +
      `❌ Absent            : ${absent}\n\n` +
      `💰 Gross Salary  : ₹${formatCurrency(record.grossSalary)}\n` +
      `➖ Deductions     : ₹${formatCurrency(record.deductions)}\n` +
      (empConfig?.bonus ? `🎁 Bonus              : ₹${formatCurrency(empConfig.bonus)}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏆 *Net Payable : ₹${formatCurrency(record.netSalary)}*\n` +
      `Status : ${record.status}`;

    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('WhatsApp not found', 'Please install WhatsApp to use this feature.');
        }
      })
      .catch(() => Alert.alert('Error', 'Could not open WhatsApp.'));
  };

  const handleMarkPaid = (record: PayrollRecord) => {
    const isPaid = record.status?.toUpperCase() === 'PAID';
    if (isPaid) {
      Alert.alert(
        'Mark as Unpaid?',
        `Are you sure you want to revert ${record.user?.fullName}'s salary to unpaid?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Revert', 
            style: 'destructive',
            onPress: async () => {
              try {
                setPaidLoadingId(record.id);
                await updatePayrollStatus(record.id, 'GENERATED');
                setPayrollRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: 'GENERATED' } : r));
              } catch (e) { Alert.alert('Error', 'Failed to update'); }
              finally { setPaidLoadingId(null); }
            }
          }
        ]
      );
    } else {
      setOperatingRecord(record);
      setPayoutModalVisible(true);
    }
  };

  const confirmPayout = async () => {
    if (!operatingRecord) return;
    try {
      setPayoutModalVisible(false);
      setPaidLoadingId(operatingRecord.id);
      await updatePayrollStatus(operatingRecord.id, 'PAID');
      setPayrollRecords(prev =>
        prev.map(r => r.id === operatingRecord.id ? { ...r, status: 'PAID' } : r)
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment status');
    } finally {
      setPaidLoadingId(null);
    }
  };

  const handleGeneratePayroll = async () => {
    if (hasAnyPaid) {
      Alert.alert('Blocked', 'This month already has paid salaries. Cannot re-generate.');
      return;
    }
    Alert.alert(
      'Process Salaries',
      `Process payroll for all employees for ${currentMonth}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Process', 
          onPress: async () => {
            try {
              setLoading(true);
              await generatePayroll(currentMonth);
              Alert.alert('Success', 'Salaries generated successfully!');
              setViewMode('SUMMARY');
              fetchInitialData();
            } catch (error) {
              Alert.alert('Error', 'Failed to generate salaries');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const changeMonth = (offset: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    setCurrentMonth(`${y}-${m < 10 ? '0' + m : m}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#e11d2e" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>ADMIN FINANCE</Text>
          <Text style={styles.headerTitle}>Salary & Payroll</Text>
        </View>
        {viewMode === 'SUMMARY' && (
          <TouchableOpacity
            style={[styles.headerBtn, hasAnyPaid && styles.headerBtnDisabled]}
            onPress={handleGeneratePayroll}
          >
            <Icon name={hasAnyPaid ? 'lock' : 'bolt'} size={18} color="#fff" />
            <Text style={styles.headerBtnText}>{hasAnyPaid ? 'Locked' : 'Generate All'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'SUMMARY' && styles.activeTab]} 
          onPress={() => setViewMode('SUMMARY')}
        >
          <Text style={[styles.tabLabel, viewMode === 'SUMMARY' && styles.activeTabLabel]}>Payroll Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'CONFIG' && styles.activeTab]} 
          onPress={() => {
            setViewMode('CONFIG');
            setSelectedEmployee(null);
          }}
        >
          <Text style={[styles.tabLabel, viewMode === 'CONFIG' && styles.activeTabLabel]}>Staff Configuration</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          {/* Month Selector */}
          <View style={styles.monthBox}>
            <TouchableOpacity onPress={() => changeMonth(-1)}><Icon name="chevron-left" size={26} color={Colors.text.main} /></TouchableOpacity>
            <View style={styles.monthLabelBox}>
              <Icon name="calendar-today" size={18} color={Colors.primary} />
              <Text style={styles.monthLabelText}>
                {(() => {
                  const [y, m] = currentMonth.split('-').map(Number);
                  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
                })()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => changeMonth(1)}><Icon name="chevron-right" size={26} color={Colors.text.main} /></TouchableOpacity>
          </View>

          {viewMode === 'CONFIG' ? (
            <View style={styles.configView}>
              {!selectedEmployee ? (
                <View style={styles.staffListContainer}>
                  <Text style={styles.viewTitle}>Manage Employee Salary Structures</Text>
                  {employees.map((emp) => {
                    const config = allConfigs.find(c => c.id === emp.id || (c as any).user?.id === emp.id);
                    return (
                      <TouchableOpacity 
                        key={emp.id} 
                        style={[styles.staffSelectionCard, CommonStyles.shadow]}
                        onPress={() => handleEmployeeSelect(emp)}
                      >
                        <View style={styles.staffHeaderRow}>
                          <View style={styles.staffProfileMain}>
                            <View style={styles.staffAvatarBox}>
                              <Text style={styles.staffAvatarInitial}>{emp.fullName[0]}</Text>
                            </View>
                            <View>
                              <Text style={styles.staffFullName}>{emp.fullName}</Text>
                              <Text style={styles.staffUserName}>@{emp.username}</Text>
                            </View>
                          </View>
                          <View style={styles.configIndicators}>
                            {config ? (
                              <View style={styles.tagActive}>
                                <Text style={styles.tagActiveText}>CONFIGURED</Text>
                              </View>
                            ) : (
                              <View style={styles.tagPending}>
                                <Text style={styles.tagPendingText}>PENDING</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.staffCardDivider} />
                        <View style={styles.staffDetailsRow}>
                          <View>
                            <Text style={styles.detailLabel}>MONTHLY BASE</Text>
                            <Text style={styles.detailValue}>{config ? `₹${formatCurrency(config.baseSalary)}` : '--'}</Text>
                          </View>
                          <TouchableOpacity style={styles.editCardBtn} onPress={() => handleEmployeeSelect(emp)}>
                            <Text style={styles.editBtnText}>{config ? 'Edit Plan' : 'Setup Plan'}</Text>
                            <Icon name="arrow-forward" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={[styles.formContainer, CommonStyles.shadow]}>
                  <View style={styles.formHeader}>
                    <TouchableOpacity onPress={() => setSelectedEmployee(null)} style={styles.backLink}>
                      <Icon name="arrow-back" size={20} color={Colors.primary} />
                      <Text style={styles.backLinkText}>Back to List</Text>
                    </TouchableOpacity>
                    <Text style={styles.editTitle}>Editing: {selectedEmployee.fullName}</Text>
                  </View>

                  <View style={styles.formInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>BASE SALARY (₹)</Text>
                      <TextInput style={styles.field} value={baseSalary} onChangeText={setBaseSalary} keyboardType="numeric" placeholder="0" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>BONUS / FLAT (₹)</Text>
                      <TextInput style={styles.field} value={bonus} onChangeText={setBonus} keyboardType="numeric" placeholder="0" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>WORKING DAYS</Text>
                      <TextInput style={styles.field} value={workingDays} onChangeText={setWorkingDays} keyboardType="numeric" placeholder="26" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>ALLOWED LEAVES</Text>
                      <TextInput style={styles.field} value={allowedLeaves} onChangeText={setAllowedLeaves} keyboardType="numeric" placeholder="2" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>LEAVE PENALTY (₹)</Text>
                      <TextInput style={styles.field} value={leavePenalty} onChangeText={setLeavePenalty} keyboardType="numeric" placeholder="0" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>LATE CHARGE (₹)</Text>
                      <TextInput style={styles.field} value={lateCharge} onChangeText={setLateCharge} keyboardType="numeric" placeholder="0" />
                    </View>
                  </View>

                  <TouchableOpacity style={styles.saveAction} onPress={handleSaveConfig} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveActionText}>Update Salary Plan</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.summaryView}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitleText}>MONTHLY PAYROLL SUMMARY</Text>
                <Text style={styles.recordCount}>{payrollRecords.length} Employees</Text>
              </View>

              {payrollRecords.length > 0 ? (
                payrollRecords.map((record) => {
                  // Match salary config for this employee to get configured working days
                  const empConfig = allConfigs.find(
                    (c: any) => c.userId === record.user?.id || (c as any).user?.id === record.user?.id
                  );
                  const workingDays = empConfig?.workingDaysPerMonth ?? record.totalDaysInMonth;
                  const absentDays = Math.max(0, workingDays - record.daysPresent);

                  return (
                  <View key={record.id} style={[styles.payCard, CommonStyles.shadow]}>
                    <View style={styles.payCardHeader}>
                      <View style={styles.payProfile}>
                        <View style={styles.payAvatar}>
                          <Text style={styles.payAvatarText}>{record.user?.fullName?.[0]}</Text>
                        </View>
                        <View style={styles.payMeta}>
                          <Text style={styles.payNameText}>{record.user?.fullName}</Text>
                          <View style={[styles.statusTag, record.status?.toUpperCase() === 'PAID' ? styles.statusPaid : styles.statusPending]}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusTabText}>{record.status?.toUpperCase()}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.payValue}>
                        <Text style={styles.payAmountLabel}>NET SALARY</Text>
                        <Text style={styles.payAmountValue}>₹{formatCurrency(record.netSalary)}</Text>
                      </View>
                    </View>

                    <View style={styles.statsDashboard}>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>WORKING</Text>
                        <Text style={styles.statValue}>{workingDays} <Text style={styles.statUnit}>d</Text></Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>PRESENT</Text>
                        <Text style={[styles.statValue, { color: Colors.success }]}>{record.daysPresent} <Text style={styles.statUnit}>d</Text></Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>ABSENT</Text>
                        <Text style={[styles.statValue, { color: Colors.danger }]}>{absentDays} <Text style={styles.statUnit}>d</Text></Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>DEDUCTIONS</Text>
                        <Text style={[styles.statValue, { color: Colors.danger }]}>₹{formatCurrency(record.deductions)}</Text>
                      </View>
                    </View>

                    <View style={styles.payActionsFooter}>
                      <Text style={styles.updatedAt}>Updated {new Date(record.generatedAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}</Text>
                      <View style={styles.footerActionGroup}>
                        {/* Share Button */}
                        <TouchableOpacity 
                          style={styles.actionIconButton} 
                          onPress={() => handleShareWhatsApp(record, workingDays, absentDays)}
                        >
                          <Icon name="share" size={16} color="#4b5563" />
                        </TouchableOpacity>

                        {/* Paid Toggle Chip */}
                        <TouchableOpacity
                          style={[
                            styles.paidPill,
                            record.status?.toUpperCase() === 'PAID' ? styles.paidPillActive : styles.paidPillInactive,
                          ]}
                          onPress={() => handleMarkPaid(record)}
                          disabled={paidLoadingId === record.id}
                        >
                          {paidLoadingId === record.id ? (
                            <ActivityIndicator size="small" color={record.status?.toUpperCase() === 'PAID' ? '#fff' : Colors.primary} />
                          ) : (
                            <>
                              <Icon
                                name={record.status?.toUpperCase() === 'PAID' ? 'verified' : 'pending-actions'}
                                size={14}
                                color={record.status?.toUpperCase() === 'PAID' ? '#fff' : Colors.primary}
                              />
                              <Text style={[styles.paidPillText, record.status?.toUpperCase() === 'PAID' && styles.paidPillTextActive]}>
                                {record.status?.toUpperCase() === 'PAID' ? 'PAID' : 'MARK PAID'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  );
                })
              ) : (
                <View style={styles.emptyResults}>
                  <Icon name="history-toggle-off" size={60} color="#e2e8f0" />
                  <Text style={styles.emptyResultsText}>Payroll has not been generated for this month. Use "Generate All" to process staff salaries.</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Payout Confirmation Modal */}
      <Modal
        visible={payoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPayoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.payoutModal}>
            <View style={styles.modalHeader}>
              <Icon name="verified" size={24} color={Colors.success} />
              <Text style={styles.modalTitle}>Confirm Payout</Text>
            </View>
            
            {operatingRecord && (() => {
              const config = allConfigs.find(c => (c as any).user?.id === operatingRecord.user?.id || c.userId === operatingRecord.user?.id);
              const wDays = config?.workingDaysPerMonth ?? operatingRecord.totalDaysInMonth;
              
              return (
                <View style={styles.breakdownContainer}>
                  <Text style={styles.staffHeaderName}>{operatingRecord.user?.fullName}</Text>
                  
                  <View style={styles.calcRow}>
                    <View style={styles.calcLeft}>
                      <Icon name="payments" size={16} color="#64748b" />
                      <Text style={styles.calcLabel}>Base Salary</Text>
                    </View>
                    <Text style={styles.calcValue}>₹{formatCurrency(operatingRecord.grossSalary)}</Text>
                  </View>

                  <View style={styles.calcRow}>
                    <View style={styles.calcLeft}>
                      <Icon name="event-available" size={16} color="#64748b" />
                      <Text style={styles.calcLabel}>Attendance</Text>
                    </View>
                    <Text style={styles.calcValue}>{operatingRecord.daysPresent}/{wDays} Days</Text>
                  </View>

                  <View style={styles.calcRow}>
                    <View style={styles.calcLeft}>
                      <Icon name="money-off" size={16} color={Colors.danger} />
                      <Text style={styles.calcLabel}>Penalty/Day</Text>
                    </View>
                    <Text style={[styles.calcValue, { color: Colors.danger }]}>₹{formatCurrency(config?.extraLeavePenaltyPerDay)}</Text>
                  </View>

                  {config?.bonus ? (
                    <View style={styles.calcRow}>
                      <View style={styles.calcLeft}>
                        <Icon name="card-giftcard" size={16} color="#16a34a" />
                        <Text style={styles.calcLabel}>Monthly Bonus</Text>
                      </View>
                      <Text style={[styles.calcValue, { color: '#16a34a' }]}>+ ₹{formatCurrency(config.bonus)}</Text>
                    </View>
                  ) : null}

                  <View style={styles.calcRow}>
                    <View style={styles.calcLeft}>
                      <Icon name="remove-circle-outline" size={16} color={Colors.danger} />
                      <Text style={styles.calcLabel}>Total Cuts</Text>
                    </View>
                    <Text style={[styles.calcValue, { color: Colors.danger }]}>- ₹{formatCurrency(operatingRecord.deductions)}</Text>
                  </View>

                  <View style={styles.modalDivider} />
                  
                  <View style={styles.netRow}>
                    <Text style={styles.netLabel}>Net Payable</Text>
                    <Text style={styles.netValue}>₹{formatCurrency(operatingRecord.netSalary)}</Text>
                  </View>
                </View>
              );
            })()}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPayoutModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmPayout}>
                <Text style={styles.confirmBtnText}>Confirm & Pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerSubtitle: { fontSize: 8, fontWeight: '900', color: Colors.primary, letterSpacing: 1, marginBottom: 0 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.main },
  headerBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  headerBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, marginLeft: 6 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: Colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.light },
  activeTabLabel: { color: Colors.primary, fontWeight: '800' },
  scrollContent: { paddingBottom: 100 },
  monthBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 10, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  monthLabelBox: { flexDirection: 'row', alignItems: 'center' },
  monthLabelText: { fontSize: 14, fontWeight: '800', color: Colors.text.main, marginLeft: 8 },
  configView: { paddingHorizontal: 16 },
  viewTitle: { fontSize: 10, fontWeight: '900', color: Colors.text.light, marginBottom: 10, marginLeft: 4, letterSpacing: 1, textTransform: 'uppercase' },
  staffListContainer: { paddingBottom: 20 },
  staffSelectionCard: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  staffHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  staffProfileMain: { flexDirection: 'row', alignItems: 'center' },
  staffAvatarBox: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#e0f2fe' },
  staffAvatarInitial: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  staffFullName: { fontSize: 16, fontWeight: '800', color: Colors.text.main },
  staffUserName: { fontSize: 11, color: Colors.text.light, fontWeight: '600' },
  
  configIndicators: { alignItems: 'flex-end' },
  tagActive: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagActiveText: { fontSize: 8, fontWeight: '900', color: '#16a34a', letterSpacing: 0.5 },
  tagPending: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagPendingText: { fontSize: 8, fontWeight: '900', color: '#dc2626', letterSpacing: 0.5 },
  
  staffCardDivider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },
  staffDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  detailLabel: { fontSize: 8, fontWeight: '900', color: Colors.text.light, letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '900', color: Colors.text.main },
  
  editCardBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  editBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  formContainer: { backgroundColor: '#fff', borderRadius: 8, padding: 20 },
  formHeader: { marginBottom: 20 },
  backLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backLinkText: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginLeft: 4 },
  editTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.main },
  formInputs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  inputGroup: { width: '48%', marginBottom: 16 },
  label: { fontSize: 9, fontWeight: '800', color: Colors.text.light, marginBottom: 6, letterSpacing: 0.5 },
  field: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, fontWeight: '700', color: Colors.text.main },
  saveAction: { backgroundColor: '#1a1c1c', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveActionText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  summaryView: { paddingHorizontal: 16 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  summaryTitleText: { fontSize: 10, fontWeight: '900', color: Colors.text.light, letterSpacing: 1 },
  recordCount: { fontSize: 11, fontWeight: '800', color: Colors.primary, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  
  // New PayCard Design
  payCard: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  payCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  payProfile: { flexDirection: 'row', alignItems: 'center' },
  payAvatar: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  payAvatarText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  payMeta: { gap: 2 },
  payNameText: { fontSize: 15, fontWeight: '800', color: Colors.text.main },
  
  statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  statusPaid: { backgroundColor: '#f0fdf4' },
  statusPending: { backgroundColor: '#fff7ed' },
  statusDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#16a34a', marginRight: 6 },
  statusTabText: { fontSize: 9, fontWeight: '800', color: '#16a34a', letterSpacing: 0.5 },
  
  payValue: { alignItems: 'flex-end' },
  payAmountLabel: { fontSize: 8, fontWeight: '900', color: Colors.text.light, letterSpacing: 0.5, marginBottom: 2 },
  payAmountValue: { fontSize: 20, fontWeight: '900', color: Colors.success },
  
  statsDashboard: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 16, justifyContent: 'space-between' },
  statCol: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 8, fontWeight: '800', color: Colors.text.light, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '800', color: Colors.text.main },
  statUnit: { fontSize: 9, fontWeight: '600', color: Colors.text.light },
  
  payActionsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  updatedAt: { fontSize: 9, color: Colors.text.light, fontWeight: '600' },
  footerActionGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  
  actionIconButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  
  paidPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  paidPillActive: { backgroundColor: Colors.success },
  paidPillInactive: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  paidPillText: { fontSize: 11, fontWeight: '800', color: Colors.text.main },
  paidPillTextActive: { color: '#fff' },

  emptyResults: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyResultsText: { textAlign: 'center', fontSize: 13, color: Colors.text.light, marginTop: 15, lineHeight: 20 },
  headerBtnDisabled: { backgroundColor: '#94a3b8' },

  // Payout Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  payoutModal: { backgroundColor: '#fff', borderRadius: 8, width: '100%', padding: 20, ...CommonStyles.shadow },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.main },
  breakdownContainer: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 15 },
  staffHeaderName: { fontSize: 14, fontWeight: '800', color: Colors.primary, marginBottom: 12 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calcLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calcLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  calcValue: { fontSize: 13, fontWeight: '800', color: Colors.text.main },
  modalDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netLabel: { fontSize: 14, fontWeight: '800', color: Colors.text.main },
  netValue: { fontSize: 20, fontWeight: '900', color: Colors.success },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Colors.text.light },
  confirmBtn: { flex: 2, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: Colors.primary },
  confirmBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

export default AdminSalaryScreen;
