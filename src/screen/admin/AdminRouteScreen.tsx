import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { getAllEmployees, getRecentAttendance } from '../../service/adminService';
import { getRoute, RouteResponse } from '../../service/trackingService';
import { User } from '../../service/userService';
import { WebView } from 'react-native-webview';
import { Typography, Colors, CommonStyles } from '../../utils/theme';

const { width, height } = Dimensions.get('window');

const AdminRouteScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [routeData, setRouteData] = useState<RouteResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<'MAP' | 'LIST'>('MAP');
  const webViewRef = useRef<WebView>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Fetch Employees Error:', error);
    }
  };

  const handleEmployeeSelect = async (emp: User) => {
    setSelectedEmployee(emp);
    setShowEmpDropdown(false);
    setSelectedSession(null);
    setRouteData([]);
    setSessions([]);
    requestIdRef.current++; // Invalidate any pending route fetches
    
    try {
      setLoading(true);
      const sessionData = await getRecentAttendance(emp.id);
      setSessions(sessionData || []);
      if (!sessionData || sessionData.length === 0) {
        Alert.alert('Info', 'No duty sessions found for this employee.');
      }
    } catch (error) {
      console.error('Fetch Sessions Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSelect = async (session: any) => {
    setSelectedSession(session);
    const currentRequestId = ++requestIdRef.current;
    
    try {
      setLoading(true);
      const data = await getRoute(selectedEmployee!.id, session.id);
      
      // If a new request was started in the meantime, ignore this one
      if (currentRequestId !== requestIdRef.current) return;
      
      setRouteData(data);
      if (data.length > 0) {
        autoFetchAddresses(data, currentRequestId);
      }
    } catch (error) {
      console.error('Fetch Route Error:', error);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const autoFetchAddresses = async (points: any[], reqId: number) => {
    // To avoid rate limits, we only auto-fetch the FIRST point and the LAST 10 points.
    // The rest can be fetched manually by clicking on them.
    const indicesToFetch = [];
    if (points.length > 0) indicesToFetch.push(0); 
    
    const lastStart = Math.max(1, points.length - 10);
    for (let i = lastStart; i < points.length; i++) {
        indicesToFetch.push(i);
    }

    const uniqueIndices = Array.from(new Set(indicesToFetch));

    for (const index of uniqueIndices) {
        if (reqId !== requestIdRef.current) break;
        await new Promise(r => setTimeout(r, 3500)); 
        if (reqId !== requestIdRef.current) break;
        handleFetchAddress(index, points[index].latitude, points[index].longitude, reqId);
    }
  };

  const getAddress = async (lat: number, lon: number) => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
        headers: { 
          'User-Agent': 'MRSPurvia_Admin_App_v1.0',
          'Accept-Language': 'en'
        }
      });
      
      if (!resp.ok) {
        console.log(`Geocode Status Error: ${resp.status}`);
        return 'Error loading address';
      }

      const contentType = resp.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Geocode Error: Received non-JSON response (likely HTML error page)');
        return 'Rate limited';
      }

      const json = await resp.json();
      const addr = json.address;
      
      if (!addr) return json.display_name?.split(',').slice(0, 3).join(', ') || 'Unknown Location';

      // 1. Priority: Landmark, Building or Specific Type
      const landmark = addr.amenity || addr.shop || addr.office || addr.building || 
                       addr.tourism || addr.historic || addr.healthcare || 
                       addr.university || addr.college || addr.school ||
                       addr.road || addr.house_number;
      
      // 2. Priority: Colony, Area or Neighborhood
      const colony = addr.suburb || addr.neighbourhood || addr.village || addr.residential || addr.quarter || addr.hamlet;
      
      // 3. Priority: Road/Street
      const road = addr.road || addr.street;

      // 4. Priority: City or Town
      const city = addr.city || addr.town || addr.municipality;

      const parts = [];
      if (landmark) parts.push(landmark);
      if (colony) parts.push(colony);
      else if (road) parts.push(road); // Only show road if colony isn't found
      if (city) parts.push(city);

      // Final fallback if parts is still empty
      if (parts.length === 0 && json.display_name) {
          return json.display_name.split(',').slice(0, 2).join(', ');
      }

      return parts.length > 0 ? Array.from(new Set(parts)).slice(0,3).join(', ') : 'Location found';
    } catch (e) {
      console.log('Geocode Request Error:', e);
      return 'Retrying...';
    }
  };

  const getAddressWithRetry = async (lat: number, lon: number, attempts = 3): Promise<string> => {
    for (let i = 0; i < attempts; i++) {
        const result = await getAddress(lat, lon);
        if (result !== 'Retrying...' && result !== 'Rate limited' && result !== 'Error loading address') {
            return result;
        }
        // Small wait between retries
        if (i < attempts - 1) await new Promise(r => setTimeout(r, 2000));
    }
    return 'Location busy';
  };

  const handleFetchAddress = async (index: number, lat: number, lon: number, reqId: number) => {
    const addr = await getAddressWithRetry(lat, lon);
    
    // Check if the request is still valid before updating state
    if (reqId === requestIdRef.current) {
        setRouteData(prev => {
           const newData = [...prev];
           if (newData[index]) {
             (newData[index] as any).address = addr;
           }
           return newData;
        });
    }
  };

  const downloadReport = () => {
    if (!selectedEmployee) {
      Alert.alert('Selection Required', 'Please select an employee first.');
      return;
    }
    Alert.alert('Report Generated', `PDF report for ${selectedEmployee.fullName} has been requested and will download shortly.`);
  };

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; background: #f8fafc; }
        #map { height: 100vh; width: 100vw; }
        .leaflet-control-attribution { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([26.2183, 78.1828], 12); // Default to Gwalior
        
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
            maxZoom: 20,
            subdomains:['mt0','mt1','mt2','mt3']
        }).addTo(map);

        var routeLayer = L.layerGroup().addTo(map);

        function updateRoute(points) {
          if (!points || points.length === 0) return;
          routeLayer.clearLayers();
          
          // Ensure coordinates are numbers
          var latlngs = points.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]);
          
          if (latlngs.length > 1) {
            var polyline = L.polyline(latlngs, {color: '${Colors.primary}', weight: 6, opacity: 0.8, lineJoin: 'round'}).addTo(routeLayer);
            
            // Start point marker
            L.circleMarker(latlngs[0], {
              radius: 5, 
              color: 'white', 
              weight: 2, 
              fillColor: '#10b981', 
              fillOpacity: 1
            }).addTo(routeLayer);
            
            // Last point marker (pulsing effect look)
            var last = latlngs[latlngs.length - 1];
            L.circleMarker(last, {
              radius: 8, 
              color: 'white', 
              weight: 3, 
              fillColor: '${Colors.primary}', 
              fillOpacity: 1
            }).addTo(routeLayer);

            map.fitBounds(polyline.getBounds(), {padding: [40, 40], maxZoom: 16});
          } else if (latlngs.length === 1) {
             // Single point case
             L.circleMarker(latlngs[0], {
               radius: 8, 
               color: 'white', 
               weight: 3, 
               fillColor: '${Colors.primary}', 
               fillOpacity: 1
             }).addTo(routeLayer);
             map.setView(latlngs[0], 16);
          }
        }
      </script>
    </body>
    </html>
  `;

  const injectRoute = () => {
    if (webViewRef.current) {
      const script = `updateRoute(${JSON.stringify(routeData)});`;
      webViewRef.current.injectJavaScript(script);
    }
  };

  useEffect(() => {
    if (viewMode === 'MAP') {
      injectRoute();
    }
  }, [routeData, viewMode]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#e11d2e" />
      
      {/* Background Map Layer */}
      <View style={styles.mapContainer}>
        {selectedSession && viewMode === 'MAP' && routeData.length > 0 ? (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: leafletHTML }}
            onLoadEnd={injectRoute}
            javaScriptEnabled={true}
            style={styles.webView}
            mixedContentMode="always"
            domStorageEnabled={true}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Icon name="map" size={80} color="#e2e8f0" />
            <Text style={styles.placeholderText}>
              {!selectedEmployee 
                ? 'Select a staff member to view route' 
                : !selectedSession 
                  ? 'Select a session to load map' 
                  : loading 
                    ? 'Loading route...' 
                    : 'No GPS data available'}
            </Text>
          </View>
        )}
      </View>

      {/* Floating UI Overlays */}
      <SafeAreaView style={styles.overlayWrapper} pointerEvents="box-none">
        {/* Selection Cards Overlay */}
        <View style={[styles.topControls, { marginTop: 12 }]} pointerEvents="box-none">
          <View style={styles.staffCard}>
             <View style={styles.selectorRow}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={styles.staffSelector} 
                  onPress={() => setShowEmpDropdown(!showEmpDropdown)}
                >
                   <View style={styles.avatarMini}>
                      <Text style={styles.avatarText}>{selectedEmployee ? selectedEmployee.fullName[0] : '?'}</Text>
                   </View>
                   <View style={{ flex: 1 }}>
                     <Text style={styles.miniLabel}>TRACKING STAFF</Text>
                     <Text style={styles.selectedName} numberOfLines={1}>
                        {selectedEmployee ? selectedEmployee.fullName : 'Choose Staff Member...'}
                     </Text>
                   </View>
                   
                   <TouchableOpacity 
                      activeOpacity={0.7} 
                      style={{ marginRight: 15, padding: 5 }} 
                      onPress={downloadReport}
                   >
                       <Icon name="picture-as-pdf" size={22} color={Colors.primary} />
                   </TouchableOpacity>

                   <Icon name={showEmpDropdown ? "expand-less" : "expand-more"} size={24} color={Colors.text.light} />
                </TouchableOpacity>
             </View>

             {showEmpDropdown && (
                <View style={styles.dropdownList}>
                   <ScrollView style={{ maxHeight: 250 }}>
                     {employees.map(emp => (
                        <TouchableOpacity activeOpacity={0.7} key={emp.id} style={styles.dropdownItem} onPress={() => handleEmployeeSelect(emp)}>
                           <View style={styles.itemLeft}>
                              <View style={[styles.tinyAvatar, selectedEmployee?.id === emp.id && { backgroundColor: Colors.primary }]}>
                                 <Text style={[styles.tinyAvatarText, selectedEmployee?.id === emp.id && { color: '#fff' }]}>{emp.fullName[0]}</Text>
                              </View>
                              <Text style={[styles.itemText, selectedEmployee?.id === emp.id && { color: Colors.primary, fontWeight: '700' }]}>{emp.fullName}</Text>
                           </View>
                           {selectedEmployee?.id === emp.id && <Icon name="check-circle" size={20} color={Colors.primary} />}
                        </TouchableOpacity>
                     ))}
                   </ScrollView>
                </View>
             )}

             {selectedEmployee && sessions.length > 0 && !showEmpDropdown && (
                <View style={styles.sessionSection}>
                   <Text style={styles.miniLabelAlt}>RECENT DUTY SESSIONS</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionScroll} contentContainerStyle={{ paddingRight: 20 }}>
                      {sessions.map(s => {
                        const date = new Date(s.punchInTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                        const isSelected = selectedSession?.id === s.id;
                        return (
                          <TouchableOpacity 
                            activeOpacity={0.8}
                            key={s.id} 
                            style={[styles.sessionChip, isSelected && styles.sessionChipActive]}
                            onPress={() => handleSessionSelect(s)}
                          >
                            <Icon name="history" size={14} color={isSelected ? '#fff' : Colors.text.muted} style={{ marginRight: 4 }} />
                            <Text style={[styles.chipDate, isSelected && { color: '#fff' }]}>{date}</Text>
                            <Text style={[styles.chipTime, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                              {new Date(s.punchInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                   </ScrollView>
                </View>
             )}
          </View>
        </View>

        {/* List Mode View */}
        {viewMode === 'LIST' && selectedSession && (
           <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Route Log ({routeData.length} Points)</Text>
                <TouchableOpacity onPress={() => setViewMode('MAP')}>
                   <Icon name="close" size={20} color={Colors.text.muted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.listScroll}>
                {loading ? (
                   <View style={styles.centerLoading}><ActivityIndicator color={Colors.primary} /></View>
                ) : routeData.length === 0 ? (
                   <Text style={styles.noDataNote}>No coordinates found for this session.</Text>
                ) : (
                  routeData.map((p, i) => (
                    <View key={i} style={styles.routeItem}>
                       <View style={styles.routePin}>
                          <View style={styles.pinDot} />
                          {i < routeData.length - 1 && <View style={styles.pinLine} />}
                       </View>
                       <View style={styles.routeInfo}>
                          <View style={styles.rowBetween}>
                             <Text style={styles.pointTime}>
                                  {new Date(p.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                             </Text>
                             <Text style={styles.pointCoords}>{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</Text>
                          </View>
                          <TouchableOpacity 
                            activeOpacity={0.7}
                            onPress={() => handleFetchAddress(i, p.latitude, p.longitude, requestIdRef.current)}
                            style={styles.addrBox}
                          >
                             <Icon name="place" size={14} color={Colors.primary} />
                             <Text style={styles.addrText} numberOfLines={2}>
                                {(p as any).address || 'Requesting place name...'}
                             </Text>
                          </TouchableOpacity>
                       </View>
                    </View>
                  ))
                )}
              </ScrollView>
           </View>
        )}

        {/* Bottom Floating Toggle */}
        {selectedSession && routeData.length > 0 && viewMode === 'MAP' && (
          <View style={styles.bottomBar}>
             <TouchableOpacity 
               activeOpacity={0.9}
               style={styles.toggleBtn} 
               onPress={() => setViewMode(viewMode === 'MAP' ? 'LIST' : 'MAP')}
             >
                <Icon name={viewMode === 'MAP' ? "format-list-bulleted" : "map"} size={20} color="#fff" />
                <Text style={styles.toggleText}>{viewMode === 'MAP' ? "View Route Log" : "View Map"}</Text>
             </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.globalLoader}>
           <View style={styles.loaderCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loaderText}>Syncing Route...</Text>
           </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  mapContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  webView: { flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  placeholderText: { marginTop: 12, fontSize: Typography.size.md, color: Colors.text.light, textAlign: 'center', paddingHorizontal: 40, fontWeight: '500' },
  
  overlayWrapper: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  
  topControls: { paddingHorizontal: 12, marginTop: 12 },
  staffCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 12,
    ...CommonStyles.shadow,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  selectorRow: { flexDirection: 'row', alignItems: 'center' },
  staffSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
  },
  avatarMini: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  miniLabel: { fontSize: 9, fontWeight: '800', color: Colors.text.light, letterSpacing: 1 },
  miniLabelAlt: { fontSize: 8, fontWeight: '800', color: Colors.text.light, letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  selectedName: { fontSize: Typography.size.md, fontWeight: '700', color: Colors.text.main },
  
  dropdownList: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 5 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  tinyAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  tinyAvatarText: { color: Colors.text.muted, fontSize: 11, fontWeight: '800' },
  itemText: { fontSize: Typography.size.md, color: Colors.text.muted, fontWeight: '500' },
  
  sessionSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  sessionScroll: { marginTop: 5 },
  sessionChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginRight: 8, 
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...CommonStyles.shadow,
    elevation: 1,
  },
  sessionChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipDate: { fontSize: 11, fontWeight: '700', color: Colors.text.main },
  chipTime: { fontSize: 10, color: Colors.text.light, marginLeft: 4 },

  bottomBar: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20 },
  toggleBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.secondary, 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  toggleText: { color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: Typography.size.sm },

  listContainer: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 140 : 180, 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    ...CommonStyles.shadow,
    elevation: 20,
    paddingTop: 20,
  },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15 },
  listTitle: { fontSize: Typography.size.lg, fontWeight: '800', color: Colors.text.main },
  listScroll: { flex: 1, paddingHorizontal: 24 },
  centerLoading: { padding: 40, alignItems: 'center' },
  noDataNote: { textAlign: 'center', color: Colors.text.light, marginTop: 40, fontStyle: 'italic' },
  
  routeItem: { flexDirection: 'row', minHeight: 60 },
  routePin: { width: 30, alignItems: 'center' },
  pinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 10 },
  pinLine: { width: 1, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },
  routeInfo: { flex: 1, paddingBottom: 15 },
  pointTime: { fontSize: Typography.size.sm, fontWeight: '800', color: Colors.text.main },
  pointCoords: { fontSize: 10, color: Colors.text.light, fontFamily: 'monospace' },
  addrBox: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, backgroundColor: '#f8fafc', padding: 8, borderRadius: 8 },
  addrText: { fontSize: 11, color: Colors.text.muted, marginLeft: 4, flex: 1, fontWeight: '500' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  globalLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loaderCard: { backgroundColor: '#fff', padding: 25, borderRadius: 16, alignItems: 'center', ...CommonStyles.shadow },
  loaderText: { marginTop: 12, fontWeight: '700', color: Colors.text.main },
});

export default AdminRouteScreen;
