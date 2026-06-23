import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { getAdminDashboard, AdminDashboardData } from '../../service/adminService';
import { getInventoryStats, InventoryStats } from '../../service/inventoryService';
import { Typography, Colors, CommonStyles } from '../../utils/theme';
import { punchIn, punchOut } from '../../service/trackingService';
import { getHomeDashboard, HomeDashboard } from '../../service/homeService';
import { Alert } from 'react-native';

const formatTime = (iso: string | null | undefined) => {
  if (!iso) return '--:--';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    }).toUpperCase();
  } catch { return '--:--'; }
};

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 40) / 7;
const logo = require('../../asset/logo.png');

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const flatListRef = useRef<FlatList>(null);
  const isInitialMount = useRef(true);
  const getLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
  };

  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [invStats, setInvStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
  const [viewingMonth, setViewingMonth] = useState(new Date());

  // ── Admin Punch In/Out State ─────────────────────────────────────
  const [homeDashboard, setHomeDashboard] = useState<HomeDashboard | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);

  const monthDates = useMemo(() => {
    const year = viewingMonth.getFullYear();
    const month = viewingMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i));
    }
    return dates;
  }, [viewingMonth]);

  const monthLabel = viewingMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = getLocalDateString(new Date());

  const todayIndex = useMemo(() => {
    const today = new Date();
    if (viewingMonth.getMonth() === today.getMonth() && viewingMonth.getFullYear() === today.getFullYear()) {
      return today.getDate() - 1;
    }
    return 0;
  }, [viewingMonth]);

  const fetchData = async (date?: string) => {
    setLoading(true);
    try {
      const [aData, hData] = await Promise.all([
        getAdminDashboard(date),
        getHomeDashboard().catch(() => null),
      ]);
      setAdminData(aData);
      if (aData.inventory) setInvStats(aData.inventory);
      if (hData) setHomeDashboard(hData);
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  const handlePunch = async () => {
    if (punchLoading) return;
    setPunchLoading(true);
    try {
      if (homeDashboard?.hasActiveSession) {
        await punchOut();
        Alert.alert('Punched Out', 'Duty ended successfully.');
      } else {
        await punchIn();
        Alert.alert('Punched In', 'Duty started successfully.');
      }
      const hData = await getHomeDashboard();
      setHomeDashboard(hData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Action failed.';
      Alert.alert('Punch Failed', msg);
    } finally {
      setPunchLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(selectedDate);
  };

  const changeMonth = (offset: number) => {
    setViewingMonth(new Date(viewingMonth.getFullYear(), viewingMonth.getMonth() + offset, 1));
  };

  const scrollToToday = () => {
    if (flatListRef.current && todayIndex >= 0 && monthDates.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: todayIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) return; // Skip on first mount — handled by onLayout
    scrollToToday();
  }, [todayIndex, monthDates]);

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 10, color: Colors.text.light, fontFamily: Typography.fontFamily.regular }}>Initialising Dashboard...</Text>
      </View>
    );
  }

  const stats = adminData?.stats || { totalEmployees: 0, presentToday: 0, absentToday: 0, lateToday: 0 };
  const attendanceRate = stats.totalEmployees > 0 ? (stats.presentToday / stats.totalEmployees) * 100 : 0;

  const formatDateLabel = (date: string) => {
    const today = getLocalDateString(new Date());
    if (date === today) return 'Today';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderDateItem = ({ item }: { item: Date }) => {
    const fullDate = getLocalDateString(item);
    const isSelected = selectedDate === fullDate;
    const isToday = todayStr === fullDate;
    const dayName = item.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = item.getDate();

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSelectedDate(fullDate)}
        style={[
          styles.stripCard,
          { width: ITEM_WIDTH - 4 },
          isSelected && styles.stripCardSelected,
          isToday && !isSelected && styles.stripCardToday
        ]}
      >
        <Text style={[
          styles.stripDayName,
          isSelected && styles.textWhite,
          isToday && !isSelected && styles.textPrimary
        ]}>
          {dayName}
        </Text>
        <Text style={[
          styles.stripDayNum,
          isSelected && styles.textWhite,
          isToday && !isSelected && styles.textPrimary
        ]}>
          {dayNum}
        </Text>
        {isSelected && <View style={styles.activeBar} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#e11d2e" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconBtn}>
            <Icon name="menu" size={24} color={Colors.text.main} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.profileHeader} onPress={() => navigation.navigate('AdminProfile')}>
          <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
            <Text style={styles.adminNameHeader}>Manmohan Sarvosmi</Text>
            <Text style={styles.adminRoleHeader}>Administrator</Text>
          </View>
          <View style={styles.adminAvatarSmall}>
            <Image source={logo} style={styles.avatarLogo} resizeMode="contain" />
            <View style={styles.onlineDot} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scrollBody}
      >
        {/* 1. Calendar (Now at Top) */}
        <View style={styles.monthHeaderRow}>
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtnSmall}>
              <Icon name="chevron-left" size={20} color={Colors.text.main} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtnSmall}>
              <Icon name="chevron-right" size={20} color={Colors.text.main} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stripWrapper}>
          <FlatList
            ref={flatListRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            data={monthDates}
            renderItem={renderDateItem}
            keyExtractor={(item) => item.toISOString()}
            contentContainerStyle={styles.stripScroll}
            getItemLayout={(data, index) => (
              { length: ITEM_WIDTH - 4 + 8, offset: (ITEM_WIDTH - 4 + 8) * index, index }
            )}
            onLayout={() => {
              if (isInitialMount.current) {
                isInitialMount.current = false;
                scrollToToday();
              }
            }}
          />
        </View>

        {/* Admin Work Session Card */}
        <View style={styles.punchCard}>
          <View style={styles.punchCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="schedule" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.punchCardTitle}>MY WORK SESSION</Text>
            </View>
            <View style={[styles.punchStatusBadge, homeDashboard?.hasActiveSession && styles.punchStatusBadgeActive]}>
              <View style={[styles.punchStatusDot, homeDashboard?.hasActiveSession && styles.punchStatusDotActive]} />
              <Text style={[styles.punchStatusText, homeDashboard?.hasActiveSession && styles.punchStatusTextActive]}>
                {homeDashboard?.hasActiveSession ? 'ACTIVE' : 'IDLE'}
              </Text>
            </View>
          </View>
          <View style={styles.punchTimeRow}>
            <View style={styles.punchTimeBox}>
              <Icon name="login" size={18} color="#059669" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.punchTimeLabel}>CHECK IN</Text>
                <Text style={[styles.punchTimeVal, { color: '#059669' }]}>{formatTime(homeDashboard?.punchInTime)}</Text>
              </View>
            </View>
            <View style={styles.punchTimeDivider} />
            <View style={styles.punchTimeBox}>
              <Icon name="logout" size={18} color="#dc2626" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.punchTimeLabel}>CHECK OUT</Text>
                <Text style={[styles.punchTimeVal, { color: '#dc2626' }]}>{formatTime(homeDashboard?.punchOutTime)}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.punchBtn, homeDashboard?.hasActiveSession && styles.punchBtnActive]}
            onPress={handlePunch}
            disabled={punchLoading}
            activeOpacity={0.8}
          >
            {punchLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name={homeDashboard?.hasActiveSession ? 'stop-circle' : 'play-circle-outline'} size={18} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.punchBtnText}>
              {punchLoading ? 'PLEASE WAIT...' : homeDashboard?.hasActiveSession ? 'END DUTY' : 'START DUTY'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Modern Attendance Grid (Cards) */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
            <View style={styles.statIconBox}><Icon name="people" size={20} color={Colors.success} /></View>
            <View>
              <Text style={styles.statDigit}>{stats.presentToday}</Text>
              <Text style={styles.statTag}>Present</Text>
            </View>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.danger }]}>
            <View style={styles.statIconBox}><Icon name="person-off" size={20} color={Colors.danger} /></View>
            <View>
              <Text style={styles.statDigit}>{stats.absentToday}</Text>
              <Text style={styles.statTag}>Absent</Text>
            </View>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
            <View style={styles.statIconBox}><Icon name="timer" size={20} color={Colors.warning} /></View>
            <View>
              <Text style={styles.statDigit}>{stats.lateToday}</Text>
              <Text style={styles.statTag}>Late</Text>
            </View>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
            <View style={styles.statIconBox}><Icon name="trending-up" size={20} color={Colors.primary} /></View>
            <View>
              <Text style={styles.statDigit}>{Math.round(attendanceRate)}%</Text>
              <Text style={styles.statTag}>Rate</Text>
            </View>
          </View>
        </View>

        {/* Feed Section */}
        <View style={styles.feedHeader}>
          <Text style={styles.sectionTitle}>Logs • {formatDateLabel(selectedDate)}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.syncBtn}>
            <Icon name="sync" size={14} color={Colors.primary} />
            <Text style={styles.syncText}>Sync</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedList}>
          {loading && !refreshing ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            (adminData?.todayList || []).map((log, idx) => {
              const isLate = log.status === 'LATE';
              const isAbsent = log.status === 'ABSENT';
              const themeColor = isLate ? Colors.warning : isAbsent ? Colors.danger : Colors.success;
              const statusLabel = isAbsent ? 'ABSENT' : isLate ? 'LATE' : 'PRESENT';
              const inTime = log.punchInTime ? new Date(log.punchInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : '--:--';
              const outTime = log.punchOutTime ? new Date(log.punchOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : '--:--';

              return (
                <TouchableOpacity key={idx} activeOpacity={0.7}
                  style={[styles.feedCard, { borderLeftColor: themeColor }]}
                >
                  {/* Avatar */}
                  <View style={[styles.feedAvatar, { backgroundColor: themeColor + '18' }]}>
                    <Text style={[styles.feedAvatarText, { color: themeColor }]}>{log.fullName[0]}</Text>
                  </View>

                  {/* Body */}
                  <View style={styles.feedBody}>
                    <Text style={styles.feedTitle} numberOfLines={1}>{log.fullName}</Text>
                    {!isAbsent ? (
                      <Text style={[styles.feedTime, { color: themeColor }]}>
                        IN {inTime}  •  OUT {outTime}
                      </Text>
                    ) : (
                      <Text style={[styles.feedTime, { color: Colors.text.muted }]}>No work session found</Text>
                    )}
                  </View>

                  {/* Status pill */}
                  <View style={[styles.feedStatusPill, { backgroundColor: themeColor + '18', borderColor: themeColor + '40' }]}>
                    <Text style={[styles.feedStatusText, { color: themeColor }]}>{statusLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {!loading && (adminData?.todayList || []).length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="event-busy" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No records for {formatDateLabel(selectedDate)}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  headerLeft: { flex: 1 },
  companyTitle: { fontSize: 18, fontWeight: '900', color: Colors.primary, letterSpacing: -0.5, fontFamily: Typography.fontFamily.semiBold },
  logo: { width: 100, height: 35 },
  greetingText: { fontSize: 8, color: Colors.text.light, fontWeight: '800', letterSpacing: 1 },

  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  adminNameHeader: { fontSize: 13, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.semiBold },
  adminRoleHeader: { fontSize: 10, color: Colors.text.light, fontWeight: '700' },
  adminAvatarSmall: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  avatarLogo: { width: 28, height: 28 },
  avatarTextSmall: { color: '#fff', fontSize: 12, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#fff' },

  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#fff' },

  scrollBody: { paddingHorizontal: 20, paddingBottom: 40 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5, marginBottom: 15 },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    ...CommonStyles.shadow
  },
  statIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  statDigit: { fontSize: 18, fontWeight: '900', color: Colors.text.main, fontFamily: Typography.fontFamily.semiBold },
  statTag: { fontSize: 10, color: Colors.text.light, fontWeight: '700', textTransform: 'uppercase' },

  // Month Header Styles
  monthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  monthTitle: { fontSize: 14, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.semiBold },
  monthNav: { flexDirection: 'row', gap: 6 },
  navBtnSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...CommonStyles.shadow },

  // Horizontal Strip Styles
  stripWrapper: { marginBottom: 15 },
  stripScroll: { gap: 8, paddingRight: 20, paddingVertical: 5 },
  stripCard: {
    height: 65,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...CommonStyles.shadow,
  },
  stripCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stripCardToday: {
    backgroundColor: '#fff1f2',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  stripDayName: { fontSize: 9, fontWeight: '700', color: Colors.text.light, marginBottom: 0, fontFamily: Typography.fontFamily.regular },
  stripDayNum: { fontSize: 16, fontWeight: '900', color: Colors.text.main, fontFamily: Typography.fontFamily.semiBold },
  textWhite: { color: '#fff' },
  textPrimary: { color: Colors.primary },
  activeBar: { width: 12, height: 2, borderRadius: 1, backgroundColor: '#fff', marginTop: 2 },
  todayIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.semiBold },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 5 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fdf2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  syncText: { fontSize: 12, color: Colors.primary, fontWeight: '700', fontFamily: Typography.fontFamily.regular },

  feedList: { gap: 8 },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderLeftWidth: 4,
    ...CommonStyles.shadow,
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedAvatarText: { fontSize: 16, fontWeight: '800', fontFamily: Typography.fontFamily.regular },
  feedBody: { flex: 1 },
  feedTitle: { fontSize: 13, fontWeight: '800', color: Colors.text.main, fontFamily: Typography.fontFamily.regular, marginBottom: 3 },
  feedTime: { fontSize: 11, fontWeight: '700', color: Colors.text.light, fontFamily: Typography.fontFamily.regular },
  feedStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
  },
  feedStatusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  emptyState: { padding: 40, alignItems: 'center', gap: 10 },
  emptyText: { color: Colors.text.light, fontSize: 14, fontFamily: Typography.fontFamily.regular },

  // Punch In/Out Card
  punchCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...CommonStyles.shadow,
  },
  punchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  punchCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.text.main,
    letterSpacing: 0.5,
  },
  punchStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  punchStatusBadgeActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  punchStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
    marginRight: 5,
  },
  punchStatusDotActive: { backgroundColor: '#22c55e' },
  punchStatusText: { fontSize: 9, fontWeight: '800', color: '#64748b' },
  punchStatusTextActive: { color: '#15803d' },
  punchTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  punchTimeBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  punchTimeDivider: { width: 1, height: 36, backgroundColor: '#e2e8f0', marginHorizontal: 12 },
  punchTimeLabel: { fontSize: 9, fontWeight: '800', color: Colors.text.light, letterSpacing: 0.5 },
  punchTimeVal: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  punchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  punchBtnActive: { backgroundColor: '#1f2937' },
  punchBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
});
export default AdminDashboardScreen;
