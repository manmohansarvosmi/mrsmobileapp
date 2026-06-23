import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { getUserProfile } from '../../service/api';

const EmployeeProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        setError('User session not found. Please login again.');
        return;
      }
      const response = await getUserProfile(Number(userId));
      if (response.data && response.data.code === 1) {
        setProfile(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to load profile.');
      }
    } catch (err: any) {
      console.error('[Profile] Fetch Error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Network error. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['userToken', 'userId', 'userRole', 'userInfo']);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#e11d2e" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#b8001d" />
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#e11d2e" />
        <View style={styles.centered}>
          <Icon name="cloud-off" size={64} color="#e2e8f0" />
          <Text style={styles.errorTitle}>Could Not Load Profile</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const p = profile || {};

  // Get initials from full name (e.g. "Arjun Singh" → "AS")
  const getInitials = (name: string) => {
    const parts = name?.trim().split(' ').filter(Boolean) ?? [];
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const initials = getInitials(p.fullName || '');

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
            <Icon name="arrow-back" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>M.R.S. PURVIA PROFILE</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <Icon name="logout" size={24} color="#b8001d" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#b8001d']} />}
      >

        {/* Compact Profile Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileInfoRow}>
            <View style={styles.avatarImg}>
              <Text style={styles.avatarInitialsText}>{initials}</Text>
            </View>
            <View style={styles.profileDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{p.fullName || 'User'}</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{p.status || 'ACTIVE'}</Text>
                </View>
              </View>
              <Text style={styles.roleText}>Corporate ID: {p.corporateId || '----'} | {p.designation || 'Staff'}</Text>

              <View style={styles.contactRow}>
                <View style={styles.contactItem}>
                  <Icon name="location-on" size={14} color="#5f5e5e" />
                  <Text style={styles.contactText}>{p.location || 'HQ'}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Icon name="mail" size={14} color="#5f5e5e" />
                  <Text style={styles.contactText}>{p.email || '----'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
              <Icon name="more-vert" size={20} color="#1a1c1c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Attendance Summary Row */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>LOGGED HOURS</Text>
            <Text style={styles.summaryValue}>{p.loggedHours || 0}</Text>
            <View style={styles.summaryTrend}>
              <Icon name="trending-up" size={14} color="#16a34a" />
              <Text style={styles.trendTextGreen}>+{p.hoursGrowth || 0}%</Text>
            </View>
          </View>
          <View style={[styles.summaryBox, styles.summaryBoxMiddle]}>
            <Text style={styles.summaryLabel}>DAYS PRESENT</Text>
            <Text style={styles.summaryValue}>{p.daysPresent || 0}</Text>
            <Text style={styles.summarySub}>Full Quota</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>DAYS ABSENT</Text>
            <Text style={styles.summaryValue}>{p.daysAbsent || 0}</Text>
            <Text style={styles.summarySub}>MTD</Text>
          </View>
        </View>


        {/* Performance Insight */}
        <View style={styles.perfCard}>
          <Text style={styles.perfTitle}>Performance Insight</Text>
          <View style={styles.circularContainer}>
            {/* Custom Circular Progress */}
            <View style={[styles.circleOuter, { borderTopColor: '#b8001d', borderRightColor: '#b8001d', borderBottomColor: p.performanceScore > 75 ? '#b8001d' : '#e5e2e1' }]}>
              <View style={styles.circleInner}>
                <Text style={styles.circleScoreText}>{p.performanceScore || 0}%</Text>
                <Text style={styles.circleScoreLabel}>SCORE</Text>
              </View>
            </View>
          </View>
          <Text style={styles.efficiencyTitle}>Working Efficiency</Text>
          <Text style={styles.efficiencyDesc}>{p.efficiencyDescription || 'Consistently exceeding benchmarks.'}</Text>

          <View style={styles.accuracyBox}>
            <View style={styles.accuracyHeader}>
              <Text style={styles.accuracyLabel}>REPORTING ACCURACY</Text>
              <Text style={styles.accuracyLabel}>{p.reportingAccuracy || 0}%</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${p.reportingAccuracy || 0}%` }]} />
            </View>
          </View>
        </View>

        {/* Upcoming Reviews */}
        <View style={styles.reviewsCard}>
          <Text style={styles.reviewsTitle}>UPCOMING REVIEWS</Text>

          {(p.upcomingReviews || []).map((rev: any, idx: number) => (
            <View key={idx} style={styles.reviewItemWrapper}>
              <View style={idx === 0 ? styles.reviewItemLineRed : styles.reviewItemLineGray} />
              <View>
                <Text style={styles.reviewItemTitle}>{rev.title}</Text>
                <Text style={styles.reviewItemSub}>{rev.date} • {rev.location}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.viewSchedulesBtn}>
            <Text style={styles.viewSchedulesText}>VIEW ALL SCHEDULES</Text>
          </TouchableOpacity>
        </View>

        {/* Salary & Payroll Shortcut */}
        <TouchableOpacity 
          style={styles.salaryCardShortcut} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Salary')}
        >
          <View style={styles.salaryCardLeft}>
            <View style={styles.salaryIconBox}>
              <Icon name="payments" size={24} color="#b8001d" />
            </View>
            <View>
              <Text style={styles.salaryTitle}>My Salary & Payroll</Text>
              <Text style={styles.salarySub}>View pay slips and monthly earnings</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#94a3b8" />
        </TouchableOpacity>

      </ScrollView>

      {/* Bottom Navigation - Only show if not inside a Tab Navigator */}
      {navigation.getParent()?.getState()?.type !== 'tab' && (
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => navigation.navigate('Dashboard')}>
            <Icon name="dashboard" size={24} color="#94a3b8" />
            <Text style={styles.navLabel}>HOME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => navigation.navigate('Calendar')}>
            <Icon name="calendar-month" size={24} color="#94a3b8" />
            <Text style={styles.navLabel}>CALENDAR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.navActiveIndicator} />
            <Icon name="person" size={24} color="#e11d2e" />
            <Text style={[styles.navLabel, styles.navActiveLabel]}>PROFILE</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerProfileImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fef2f2',
  },
  logoutBtn: {
    marginLeft: 12,
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderTopWidth: 2,
    borderTopColor: '#b8001d',
    marginBottom: 24,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    backgroundColor: '#b8001d',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#b8001d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  avatarInitialsText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1c1c',
    marginRight: 8,
  },
  activeBadge: {
    backgroundColor: 'rgba(184, 0, 29, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#b8001d',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roleText: {
    fontSize: 14,
    color: '#5f5e5e',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#5f5e5e',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editBtn: {
    backgroundColor: '#b8001d',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  moreBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(95, 94, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryBoxMiddle: {
    borderTopWidth: 2,
    borderTopColor: '#b8001d',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5f5e5e',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  summaryTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trendTextGreen: {
    fontSize: 12,
    color: '#16a34a',
    marginLeft: 2,
  },
  summarySub: {
    fontSize: 12,
    color: '#5f5e5e',
    marginTop: 4,
  },
  telemetryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
  },
  telemetryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  telemetryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  telemetrySub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5f5e5e',
    textTransform: 'uppercase',
  },
  mapContainer: {
    height: 256,
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  mapBg: {
    width: '100%',
    height: '100%',
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  mapBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  mapInfoBox: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f3f3f3',
    maxWidth: 200,
  },
  mapInfoTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b8001d',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mapInfoLoc: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  mapInfoTime: {
    fontSize: 10,
    color: '#5f5e5e',
    marginTop: 4,
  },
  perfCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  perfTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1c1c',
    width: '100%',
    textAlign: 'left',
    marginBottom: 24,
  },
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  circleOuter: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 10,
    borderColor: '#e5e2e1',
    borderTopColor: '#b8001d',
    borderRightColor: '#b8001d',
    borderBottomColor: '#b8001d',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }], // To simulate 88%
  },
  circleInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }], // Counter-rotate content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  circleScoreText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  circleScoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5f5e5e',
    textTransform: 'uppercase',
  },
  efficiencyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1c',
  },
  efficiencyDesc: {
    fontSize: 12,
    color: '#5f5e5e',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  accuracyBox: {
    width: '100%',
    marginTop: 24,
  },
  accuracyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accuracyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5f5e5e',
    textTransform: 'uppercase',
  },
  barBg: {
    height: 6,
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    width: '94%',
    backgroundColor: '#b8001d',
    borderRadius: 3,
  },
  reviewsCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  reviewsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e11d2e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  reviewItemWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  reviewItemLineRed: {
    width: 2,
    backgroundColor: '#b8001d',
    marginRight: 12,
  },
  reviewItemLineGray: {
    width: 2,
    backgroundColor: '#4b5563',
    marginRight: 12,
  },
  reviewItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  reviewItemSub: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  reviewItemTitleDark: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d1d5db',
  },
  reviewItemSubDark: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  viewSchedulesBtn: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewSchedulesText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // Salary Shortcut
  salaryCardShortcut: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  salaryCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  salaryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(184, 0, 29, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  salarySub: {
    fontSize: 12,
    color: '#5f5e5e',
    marginTop: 2,
  },
  // Bottom Nav
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
  // Error / Loading States
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

export default EmployeeProfileScreen;
