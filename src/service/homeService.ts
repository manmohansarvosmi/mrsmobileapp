import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayAttendance {
  day: string;      // "M" | "T" | "W" | "T" | "F" | "S" | "S"
  hours: number;
  present: boolean;
}

export interface RecentActivity {
  attendanceId: number;
  dateLabel: string;         // e.g. "Oct 23, Mon"
  punchInTime: string;       // ISO datetime
  punchOutTime: string | null;
  totalHours: number;
  status: 'ON_TIME' | 'LATE';
}

export interface HomeDashboard {
  // User info
  fullName: string;
  designation: string | null;
  organizationName: string | null;

  // Work session
  hasActiveSession: boolean;
  activeAttendanceId: number | null;
  punchInTime: string | null;    // ISO datetime
  punchOutTime: string | null;   // ISO datetime
  sessionStatus: 'ACTIVE' | 'COMPLETED' | null;

  // Weekly chart
  weeklyAttendance: DayAttendance[];

  // Recent activity
  recentActivity: RecentActivity[];
}

export interface HomeResponse {
  status: number;
  code: number;
  message: string;
  data: HomeDashboard;
}

// ─── API call ─────────────────────────────────────────────────────────────────

/**
 * GET /api/home/dashboard
 * Returns all data needed to render the Home screen.
 */
export const getHomeDashboard = async (): Promise<HomeDashboard> => {
  const response = await api.get<HomeResponse>('/home/dashboard');
  return response.data.data;
};
