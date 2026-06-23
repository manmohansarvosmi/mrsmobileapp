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
  Dimensions,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { getAllEmployees, getEmployeeMonthlyAttendance } from '../../service/adminService';
import { User } from '../../service/userService';
import { Typography, Colors, CommonStyles } from '../../utils/theme';

const { width } = Dimensions.get('window');

const AdminAttendanceScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [selectedDayData, setSelectedDayData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchEmployees = async () => {
    try {
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Fetch Employees Error:', error);
    }
  };

  const fetchAttendance = useCallback(async (empId: number, date: Date) => {
    try {
      setLoading(true);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const data = await getEmployeeMonthlyAttendance(empId, monthStr);

      // Generate full month grid
      const year = date.getFullYear();
      const month = date.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const allDays = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const found = data?.find((d: any) => d.day === i);
        allDays.push(found || { day: i, status: 'none', hours: '--' });
      }
      setCalendarData(allDays);

      // Default select today or first day
      const today = new Date();
      if (month === today.getMonth() && year === today.getFullYear()) {
        setSelectedDayData(allDays.find(d => d.day === today.getDate()) || allDays[0]);
      } else {
        setSelectedDayData(allDays[0]);
      }
    } catch (error) {
      console.error('Fetch Attendance Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const onRefresh = () => {
    if (selectedEmployee) {
      setRefreshing(true);
      fetchAttendance(selectedEmployee.id, currentDate);
    }
  };

  const handleEmployeeSelect = (emp: User) => {
    setSelectedEmployee(emp);
    setShowDropdown(false);
    fetchAttendance(emp.id, currentDate);
  };

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(nextDate);
    if (selectedEmployee) fetchAttendance(selectedEmployee.id, nextDate);
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr || timeStr === '--:--') return '--:--';
    return timeStr;
  };

  const summary = {
    present: calendarData.filter(d => d.status === 'present' || d.status === 'late').length,
    absent: calendarData.filter(d => d.status === 'absent').length,
    late: calendarData.filter(d => d.status === 'late').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#e11d2e" />

      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back-ios" size={18} color={Colors.text.main} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Attendance</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.statsBtn}>
          <Icon name="insert-chart-outlined" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Employee Selector */}
        <View style={styles.selectorCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.dropdown}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <View style={styles.selectedRow}>
              <View style={styles.miniAvatar}>
                <Text style={styles.avatarText}>{selectedEmployee?.fullName ? selectedEmployee.fullName[0] : '?'}</Text>
              </View>
              <View>
                <Text style={styles.inputLabelCompact}>STAFF MEMBER</Text>
                <Text style={styles.selectedText}>{selectedEmployee ? selectedEmployee.fullName : 'Choose an employee...'}</Text>
              </View>
            </View>
            <Icon name={showDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={22} color={Colors.text.light} />
          </TouchableOpacity>

          {showDropdown && (
            <View style={styles.dropList}>
              {employees.map(emp => (
                <TouchableOpacity activeOpacity={0.7} key={emp.id} style={styles.dropItem} onPress={() => handleEmployeeSelect(emp)}>
                  <Text style={styles.dropName}>{emp.fullName}</Text>
                  <Text style={styles.dropUser}>@{emp.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {!selectedEmployee ? (
          <View style={styles.emptyWrap}>
            <Icon name="event-note" size={80} color="#f1f5f9" />
            <Text style={styles.emptyText}>Select a staff member to view their attendance history.</Text>
          </View>
        ) : (
          <>
            {/* Quick Stats Combined */}
            <View style={styles.statsCard}>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: Colors.success }]}>{summary.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: Colors.warning }]}>{summary.late}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: Colors.danger }]}>{summary.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>

            {/* Calendar UI */}
            <View style={styles.calendarCard}>
              <View style={styles.calHeader}>
                <Text style={styles.monthLabel}>
                  {currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()} {currentDate.getFullYear()}
                </Text>
                <View style={styles.calNav}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => changeMonth(-1)} style={styles.navCirc}><Icon name="chevron-left" size={20} color={Colors.text.main} /></TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => changeMonth(1)} style={styles.navCirc}><Icon name="chevron-right" size={20} color={Colors.text.main} /></TouchableOpacity>
                </View>
              </View>

              <View style={styles.weekRow}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <Text key={d} style={styles.weekTxt}>{d}</Text>)}
              </View>

              <View style={styles.daysGrid}>
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                  <View key={`e-${i}`} style={styles.dayBoxEmpty} />
                ))}

                {loading ? (
                  <View style={{ width: '100%', height: 150, justifyContent: 'center' }}><ActivityIndicator color={Colors.primary} /></View>
                ) : calendarData.map((d, i) => {
                  const isSelected = selectedDayData?.day === d.day;
                  const isSunday = new Date(currentDate.getFullYear(), currentDate.getMonth(), d.day).getDay() === 0;
                  let bgColor = isSunday && d.status === 'none' ? '#f1f5f9' : 'transparent';
                  let txtColor = isSunday && d.status === 'none' ? '#64748b' : Colors.text.main;
                  let borderCol = 'transparent';

                  if (isSelected) {
                    bgColor = d.status === 'present' ? Colors.success : d.status === 'late' ? Colors.warning : Colors.primary;
                    txtColor = '#fff';
                    borderCol = bgColor;
                  } else {
                    if (d.status === 'present') {
                      bgColor = '#dcfce7';
                      txtColor = '#166534';
                    } else if (d.status === 'late') {
                      bgColor = '#fef3c7';
                      txtColor = '#92400e';
                    } else if (d.status === 'absent') {
                      bgColor = '#fee2e2';
                      txtColor = '#991b1b';
                    } else if (isSunday) {
                      bgColor = '#f1f5f9';
                      txtColor = '#a8a29e';
                    }
                  }

                  const punchIn = d.inTime && d.inTime !== '--:--' ? d.inTime : null;
                  const punchOut = d.outTime && d.outTime !== '--:--' ? d.outTime : null;

                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      style={[styles.dayBox, { backgroundColor: bgColor, borderColor: borderCol }]}
                      onPress={() => setSelectedDayData(d)}
                    >
                      <Text style={[styles.dayNum, { color: txtColor, marginBottom: punchIn ? 2 : 0 }]}>{d.day}</Text>
                      {punchIn && (
                        <Text style={[styles.miniTime, { color: isSelected ? '#fff' : txtColor }]} numberOfLines={1}>IN {punchIn}</Text>
                      )}
                      {punchOut && (
                        <Text style={[styles.miniTime, { color: isSelected ? '#fff' : txtColor }]} numberOfLines={1}>OUT {punchOut}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selected Day Details */}
            {selectedDayData && (
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailDate}>{selectedDayData.day} {currentDate.toLocaleString('default', { month: 'long' })}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: selectedDayData.status === 'present' ? '#f0fdf4' : selectedDayData.status === 'late' ? '#fffbeb' : '#fef2f2' }]}>
                    <Text style={[styles.statusBadgeText, { color: selectedDayData.status === 'present' ? Colors.success : selectedDayData.status === 'late' ? Colors.warning : Colors.danger }]}>
                      {selectedDayData.status?.toUpperCase() || 'NO DATA'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailBox}>
                    <View style={styles.detailIconWrap}>
                      <Icon name="login" size={18} color={selectedDayData.status === 'present' ? Colors.success : selectedDayData.status === 'late' ? Colors.warning : Colors.danger} />
                    </View>
                    <View style={styles.detailTextCol}>
                      <Text style={[styles.detailVal, { color: selectedDayData.status === 'present' ? Colors.success : selectedDayData.status === 'late' ? Colors.warning : Colors.danger }]}>{formatTime(selectedDayData.inTime)}</Text>
                      <Text style={styles.detailSub}>PUNCH IN</Text>
                    </View>
                  </View>
                  <View style={styles.detailBox}>
                    <View style={styles.detailIconWrap}>
                      <Icon name="logout" size={18} color={selectedDayData.status === 'present' ? Colors.success : selectedDayData.status === 'late' ? Colors.warning : Colors.danger} />
                    </View>
                    <View style={styles.detailTextCol}>
                      <Text style={[styles.detailVal, { color: selectedDayData.status === 'present' ? Colors.success : selectedDayData.status === 'late' ? Colors.warning : Colors.danger }]}>{formatTime(selectedDayData.outTime)}</Text>
                      <Text style={styles.detailSub}>PUNCH OUT</Text>
                    </View>
                  </View>
                  <View style={[styles.detailBox, { borderBottomWidth: 0 }]}>
                    <View style={styles.detailIconWrap}>
                      <Icon name="timer" size={18} color={Colors.text.muted} />
                    </View>
                    <View style={styles.detailTextCol}>
                      <Text style={styles.detailVal}>{selectedDayData.hours || '--'}</Text>
                      <Text style={styles.detailSub}>WORK HOURS</Text>
                    </View>
                  </View>
                  <View style={[styles.detailBox, { borderBottomWidth: 0 }]}>
                    <View style={styles.detailIconWrap}>
                      <Icon name="place" size={18} color={Colors.text.muted} />
                    </View>
                    <View style={styles.detailTextCol}>
                      <Text style={styles.detailVal}>{selectedDayData.inLocation || selectedDayData.location || 'N/A'}</Text>
                      <Text style={styles.detailSub}>PUNCH IN LOCATION</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: '700', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  statsBtn: { padding: 4 },
  scrollBody: { padding: 16, paddingBottom: 100 },
  selectorCard: { backgroundColor: Colors.surface, borderRadius: 8, padding: 12, marginBottom: 12, ...CommonStyles.shadow, zIndex: 100 },
  inputLabel: { fontSize: Typography.size.xs, fontWeight: '800', color: Colors.text.light, marginBottom: 8, letterSpacing: 0.5, fontFamily: Typography.fontFamily.regular },
  inputLabelCompact: { fontSize: 9, fontWeight: '800', color: Colors.text.light, marginBottom: 0, letterSpacing: 0.5, fontFamily: Typography.fontFamily.regular },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fcfcfc', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#eff6ff' },
  selectedRow: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff1f2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: Colors.primary, fontSize: Typography.size.sm, fontWeight: '800', fontFamily: Typography.fontFamily.regular },
  selectedText: { fontSize: Typography.size.md, fontWeight: '700', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  dropList: { marginTop: 5, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, elevation: 5 },
  dropItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropName: { fontSize: Typography.size.md, fontWeight: '600', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  dropUser: { fontSize: Typography.size.xs, color: Colors.text.light, fontFamily: Typography.fontFamily.regular },
  emptyWrap: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', fontSize: Typography.size.md, color: Colors.text.light, marginTop: 15, fontWeight: '600', fontFamily: Typography.fontFamily.regular },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 15,
    marginBottom: 15,
    ...CommonStyles.shadow,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: '#f1f5f9' },
  statNum: { fontSize: Typography.size.xl, fontWeight: '800', fontFamily: Typography.fontFamily.regular },
  statLabel: { fontSize: Typography.size.xs, fontWeight: '700', color: Colors.text.light, marginTop: 2, fontFamily: Typography.fontFamily.regular },
  calendarCard: { backgroundColor: Colors.surface, borderRadius: 8, padding: 15, marginBottom: 15, ...CommonStyles.shadow },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  monthLabel: { fontSize: Typography.size.lg, fontWeight: '700', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  calNav: { flexDirection: 'row', gap: 8 },
  navCirc: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 10 },
  weekTxt: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', color: Colors.text.light, fontFamily: Typography.fontFamily.regular },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayBox: {
    width: (width - 62) / 7 - 4,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    marginHorizontal: 2,
    borderRadius: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayBoxEmpty: { width: (width - 62) / 7 - 4, height: 58, marginHorizontal: 2 },
  dayNum: { fontSize: Typography.size.md, fontWeight: '700', fontFamily: Typography.fontFamily.regular },
  miniTime: { fontSize: 7, fontWeight: '700', letterSpacing: -0.2, marginTop: 1, fontFamily: Typography.fontFamily.regular },
  detailCard: { backgroundColor: Colors.surface, borderRadius: 8, padding: 15, ...CommonStyles.shadow },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailDate: { fontSize: Typography.size.lg, fontWeight: '700', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: Typography.size.xs, fontWeight: '800', fontFamily: Typography.fontFamily.regular },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailBox: { width: '50%', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  detailIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  detailTextCol: { marginLeft: 0 },
  detailVal: { fontSize: Typography.size.md, fontWeight: '700', color: Colors.text.main, fontFamily: Typography.fontFamily.regular },
  detailSub: { fontSize: Typography.size.xs, fontWeight: '700', color: Colors.text.light, fontFamily: Typography.fontFamily.regular },
});

export default AdminAttendanceScreen;

