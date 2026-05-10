import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  PermissionsAndroid,
  Platform,
  Linking,
  DeviceEventEmitter,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import Geolocation from 'react-native-geolocation-service';
import ForegroundService from '@supersami/rn-foreground-service';
import BackgroundTimer from 'react-native-background-timer';
import { getHomeDashboard, HomeDashboard, DayAttendance, RecentActivity } from '../../service/homeService';
import { punchIn, punchOut, updateLocation } from '../../service/trackingService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    return '--:--';
  }
};

const formatDuration = (punchIn: string | null, punchOut: string | null): string => {
  if (!punchIn || !punchOut) return '--h --m';
  const mins = Math.round((new Date(punchOut).getTime() - new Date(punchIn).getTime()) / 60000);
  if (mins < 0) return '0h 0m';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const todayLabel = (): string =>
  new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Kolkata',
  }).toUpperCase();

// ─── GPS Permission ───────────────────────────────────────────────────────────

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  try {
    // 1. Fine Location
    const fineGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'MRS Purvia needs your location for duty tracking.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (fineGranted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('Permission Denied', 'Location access is required.');
      return false;
    }

    // 2. Notification Permission (Android 13+)
    if ((Platform.Version as number) >= 33) {
      const notifyGranted = await PermissionsAndroid.request(
        (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS
      );
      if (notifyGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Warning', 'Notifications are needed to keep tracking alive in background.');
      }
    }

    // 3. Background Location (CRITICAL for lock screen)
    if ((Platform.Version as number) >= 29) {
      const hasBg = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      );
      if (!hasBg) {
        Alert.alert(
          'Background Access Required',
          'Lock screen tracking ke liye Location permission ko "Allow all the time" par set karein.',
          [
            {
              text: 'Open Settings',
              onPress: () => PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION)
            }
          ]
        );
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
};

// ─── Get Location Promise ─────────────────────────────────────────────────────

const getCurrentPositionAsync = (options?: Geolocation.Options): Promise<{ latitude: number; longitude: number }> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) =>
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      options || {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 10000,
        forceRequestLocation: false, // Safer for background
        forceLocationManager: true,
      },
    );
  });

const sleep = (time: number) =>
  new Promise((resolve) => setTimeout(() => resolve(null), time));

// ─── Battery Optimization Prompt ─────────────────────────────────────────────

const askBatteryOptimization = () => {
  Alert.alert(
    'Battery Optimization',
    'Accurate background tracking ke liye battery optimization OFF karna zaroori hai. Settings mein jaake "MRS Purvia" ko "Don\'t optimize" set karein.',
    [
      {
        text: 'Settings Kholein',
        onPress: () => Linking.openSettings(),
      },
      { text: 'Baad Mein', style: 'cancel' },
    ],
  );
};


// ─── Component ────────────────────────────────────────────────────────────────

const EmployeeDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const isTrackingRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  // ── Fetch Dashboard ──────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await getHomeDashboard();
      console.warn('[Dashboard] Data fetched. hasActiveSession:', data.hasActiveSession);
      setDashboard(data);
    } catch (err: any) {
      console.error('[Dashboard] Fetch Error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Foreground Service: Background Location Tracking ─────────────

  const startTracking = async () => {
    try {
      if (isTrackingRef.current) return;
      isTrackingRef.current = true;
      console.log('[Tracking] Starting service and 10s timer...');

      // 1. Start the Foreground Service (Keep-alive)
      if (!ForegroundService.is_task_running('keep_alive_task')) {
        ForegroundService.add_task(
          () => console.log('[Tracking] Service Keep-alive active'),
          { delay: 100000, onLoop: true, taskId: 'keep_alive_task' }
        );
      }

      await ForegroundService.start({
        id: 1,
        title: 'MRS Purvia – Duty Active',
        message: 'Location tracking is active...',
        icon: 'ic_launcher',
        ServiceType: 'location',




        button: false,
      });

      // 2. Start the 10-second Interval
      let updateCount = 0;
      intervalRef.current = BackgroundTimer.setInterval(async () => {
        updateCount++;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[Tracking] Update #${updateCount} at ${timestamp}`);

        try {
          // Update notification (wrapped in try-catch to avoid loop crash)
          try {
            await ForegroundService.update({
              id: 1,
              title: 'MRS Purvia – Duty Active',
              message: `Active: ${updateCount} updates (${timestamp})`,
              icon: 'ic_launcher',
            });
          } catch (e) {
            console.log('[Tracking] Notification update failed, but tracking continues');
          }

          // Fetch Location with high/low accuracy fallback
          const fetchPos = async (high: boolean) => {
            return await getCurrentPositionAsync({
              enableHighAccuracy: high,
              timeout: 10000,
              maximumAge: 10000,
              forceRequestLocation: false,
              forceLocationManager: true,
            });
          };

          let pos;
          try {
            pos = await fetchPos(true);
          } catch (e) {
            console.log('[Tracking] High accuracy failed, using coarse fallback...');
            pos = await fetchPos(false);
          }

          // Network Retry Logic
          let retryCount = 0;
          const sync = async () => {
            try {
              await updateLocation(pos.latitude, pos.longitude);
              console.log('[Tracking] Sync success');
            } catch (err: any) {
              if (retryCount < 2) {
                retryCount++;
                console.log(`[Tracking] Network error, retrying #${retryCount}...`);
                setTimeout(sync, 3000);
              } else {
                console.log('[Tracking] Sync failed after retries');
              }
            }
          };

          sync();
        } catch (err) {
          console.log('[Tracking] Interval Loop Error:', err);
        }
      }, 10000);

      console.log('[Tracking] Background system started successfully.');
    } catch (err) {
      console.error('[Tracking] Start Failed:', err);
      isTrackingRef.current = false;
    }
  };

  const stopTracking = async () => {
    try {
      console.log('[Tracking] Stopping all tracking...');
      isTrackingRef.current = false;
      if (intervalRef.current) {
        BackgroundTimer.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      await ForegroundService.stop();
      ForegroundService.remove_task('keep_alive_task');
    } catch (err) {
      console.error('[Tracking] Stop Failed:', err);
    }
  };

  useEffect(() => {
    if (dashboard === null) return;

    if (dashboard.hasActiveSession) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [dashboard?.hasActiveSession]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // ── Punch In / Out ───────────────────────────────────────────────
  const handlePunch = async () => {
    if (punchLoading) return;
    setPunchLoading(true);

    try {
      console.log('[Punch] Starting handlePunch...');

      if (dashboard?.hasActiveSession) {
        // ── Punch Out ──
        // User requested: "punch out pr location fetch call na ho"
        console.log('[Punch] Ending duty (Punch Out) - Skipping Location Fetch...');
        await punchOut();
        await stopTracking();
        Alert.alert('Punched Out', 'Duty ended successfully.');
      } else {
        // ── Punch In ──
        console.log('[Punch] Starting duty (Punch In)...');
        
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          console.log('[Punch] Permission denied.');
          setPunchLoading(false);
          return;
        }

        console.log('[Punch] Permissions granted, fetching location for Punch In...');
        await sleep(500);

        let lat = 0, lon = 0;
        try {
          const { latitude, longitude } = await getCurrentPositionAsync();
          lat = latitude;
          lon = longitude;
          console.log('[Punch] Location fetched for In:', lat, lon);
        } catch (err: any) {
          console.log('[Punch] GPS Error:', err);
          Alert.alert(
            'GPS Error',
            'Failed to get location for Punch In. Please ensure GPS is enabled.',
          );
          setPunchLoading(false);
          return;
        }

        await punchIn();
        await updateLocation(lat, lon);
        await startTracking();
        Alert.alert('Punched In', 'Duty started successfully.');
        
        // Ask user to disable battery optimization for reliable background tracking
        setTimeout(() => askBatteryOptimization(), 1500);
      }

      await fetchDashboard();
    } catch (err: any) {
      console.error('[Punch] Error:', err);
      const backendMessage = err?.response?.data?.message;
      const errorMessage = backendMessage || err.message || 'Action failed. Please try again.';
      Alert.alert('Duty Action Failed', errorMessage);
    } finally {
      setPunchLoading(false);
    }
  };

  // ── Bar chart height ─────────────────────────────────────────────
  const maxHours = 10;
  const barHeight = (hours: number) =>
    Math.max(8, Math.round((hours / maxHours) * 80));

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b8001d" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  const firstName = dashboard?.fullName?.split(' ')[0] ?? 'User';
  const isActive = dashboard?.hasActiveSession ?? false;

  // Get initials from full name (e.g. "Rahul Sharma" → "RS")
  const getInitials = (name: string) => {
    const parts = name?.trim().split(' ').filter(Boolean) ?? [];
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const initials = getInitials(dashboard?.fullName ?? '');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#e11d2e" />

      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.initialsAvatar}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
          <View style={styles.userInfoLeft}>
            <Text style={styles.userNameHeader}>{dashboard?.fullName ?? '—'}</Text>
            <View style={styles.activeStatusBoxSmall}>
              <View style={[styles.activeDotSmall, !isActive && styles.activeDotInactiveSmall]} />
              <Text style={[styles.activeTextSmall, !isActive && styles.activeTextInactiveSmall]}>
                {isActive ? 'ACTIVE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#b8001d']} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeGreeting}>
              {getGreeting()}, {firstName}
            </Text>
            <Text style={styles.dateText}>{todayLabel()}</Text>
          </View>
          {dashboard?.organizationName ? (
            <View style={styles.locationBadge}>
              <Icon name="location-on" size={16} color="#1a1c1c" style={{ marginRight: 4 }} />
              <Text style={styles.locationText}>{dashboard.organizationName}</Text>
            </View>
          ) : null}
        </View>

        {/* Work Session Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Icon name="schedule" size={20} color="#b8001d" style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>WORK SESSION</Text>
            </View>
            <View style={styles.cardHeaderRight}>
              <View style={styles.shiftBadge}>
                <Text style={styles.shiftText}>SHIFT: DAY</Text>
              </View>
              <View style={styles.activeStatusBoxSmall}>
                <View style={[styles.activeDotSmall, !isActive && styles.activeDotInactive]} />
                <Text style={[styles.activeTextSmall, !isActive && styles.activeTextInactive]}>
                  {isActive ? 'ACTIVE' : 'IDLE'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.timeGrid}>
            <View style={styles.timeBox}>
              <Icon name="login" size={24} color="#9ca3af" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.timeLabel}>START</Text>
                {dashboard?.punchInTime ? (
                  <Text style={styles.timeValue}>{formatTime(dashboard.punchInTime)}</Text>
                ) : (
                  <Text style={styles.timeValueEmpty}>--:--</Text>
                )}
              </View>
            </View>
            <View style={styles.timeBox}>
              <Icon name="logout" size={24} color="#9ca3af" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.timeLabel}>END</Text>
                {dashboard?.punchOutTime ? (
                  <Text style={styles.timeValue}>{formatTime(dashboard.punchOutTime)}</Text>
                ) : (
                  <Text style={styles.timeValueEmpty}>--:--</Text>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.startDutyBtn, isActive && styles.dutyStartedBtn]}
            activeOpacity={0.8}
            onPress={handlePunch}
            disabled={punchLoading}
          >
            {punchLoading ? (
              <ActivityIndicator
                size="small"
                color="#ffffff"
                style={{ marginRight: 8 }}
              />
            ) : (
              <Icon
                name={isActive ? 'stop-circle' : 'play-circle-outline'}
                size={20}
                color="#ffffff"
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={styles.startDutyText}>
              {punchLoading ? 'PLEASE WAIT...' : isActive ? 'END DUTY' : 'START DUTY'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          {/* Weekly Attendance Bar Chart */}
          <View style={styles.perfCard}>
            <Text style={styles.perfCardTitle}>THIS WEEK'S ATTENDANCE</Text>
            <View style={styles.barChart}>
              {(dashboard?.weeklyAttendance ?? []).map((d: DayAttendance, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      height: barHeight(d.hours),
                      backgroundColor: d.present ? '#b8001d' : '#e8e8e8',
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.barLabels}>
              {(dashboard?.weeklyAttendance ?? []).map((d: DayAttendance, i: number) => (
                <Text key={i} style={styles.barLabel}>
                  {d.day}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>RECENT ACTIVITY</Text>
            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All History </Text>
              <Icon name="arrow-forward" size={14} color="#b8001d" />
            </TouchableOpacity>
          </View>

          <View style={styles.recentList}>
            {dashboard?.recentActivity?.length === 0 && (
              <Text style={styles.emptyText}>No recent activity found.</Text>
            )}
            {(dashboard?.recentActivity ?? []).map((act: RecentActivity) => {
              const isOnTime = act.status === 'ON_TIME';
              return (
                <TouchableOpacity
                  key={act.attendanceId}
                  style={styles.recentRow}
                  onPress={() =>
                    navigation.navigate('Route', { attendanceId: act.attendanceId })
                  }
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.rowIconBox,
                        isOnTime ? styles.bgGreen : styles.bgAmber,
                      ]}
                    >
                      <Icon
                        name={isOnTime ? 'check-circle' : 'warning'}
                        size={20}
                        color={isOnTime ? '#15803d' : '#b45309'}
                      />
                    </View>
                    <View>
                      <Text style={styles.rowDate}>{act.dateLabel}</Text>
                      <Text style={styles.rowTime}>
                        {formatTime(act.punchInTime)} - {formatTime(act.punchOutTime)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rowCenter}>
                    <Text style={styles.rowDuration}>
                      {formatDuration(act.punchInTime, act.punchOutTime)}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        isOnTime ? styles.bgGreenLight : styles.bgAmberLight,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isOnTime ? styles.textGreen : styles.textAmber,
                        ]}
                      >
                        {isOnTime ? 'ON TIME' : 'LATE'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <View style={styles.navActiveIndicator} />
          <Icon name="dashboard" size={24} color="#e11d2e" />
          <Text style={[styles.navLabel, styles.navActiveLabel]}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Calendar')}
        >
          <Icon name="calendar-month" size={24} color="#94a3b8" />
          <Text style={styles.navLabel}>CALENDAR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => {
            if (dashboard?.hasActiveSession && dashboard.activeAttendanceId) {
              navigation.navigate('Route', { attendanceId: dashboard.activeAttendanceId });
            } else {
              Alert.alert('No Active Session', 'Please punch-in to start tracking your route.');
            }
          }}
        >
          <Icon name="route" size={24} color="#94a3b8" />
          <Text style={styles.navLabel}>ROUTES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="person" size={24} color="#94a3b8" />
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#5f5e5e',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
    paddingVertical: 16,
  },
  safeArea: { flex: 1, backgroundColor: '#f9f9f9' },
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
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { padding: 8, marginRight: 4 },
  initialsAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#b8001d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  initialsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#e11d2e', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  userInfo: { alignItems: 'flex-end', marginRight: 12 },
  userName: { fontSize: 14, fontWeight: '600', color: '#1a1c1c' },
  activeStatusBoxSmall: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  activeDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 4,
  },
  activeDotInactiveSmall: { backgroundColor: '#94a3b8' },
  activeTextSmall: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  activeTextInactiveSmall: { color: '#64748b' },
  userInfoLeft: { justifyContent: 'center' },
  userNameHeader: { fontSize: 14, fontWeight: '800', color: '#1a1c1c' },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fef2f2',
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 90 },
  welcomeSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#b8001d',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  welcomeGreeting: { fontSize: 20, fontWeight: '700', color: '#1a1c1c', marginBottom: 2 },
  dateText: { fontSize: 12, fontWeight: '500', color: '#5f5e5e' },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  locationText: { fontSize: 12, fontWeight: '700', color: '#1a1c1c' },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderTopWidth: 2,
    borderTopColor: '#b8001d',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#1a1c1c', letterSpacing: 0.5 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  shiftBadge: {
    backgroundColor: '#e11d2e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 12,
  },
  shiftText: { fontSize: 10, fontWeight: '700', color: '#fff8f7' },
  activeStatusBoxSmall: { flexDirection: 'row', alignItems: 'center' },
  activeDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 4,
  },
  activeTextSmall: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  timeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  timeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    padding: 12,
    borderRadius: 8,
  },
  timeLabel: { fontSize: 10, fontWeight: '700', color: '#5f5e5e', letterSpacing: -0.5 },
  timeValue: { fontSize: 14, fontWeight: '700', color: '#1a1c1c' },
  timeValueEmpty: { fontSize: 14, fontWeight: '700', color: '#cbd5e1' },
  startDutyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b8001d',
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  dutyStartedBtn: { backgroundColor: '#1a1c1c' },
  startDutyText: { color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  statsContainer: { flexDirection: 'column', gap: 16, marginBottom: 24 },
  perfCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  perfCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1c1c',
    marginBottom: 16,
    letterSpacing: 1,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    marginBottom: 8,
  },
  bar: { width: '12%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: {
    width: '12%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#5f5e5e',
  },
  recentSection: { marginBottom: 16 },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: { fontSize: 12, fontWeight: '700', color: '#1a1c1c', letterSpacing: 1 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: { fontSize: 12, fontWeight: '700', color: '#b8001d' },
  recentList: { gap: 12 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f9f9f9',
    elevation: 1,
  },
  rowLeft: { flex: 2, flexDirection: 'row', alignItems: 'center' },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bgGreen: { backgroundColor: '#f0fdf4' },
  bgAmber: { backgroundColor: '#fffbeb' },
  rowDate: { fontSize: 12, fontWeight: '700', color: '#1a1c1c' },
  rowTime: { fontSize: 10, color: '#5f5e5e' },
  rowCenter: {
    flex: 1,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#f3f3f3',
  },
  rowDuration: { fontSize: 10, fontWeight: '700', color: '#1a1c1c' },
  rowRight: { flex: 1, alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  bgGreenLight: { backgroundColor: '#f0fdf4' },
  bgAmberLight: { backgroundColor: '#fffbeb' },
  textGreen: { color: '#15803d' },
  textAmber: { color: '#b45309' },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: -0.5 },
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
  navActiveLabel: { color: '#e11d2e' },
  navActiveIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 4,
    backgroundColor: '#b8001d',
    borderRadius: 2,
  },
});

export default EmployeeDashboardScreen;