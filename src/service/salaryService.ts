import api from './api';

export interface SalaryConfig {
  id: number;
  userId: number;
  baseSalary: number;
  bonus: number;
  incentive?: number;
  workingDaysPerMonth: number;
  shiftStart: string;
  shiftEnd: string;
  allowedLeavesPerMonth: number;
  extraLeavePenaltyPerDay: number;
  latePunchCharge: number;
}

export interface PayrollRecord {
  id: number;
  month: string;
  totalDaysInMonth: number;
  daysPresent: number;
  grossSalary: number;
  deductions: number;
  incentive?: number;
  netSalary: number;
  status: string;
  generatedAt: string;
  user?: {
    id: number;
    fullName: string;
    username: string;
  };
}

export interface PaySlipData {
  payroll: PayrollRecord;
  config: SalaryConfig;
  organizationName: string;
}

export const getSalaryConfig = async (userId: number) => {
  const response = await api.get(`/salary/config/${userId}`);
  return response.data?.data;
};

export const saveSalaryConfig = async (config: any) => {
  const response = await api.post('/salary/config', config);
  return response.data?.data;
};

export const generatePayroll = async (month: string) => {
  const response = await api.post(`/salary/generate?month=${month}`);
  return response.data?.data;
};

export const getPayrollRecords = async (month: string) => {
  const response = await api.get(`/salary/records?month=${month}`);
  return response.data?.data;
};

export const getEmployeePayrollHistory = async () => {
  const response = await api.get('/salary/records/me');
  return response.data?.data;
};

export const getAttendanceDetails = async (userId: number, month: string) => {
  const response = await api.get(`/salary/attendance?userId=${userId}&month=${month}`);
  return response.data?.data;
};

export const getPaySlip = async (payrollId: number) => {
  const response = await api.get(`/salary/payslip/${payrollId}`);
  return response.data?.data;
};

export const updatePayrollStatus = async (payrollId: number, status: string) => {
  const response = await api.put(`/salary/payroll/${payrollId}/status?status=${status}`);
  return response.data?.data;
};

export const getAllSalaryConfigs = async () => {
  const response = await api.get('/salary/config');
  return response.data?.data;
};
