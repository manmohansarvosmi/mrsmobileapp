import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceResponse {
  status: number;
  code: number;
  message: string;
  data: {
    id: number;
    punchInTime: string | null;
    punchOutTime: string | null;
    status: 'ACTIVE' | 'COMPLETED';
  };
}

export interface LocationUpdateResponse {
  status: number;
  code: number;
  message: string;
  data: {
    id: number;
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

export interface RouteResponse {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface RouteListResponse {
  status: number;
  code: number;
  message: string;
  data: RouteResponse[];
}

// ─── Punch In ─────────────────────────────────────────────────────────────────
// POST /api/attendance/punch-in  Body: { "punch": "PUNCH_IN" }
export const punchIn = async (): Promise<AttendanceResponse> => {
  const response = await api.post<AttendanceResponse>('/attendance/punch-in', {
    punch: 'PUNCH_IN',
  });
  return response.data;
};

// ─── Punch Out ────────────────────────────────────────────────────────────────
// POST /api/attendance/punch-out  Body: { "punch": "PUNCH_OUT" }
export const punchOut = async (): Promise<AttendanceResponse> => {
  const response = await api.post<AttendanceResponse>('/attendance/punch-out', {
    punch: 'PUNCH_OUT',
  });
  return response.data;
};

// ─── Update Location ──────────────────────────────────────────────────────────
// POST /api/location/update  Body: { latitude, longitude, timestamp }
export const updateLocation = async (
  latitude: number,
  longitude: number,
): Promise<LocationUpdateResponse | null> => {
  try {
    const response = await api.post<LocationUpdateResponse>('/location/update', {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    });
    console.log("Update Location Success:", response.data.message);
    return response.data;
  } catch (error: any) {
    console.error("Update Location Failed:", error.response?.data || error.message);
    return null;
  }
};

// ─── Get Route ────────────────────────────────────────────────────────────────
// GET /api/location/route?employeeId={employeeId}&attendanceId={attendanceId}
export const getRoute = async (
  employeeId: number,
  attendanceId: number,
): Promise<RouteResponse[]> => {
  const response = await api.get<RouteListResponse>(
    '/location/route',
    { params: { employeeId, attendanceId } },
  );
  return response.data.data;
};
