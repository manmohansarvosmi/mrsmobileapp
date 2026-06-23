import api from './api';
import { User } from './userService';

export interface AdminStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
}

export interface TodayAttendance {
  employeeId: number;
  fullName: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  lateDuration?: string;
}

export interface AdminDashboardData {
  stats: AdminStats;
  todayList: TodayAttendance[];
  inventory?: {
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
  };
}

export const getAdminDashboard = async (date?: string): Promise<AdminDashboardData> => {
  try {
    const url = date ? `/admin/dashboard?date=${date}` : '/admin/dashboard';
    const response = await api.get(url);
    return response.data?.data || { stats: { totalEmployees: 0, presentToday: 0, absentToday: 0, lateToday: 0 }, todayList: [] };
  } catch (error) {
    console.error('getAdminDashboard Error:', error);
    return { stats: { totalEmployees: 0, presentToday: 0, absentToday: 0, lateToday: 0 }, todayList: [] };
  }
};

export const getEmployeeMonthlyAttendance = async (employeeId: number, month: string) => {
  const response = await api.get(`/admin/employee-attendance?employeeId=${employeeId}&month=${month}`);
  return response.data.data;
};

export const getAllEmployees = async (): Promise<User[]> => {
  const response = await api.get('/users/getAllUsers');
  return response.data.data;
};

export const getRecentAttendance = async (userId: number) => {
  const response = await api.get(`/attendance/recent/${userId}`);
  return response.data.data;
};
