import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { getRoute, RouteResponse } from '../../service/trackingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RouteScreenProps = RouteProp<RootStackParamList, 'Route'>;

const EmployeeRouteScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const routeParams = useRoute<RouteScreenProps>();
  const { attendanceId } = routeParams.params;

  const [routeData, setRouteData] = useState<RouteResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoute();
  }, []);

  const fetchRoute = async () => {
    try {
      const userIdStr = await AsyncStorage.getItem('userId');
      if (!userIdStr) {
        Alert.alert('Error', 'User ID not found. Please login again.');
        return;
      }
      const userId = parseInt(userIdStr, 10);
      const data = await getRoute(userId, attendanceId);
      setRouteData(data);
    } catch (error) {
      console.error('Fetch Route Error:', error);
      Alert.alert('Error', 'Failed to fetch route data.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string): string => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e11d2e" />
        <Text style={styles.loadingText}>Loading route details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#1a1c1c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Log</Text>
        <View style={{ width: 40 }} />
      </View>

      {routeData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="location-off" size={64} color="#e5e7eb" />
          <Text style={styles.emptyText}>No tracking points found for this session.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRoute}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Session Summary</Text>
            <Text style={styles.summaryText}>{routeData.length} location points synchronized with server.</Text>
          </View>

          <Text style={styles.sectionTitle}>Detailed Log</Text>
          {routeData.map((point, index) => (
            <View key={index} style={styles.logRow}>
              <View style={styles.logIcon}>
                <Icon name="location-on" size={20} color="#e11d2e" />
              </View>
              <View style={styles.logContent}>
                <Text style={styles.logTime}>{formatTime(point.timestamp || '')}</Text>
                <Text style={styles.logCoords}>
                  Lat: {point.latitude.toFixed(6)}, Lon: {point.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#5f5e5e' },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1c1c' },
  backBtn: { padding: 8 },
  scrollContent: { padding: 16 },
  summaryBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    elevation: 1,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#1a1c1c', marginBottom: 4 },
  summaryText: { fontSize: 13, color: '#6b7280' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  logIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logContent: { flex: 1 },
  logTime: { fontSize: 14, fontWeight: '700', color: '#1a1c1c' },
  logCoords: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 16, textAlign: 'center', color: '#6b7280', fontSize: 15 },
  retryBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#e11d2e', borderRadius: 8 },
  retryText: { color: '#ffffff', fontWeight: '600' },
});

export default EmployeeRouteScreen;
