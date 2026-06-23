import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Platform, StyleSheet, Text, View } from 'react-native';

import AdminDashboardScreen from '../screen/admin/AdminDashboardScreen';
import AdminInventoryScreen from '../screen/admin/AdminInventoryScreen';
import AdminSalaryScreen from '../screen/admin/AdminSalaryScreen';
import AdminAttendanceScreen from '../screen/admin/AdminAttendanceScreen';
import AdminRouteScreen from '../screen/admin/AdminRouteScreen';
import EmployeeProfileScreen from '../screen/employee/EmployeeProfileScreen';

const Tab = createBottomTabNavigator();

const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';

          if (route.name === 'AdminDashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'AdminAttendance') {
            iconName = 'event';
          } else if (route.name === 'AdminRoute') {
            iconName = 'near-me';
          } else if (route.name === 'AdminInventory') {
            iconName = 'archive';
          } else if (route.name === 'AdminSalary') {
            iconName = 'payments';
          }

          return <Icon name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#b8001d',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen 
        name="AdminDashboard" 
        component={AdminDashboardScreen} 
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="AdminInventory" 
        component={AdminInventoryScreen} 
        options={{ tabBarLabel: 'Inventory' }}
      />
      <Tab.Screen 
        name="AdminSalary" 
        component={AdminSalaryScreen} 
        options={{ tabBarLabel: 'Salary' }}
      />
      <Tab.Screen 
        name="AdminAttendance" 
        component={AdminAttendanceScreen} 
        options={{ tabBarLabel: 'Logs' }}
      />
      <Tab.Screen 
        name="AdminRoute" 
        component={AdminRouteScreen} 
        options={{ tabBarLabel: 'Map' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: Platform.OS === 'ios' ? 0 : 0,
  },
});

export default AdminTabNavigator;
