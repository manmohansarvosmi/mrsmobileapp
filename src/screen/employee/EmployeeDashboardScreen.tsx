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
import BackgroundActions from 'react-native-background-actions';
import BackgroundTimer from 'react-native-background-timer';
import { getHomeDashboard, HomeDashboard, DayAttendance, RecentActivity } from '../../service/homeService';
import { punchIn, punchOut, updateLocation } from '../../service/trackingService';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ GPS Permission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Get Location Promise â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const getCurrentPositionAsync = (options?: any): Promise<{ latitude: number; longitude: number }> =>
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

// â”€â”€â”€ Battery Optimization Prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EmployeeDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const isTrackingRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  // ── Fetch Dashboard ──────────────────────────────────────────────────────────

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await getHomeDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('[Dashboard] Fetch Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // ── Tracking Task ──────────────────────────────────────────────────────────

  const getElapsedDuration = (punchInISO: string): string => {
    try {
      const diffMs = new Date().getTime() - new Date(punchInISO).getTime();
      if (diffMs < 0) return '00h 00m 00s';
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    } catch (e) {
      return 'Calculating...';
    }
  };

  const trackingTask = async (taskData: any) => {
    const punchTime = taskData?.punchInTime;

    await new Promise(async (resolve) => {
      let updateCount = 0;
      while (BackgroundActions.isRunning()) {
        updateCount++;
        const now = new Date();
        const timestamp = now.toLocaleTimeString();
        console.log(`[Tracking Task] Update #${updateCount} at ${timestamp}`);

        // ── Check for Auto Punch-Out 9:00 PM ──
        if (now.getHours() >= 21) {
          console.log('[Tracking Task] 9:00 PM REACHED. Triggering Auto Punch Out.');
          try {
            await punchOut();
            await BackgroundActions.updateNotification({
              taskTitle: 'Duty Auto-Completed',
              taskDesc: 'Shift ended automatically at 9:00 PM',
              color: '#4b5563',
            });
            isTrackingRef.current = false;
            await sleep(2000);
            await BackgroundActions.stop();
            return; // Exit task
          } catch (autoErr) {
            console.error('[Auto Punch Out] Failed:', autoErr);
          }
        }

        try {
          // Update notification with LIVE TIMER
          const durationStr = punchTime ? getElapsedDuration(punchTime) : 'Updating...';
          
          await BackgroundActions.updateNotification({
            taskTitle: 'MRS Purvia – Duty Active',
            taskDesc: `Duration: ${durationStr} • Tracking Active`,
          });

          // Fetch & Sync Location
          const pos = await new Promise<{ latitude: number; longitude: number } | null>((res) => {
            const timeoutId = setTimeout(() => res(null), 12000); 
            Geolocation.getCurrentPosition(
              (p) => {
                clearTimeout(timeoutId);
                res({ latitude: p.coords.latitude, longitude: p.coords.longitude });
              },
              (e) => {
                clearTimeout(timeoutId);
                res(null);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
          });

          if (pos) {
            await updateLocation(pos.latitude, pos.longitude);
          }
        } catch (err) {
          console.log('[Tracking Task] Heartbeat Error:', err);
        }
        
        await sleep(15000); // 15s high-frequency sync cycle
      }
    });
  };

  const startTracking = async (pTime?: string) => {
    try {
      if (isTrackingRef.current) return;
      isTrackingRef.current = true;
      console.log('[Tracking] Starting Background Task with time:', pTime);

      const options = {
        taskName: 'LocationTracking',
        taskTitle: 'MRS Purvia – Duty Active',
        taskDesc: 'Calculating duration...',
        taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
        },
        color: '#e11d2e',
        linkingURI: 'mrspurvia://dashboard', 
        parameters: {
          punchInTime: pTime || dashboard?.punchInTime,
        },
      };

      await BackgroundActions.start(trackingTask, options);
    } catch (err) {
      console.error('[Tracking] Start Failed:', err);
      isTrackingRef.current = false;
    }
  };

  const stopTracking = async () => {
    try {
      console.log('[Tracking] Stopping BackgroundActions task...');
      isTrackingRef.current = false;
      await BackgroundActions.stop();
    } catch (err) {
      console.error('[Tracking] Stop Failed:', err);
    }
  };

  useEffect(() => {
    if (dashboard === null) return;

    if (dashboard.hasActiveSession) {
      startTracking(dashboard.punchInTime ?? undefined);
    } else {
      stopTracking();
    }
  }, [dashboard?.hasActiveSession, dashboard?.punchInTime]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // ── Punch In / Out ─────────────────────────────────────────────────────────
  const handlePunch = async () => {
    if (punchLoading) return;
    setPunchLoading(true);

    try {
      console.log('[Punch] Starting handlePunch...');

      if (dashboard?.hasActiveSession) {
        // ── Punch Out ──
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

        const punchInRes = await punchIn();
        const serverPunchTime = punchInRes?.data?.punchInTime;
        await updateLocation(lat, lon);
        await startTracking(serverPunchTime ?? undefined);
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

  // â”€â”€ Bar chart height â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const maxHours = 10;
  const barHeight = (hours: number) =>
    Math.max(8, Math.round((hours / maxHours) * 80));

  // â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Get initials from full name (e.g. "Rahul Sharma" â†’ "RS")
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
            <Text style={styles.userNameHeader}>{dashboard?.fullName ?? 'â€”'}</Text>
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
                <View style={[styles.activeDotSmall, !isActive && styles.activeDotInactiveSmall]} />
                <Text style={[styles.activeTextSmall, !isActive && styles.activeTextInactiveSmall]}>
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

        {/* Stats Container - Weekly Activity Tracking */}
        <View style={styles.statsContainer}>
          <View style={styles.perfCard}>
            <View style={styles.perfCardHeader}>
              <Text style={styles.perfCardTitle}>ATTENDANCE PROGRESS</Text>
              <Text style={styles.perfCardSubtitle}>THIS WEEK</Text>
            </View>
            
            <View style={styles.activityTracker}>
              {(dashboard?.weeklyAttendance ?? []).map((d: DayAttendance, i: number) => {
                const totalGoal = 9; // standard shift
                const progress = Math.min(1, d.hours / totalGoal);
                const isActive = d.day === new Date().toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();

                return (
                  <View key={i} style={styles.activityDay}>
                    <View style={styles.pillTrack}>
                      <View 
                        style={[
                          styles.pillFill, 
                          { 
                            height: `${progress * 100}%`,
                            backgroundColor: d.present ? '#b8001d' : '#f1f5f9'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.activityDayLabel, isActive && styles.activityDayActive]}>{d.day[0]}</Text>
                    {isActive && <View style={styles.activeDayDot} />}
                  </View>
                );
              })}
            </View>
            
            <View style={styles.summaryFooter}>
              <View style={styles.footerStat}>
                <Text style={styles.footerStatVal}>{dashboard?.weeklyAttendance?.filter(d => d.present).length || 0}/7</Text>
                <Text style={styles.footerStatLabel}>DAYS PRESENT</Text>
              </View>
              <View style={styles.footerStatDivider} />
              <View style={styles.footerStat}>
                <Text style={styles.footerStatVal}>
                  {(dashboard?.weeklyAttendance?.reduce((acc, curr) => acc + curr.hours, 0) || 0).toFixed(1)}h
                </Text>
                <Text style={styles.footerStatLabel}>TOTAL HOURS</Text>
              </View>
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
                <View
                  key={act.attendanceId}
                  style={styles.recentRow}
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
                </View>
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
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="person" size={24} color="#94a3b8" />
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  perfCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  perfCardTitle: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1.5 },
  perfCardSubtitle: { fontSize: 10, fontWeight: '800', color: '#b8001d', letterSpacing: 0.5 },
  activityTracker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, marginBottom: 20, paddingHorizontal: 4 },
  activityDay: { alignItems: 'center', flex: 1, position: 'relative' },
  pillTrack: { width: 12, height: 70, backgroundColor: '#f3f4f6', borderRadius: 6, overflow: 'hidden', marginBottom: 8, justifyContent: 'flex-end' },
  pillFill: { width: '100%', borderRadius: 6 },
  activityDayLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  activityDayActive: { color: '#1a1c1c' },
  activeDayDot: { position: 'absolute', bottom: -8, width: 4, height: 4, borderRadius: 2, backgroundColor: '#b8001d' },
  summaryFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  footerStat: { alignItems: 'center' },
  footerStatVal: { fontSize: 16, fontWeight: '800', color: '#1a1c1c' },
  footerStatLabel: { fontSize: 8, fontWeight: '800', color: '#94a3b8', marginTop: 2 },
  footerStatDivider: { width: 1, height: 20, backgroundColor: '#f1f5f9' },
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
