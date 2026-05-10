import api from './api';

export interface SalaryConfig {
  id: number;
  userId: number;
  baseSalary: number;
  bonus: number;
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
  netSalary: number;
  status: string;
  generatedAt: string;
}

export interface PaySlipData {
  payroll: PayrollRecord;
  config: SalaryConfig;
  organizationName: string;
}

export const getSalaryConfig = async (userId: number) => {
  const response = await api.get(`/salary/config/${userId}`);
  return response.data;
};

export const saveSalaryConfig = async (config: any) => {
  const response = await api.post('/salary/config', config);
  return response.data;
};

export const generatePayroll = async (month: string) => {
  const response = await api.post(`/salary/generate?month=${month}`);
  return response.data;
};

export const getPayrollRecords = async (month: string) => {
  const response = await api.get(`/salary/records?month=${month}`);
  return response.data;
};

export const getAttendanceDetails = async (userId: number, month: string) => {
  const response = await api.get(`/salary/attendance?userId=${userId}&month=${month}`);
  return response.data;
};

export const getPaySlip = async (payrollId: number) => {
  const response = await api.get(`/salary/payslip/${payrollId}`);
  return response.data;
};

export const updatePayrollStatus = async (payrollId: number, status: string) => {
  const response = await api.put(`/salary/payroll/${payrollId}/status?status=${status}`);
  return response.data;
};
