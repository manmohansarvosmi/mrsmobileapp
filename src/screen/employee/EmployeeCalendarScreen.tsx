import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendarData, getAttendanceSummary } from '../../service/api';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
const formatTime = (isoString: string | null | undefined): string => {
  if (!isoString) return '--:--';
  try {
    // Force IST (Indian Standard Time) conversion
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).toUpperCase();
  } catch (e) {
    return isoString; // Fallback to raw if not ISO
  }
};

const EmployeeCalendarScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedDayData, setSelectedDayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    try {
      setError(null);
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        setError('User session not found. Please login again.');
        return;
      }

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      const [calRes, sumRes] = await Promise.all([
        getCalendarData(Number(userId), monthStr).catch(() => ({ data: { code: 0 } })),
        getAttendanceSummary(Number(userId), monthStr).catch(() => ({ data: { code: 0 } }))
      ]);

      // Generate all days of the month (1 to 28/30/31)
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const allDays = [];
      for (let i = 1; i <= daysInMonth; i++) {
        allDays.push({
          day: i,
          status: 'none',
          hours: '--',
        });
      }

      let finalData = allDays;
      if (calRes.data && calRes.data.code === 1 && Array.isArray(calRes.data.data)) {
        const apiData = calRes.data.data;
        finalData = allDays.map(d => {
          const found = apiData.find((a: any) => a.day === d.day);
          return found ? { ...d, ...found } : d;
        });
      }

      setCalendarData(finalData);

      const today = new Date();
      if (month === today.getMonth() && year === today.getFullYear()) {
        const todayData = finalData.find((d: any) => d.day === today.getDate());
        setSelectedDayData(todayData || finalData[0]);
      } else {
        setSelectedDayData(finalData[0]);
      }

      if (sumRes.data && sumRes.data.code === 1) {
        setSummary(sumRes.data.data);
      }
    } catch (error: any) {
      console.error('[Calendar] Fetch Error:', error);
      const msg = error?.response?.data?.message || error?.message || 'Network error. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(nextDate);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // Helper to get dot color from status
  const getDotColor = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'present': return 'green';
      case 'late': return 'amber';
      case 'remote': return 'amber';
      case 'leave': return 'red';
      case 'absent': return 'red';
      default: return null;
    }
  };

  // Loading screen
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#e11d2e" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#b8001d" />
          <Text style={styles.loadingText}>Loading Attendance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error screen (only if no data loaded at all)
  if (error && calendarData.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#e11d2e" />
        <View style={styles.centered}>
          <Icon name="cloud-off" size={64} color="#e2e8f0" />
          <Text style={styles.errorTitle}>Could Not Load Attendance</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAttendance()}>
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#e11d2e" />

      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#5f5e5e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CALENDAR</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#b8001d']} />}
      >

        {/* Calendar Section */}
        <View style={styles.calendarCard}>
          <View style={styles.calHeader}>
            <View>
              <View style={styles.monthTitleRow}>
                <Text style={styles.monthTitle}>{monthName} {year}</Text>
                {selectedDayData && (
                  <View style={styles.presentBadge}>
                    <Text style={styles.presentBadgeText}>{selectedDayData.status}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.attendanceSubtitle}>Employee Attendance</Text>
            </View>
            <View style={styles.calArrows}>
              <TouchableOpacity style={styles.calArrowBtn} onPress={() => changeMonth(-1)}>
                <Icon name="chevron-left" size={20} color="#5f5e5e" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.calArrowBtn} onPress={() => changeMonth(1)}>
                <Icon name="chevron-right" size={20} color="#5f5e5e" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.daysGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <View key={`header-${i}`} style={styles.dayHeaderBox}>
                <Text style={styles.dayHeaderText}>{d}</Text>
              </View>
            ))}

            {/* Empty boxes for start of month */}
            {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
              <View key={`empty-start-${i}`} style={[styles.dayBox, styles.dayBoxInactive]} />
            ))}

            {calendarData.map((d, i) => {
              const isSelected = selectedDayData?.day === d.day;
              const dotColor = getDotColor(d.status);

              return (
                <TouchableOpacity
                  key={`day-${i}`}
                  style={[
                    styles.dayBox,
                    isSelected && styles.dayBoxSelected,
                    d.status?.toLowerCase() === 'absent' && !isSelected && styles.dayBoxAbsent
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedDayData(d)}
                >
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    d.status?.toLowerCase() === 'absent' && !isSelected && styles.dayTextAbsent
                  ]}>
                    {d.day}
                  </Text>
                  {dotColor && (
                    <View style={[
                      styles.dot,
                      dotColor === 'green' && styles.dotGreen,
                      dotColor === 'amber' && styles.dotAmber,
                      dotColor === 'red' && styles.dotRed,
                      isSelected && styles.dotWhite,
                    ]} />
                  )}
                  {d.status?.toLowerCase() === 'absent' && !isSelected && (
                    <Text style={styles.absentSmallTxt}>ABSENT</Text>
                  )}
                  {isSelected && <View style={styles.selectedTopDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Detail Card */}
        {selectedDayData && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeaderRow}>
              <View>
                <Text style={styles.schedInfoLabel}>Schedule Info</Text>
                <Text style={styles.schedDate}>{monthName} {selectedDayData.day}, {year}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                selectedDayData.status === 'present'                                         && { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
                selectedDayData.status === 'late'                                            && { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
                (selectedDayData.status === 'absent' || selectedDayData.status === 'leave') && { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
                (selectedDayData.status === 'weekend' || selectedDayData.status === 'pending' || selectedDayData.status === 'none') && { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
              ]}>
                <View style={[
                  styles.statusBadgeDot,
                  selectedDayData.status === 'present'                                         && { backgroundColor: '#10b981' },
                  selectedDayData.status === 'late'                                            && { backgroundColor: '#f59e0b' },
                  (selectedDayData.status === 'absent' || selectedDayData.status === 'leave') && { backgroundColor: '#ef4444' },
                  (selectedDayData.status === 'weekend' || selectedDayData.status === 'pending' || selectedDayData.status === 'none') && { backgroundColor: '#94a3b8' },
                ]} />
                <Text style={[
                  styles.statusBadgeText,
                  selectedDayData.status === 'present'                                         && { color: '#047857' },
                  selectedDayData.status === 'late'                                            && { color: '#b45309' },
                  (selectedDayData.status === 'absent' || selectedDayData.status === 'leave') && { color: '#b91c1c' },
                  (selectedDayData.status === 'weekend' || selectedDayData.status === 'pending' || selectedDayData.status === 'none') && { color: '#64748b' },
                ]}>{selectedDayData.status?.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Icon name="login" size={20} color="#059669" />
                </View>
                <View>
                  <Text style={[styles.infoVal, { color: selectedDayData.status === 'late' ? '#d97706' : '#059669' }]}>{selectedDayData.inTime || '--:--'}</Text>
                  <Text style={styles.infoSub}>Check In Time</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Icon name="logout" size={20} color="#dc2626" />
                </View>
                <View>
                  <Text style={[styles.infoVal, { color: selectedDayData.status === 'late' ? '#d97706' : '#059669' }]}>{selectedDayData.outTime || '--:--'}</Text>
                  <Text style={styles.infoSub}>Check Out Time</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Icon name="timelapse" size={20} color="#2563eb" />
                </View>
                <View>
                  <Text style={[styles.infoVal, styles.infoValBlue]}>{selectedDayData.hours || '--'}</Text>
                  <Text style={styles.infoSub}>Working Hours</Text>
                </View>
              </View>
            </View>

          </View>
        )}


        {/* Legend Card */}
        <View style={styles.legendCard}>
          <View style={styles.legendTitleRow}>
            <View style={styles.legendTitleBar} />
            <Text style={styles.legendTitle}>Status Indicator</Text>
          </View>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotGreen]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotAmber]} />
              <Text style={styles.legendText}>Remote</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotRed]} />
              <Text style={styles.legendText}>Leave / Absent</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => navigation.navigate('Dashboard')}>
          <Icon name="dashboard" size={24} color="#94a3b8" />
          <Text style={styles.navLabel}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => navigation.navigate('Calendar')}>
          <View style={styles.navActiveIndicator} />
          <Icon name="calendar-month" size={24} color="#e11d2e" />
          <Text style={[styles.navLabel, styles.navActiveLabel]}>CALENDAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => navigation.navigate('Profile')}>
          <Icon name="person" size={24} color="#94a3b8" />
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    height: 64,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
    elevation: 2,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBtn: {
    padding: 8,
    marginRight: 4,
  },
  iconText: {
    fontSize: 20,
    color: '#5f5e5e',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#b8001d',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5f5e5e',
    marginRight: 12,
    display: 'flex',
  },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1c1c',
    marginRight: 8,
  },
  presentBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  presentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5f5e5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  attendanceSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5f5e5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  calArrows: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  calArrowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  calArrowIcon: {
    fontSize: 14,
    color: '#5f5e5e',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f3f4f6',
  },
  dayHeaderBox: {
    width: '14.28%',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dayHeaderText: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  dayBox: {
    width: '14.28%',
    height: 64,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  dayBoxInactive: {
    backgroundColor: '#f9fafb',
  },
  dayBoxSelected: {
    backgroundColor: '#b8001d',
    borderColor: '#b8001d',
  },
  dayText: {
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1c',
  },
  dayTextInactive: {
    color: '#d1d5db',
  },
  dayTextSelected: {
    color: '#ffffff',
  },
  dot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: { backgroundColor: '#10b981' },
  dotAmber: { backgroundColor: '#f59e0b' },
  dotRed: { backgroundColor: '#dc2626' },
  dotWhite: { backgroundColor: '#ffffff' },
  dayBoxAbsent: { backgroundColor: '#fff1f2' },
  dayTextAbsent: { color: '#e11d2e' },
  absentSmallTxt: {
    fontSize: 7,
    fontWeight: '800',
    color: '#e11d2e',
    textAlign: 'center',
    marginTop: 4,
  },
  infoValBlue: { color: '#2563eb' },
  selectedTopDot: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 6,
    height: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },

  // Details Section
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
    marginBottom: 16,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  schedInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b8001d',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  schedDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    backgroundColor: '#10b981',
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 1,
  },
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoIconTxt: {
    fontSize: 16,
  },
  iconBlack: { color: '#b8001d' },
  iconBlue: { color: '#2563eb' },
  iconGreen: { color: '#059669' },
  infoVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1c1c',
    marginBottom: 2,
  },
  infoValGreen: {
    color: '#047857',
  },
  infoSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5f5e5e',
    textTransform: 'uppercase',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b8001d',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  detailBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
  },
  detailBtnIcon: {
    fontSize: 16,
    color: '#ffffff',
  },

  // Legend
  legendCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  legendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  legendTitleBar: {
    width: 4,
    height: 12,
    backgroundColor: '#b8001d',
    borderRadius: 2,
    marginRight: 8,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5f5e5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5f5e5e',
  },

  // Stats Summary
  statsSummaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statLabel: { fontSize: 8, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },

  // Report Section
  reportSection: {
    marginTop: 10,
    paddingBottom: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  logCardAbsent: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecaca',
  },
  logDateColumn: {
    width: 45,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    paddingRight: 8,
  },
  logDayNum: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  logDayName: { fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  logDetailsColumn: {
    flex: 1,
    paddingLeft: 12,
  },
  logStatusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  logStatusText: { fontSize: 10, fontWeight: '800' },
  logTimeRow: { flexDirection: 'row' },
  timeInfo: { flexDirection: 'row', alignItems: 'center' },
  timeTxt: { fontSize: 11, fontWeight: '600', color: '#334155', marginLeft: 4 },
  absentWarning: { fontSize: 9, color: '#ef4444', fontStyle: 'italic' },
  logHoursColumn: {
    alignItems: 'flex-end',
  },
  logHoursValue: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
  logHoursLabel: { fontSize: 8, fontWeight: '700', color: '#64748b' },
  dotGray: { backgroundColor: '#cbd5e1' },
  textGray: { color: '#94a3b8' },
  textGreen: { color: '#10b981' },
  textRed: { color: '#ef4444' },

  // Detail Card
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hoursBadge: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  hoursVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  hoursLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailItemText: {
    flex: 1,
  },
  detailItemVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  detailItemSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f3f3f3',
    elevation: 8,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    flex: 1,
    position: 'relative',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  navActiveLabel: {
    color: '#e11d2e',
  },
  navActiveIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 4,
    backgroundColor: '#b8001d',
    borderRadius: 2,
  },
  // Production states
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMsg: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b8001d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default EmployeeCalendarScreen;
