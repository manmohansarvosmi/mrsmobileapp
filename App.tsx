import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screen/login/LoginScreen';
import EmployeeDashboardScreen from './src/screen/employee/EmployeeDashboardScreen';
import EmployeeCalendarScreen from './src/screen/employee/EmployeeCalendarScreen';
import EmployeeProfileScreen from './src/screen/employee/EmployeeProfileScreen';
import EmployeeRouteScreen from './src/screen/employee/EmployeeRouteScreen';
import SalaryScreen from './src/screen/employee/SalaryScreen';
import AdminTabNavigator from './src/navigation/AdminTabNavigator';
import InventoryListScreen from './src/screen/admin/InventoryListScreen';
import InvoiceListScreen from './src/screen/admin/InvoiceListScreen';
import EstimationListScreen from './src/screen/admin/EstimationListScreen';
import PurchaseOrderListScreen from './src/screen/admin/PurchaseOrderListScreen';
import CreateInvoiceScreen from './src/screen/admin/CreateInvoiceScreen';
import CreatePOScreen from './src/screen/admin/CreatePOScreen';
import AdminProfileScreen from './src/screen/admin/AdminProfileScreen';
import { navigationRef } from './src/service/navigationRef';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Calendar: undefined;
  Profile: undefined;
  Route: { attendanceId: number };
  Salary: undefined;
  AdminMain: undefined; // New top-level admin screen
  AdminDashboard: undefined;
  AdminInventory: undefined;
  AdminSalary: undefined;
  AdminAttendance: undefined;
  AdminRoute: undefined;
  InventoryList: undefined;
  InvoiceList: undefined;
  EstimationList: undefined;
  PurchaseOrderList: undefined;
  CreateInvoice: { type: 'INVOICE' | 'ESTIMATION' };
  CreatePO: undefined;
  AdminProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Dashboard' | 'AdminMain'>('Login');

  useEffect(() => {
    // Check for persisted token on every app launch
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');
        
        if (token) {
          if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
            setInitialRoute('AdminMain');
          } else {
            setInitialRoute('Dashboard');
          }
        } else {
          setInitialRoute('Login');
        }
      } catch {
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Show a branded splash/loading screen while checking token
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#b8001d" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#e11d2e" translucent={false} />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, animation: 'fade' }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={EmployeeDashboardScreen} />
          <Stack.Screen name="Calendar" component={EmployeeCalendarScreen} />
          <Stack.Screen name="Profile" component={EmployeeProfileScreen} />
          <Stack.Screen name="Route" component={EmployeeRouteScreen} />
          <Stack.Screen name="Salary" component={SalaryScreen} />
          
          {/* Admin Tab System */}
          <Stack.Screen name="AdminMain" component={AdminTabNavigator} />
          
          {/* Inventory Sub-screens */}
          <Stack.Screen name="InventoryList" component={InventoryListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EstimationList" component={EstimationListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PurchaseOrderList" component={PurchaseOrderListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreatePO" component={CreatePOScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminProfile" component={AdminProfileScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
