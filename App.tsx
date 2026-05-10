import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screen/login/LoginScreen';
import EmployeeDashboardScreen from './src/screen/employee/EmployeeDashboardScreen';
import EmployeeCalendarScreen from './src/screen/employee/EmployeeCalendarScreen';
import EmployeeProfileScreen from './src/screen/employee/EmployeeProfileScreen';
import EmployeeRouteScreen from './src/screen/employee/EmployeeRouteScreen';
import SalaryScreen from './src/screen/employee/SalaryScreen';
import { navigationRef } from './src/service/navigationRef';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Calendar: undefined;
  Profile: undefined;
  Route: { attendanceId: number };
  Salary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Dashboard'>('Login');

  useEffect(() => {
    // Check for persisted token on every app launch
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setInitialRoute('Dashboard');
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
