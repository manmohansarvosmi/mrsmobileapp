import api from './api';

export interface Item {
  id: number;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  category?: string;
  unit?: string;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
}

export interface InvoiceItem {
  id: number;
  name: string;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  profitPercentage: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  date: string;
  totalAmount: number;
  status: 'PAID' | 'UNPAID' | 'OVERDUE' | 'PENDING';
  itemCount: number;
  profitAmount: number;
  items?: InvoiceItem[];
}

export interface EstimationItem {
  id: number;
  name: string;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  profitPercentage: string;
}

export interface Estimation {
  id: number;
  estimationNumber: string;
  customerName: string;
  date: string;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED';
  itemCount: number;
  profitAmount: number;
  items?: EstimationItem[];
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendorName: string;
  date: string;
  totalAmount: number;
  status: 'PENDING' | 'ORDERED' | 'RECEIVED';
}

// Stats for Dashboard
export const getInventoryStats = async (): Promise<InventoryStats> => {
  try {
    const response = await api.get('/admin/inventory-dashboard');
    return response.data.data;
  } catch (error) {
    console.error('getInventoryStats Error:', error);
    return { totalItems: 0, totalValue: 0, lowStockItems: 0 };
  }
};

// Items/Products
export const getItems = async (): Promise<any[]> => {
  const response = await api.get('/inventory/products');
  return response.data.data;
};

// Invoices (Sales)
export const getInvoices = async () => {
  const response = await api.get('/inventory/sales');
  return response.data.data;
};

export const createInvoice = async (data: any) => {
  const response = await api.post('/inventory/sales', data);
  return response.data;
};

// Estimations
export const getEstimations = async () => {
  const response = await api.get('/sales/estimates');
  return response.data.data;
};

export const createEstimation = async (data: any) => {
  const response = await api.post('/sales/estimates', data);
  return response.data;
};

// Purchase Orders (Purchases)
export const getPurchaseOrders = async () => {
  const response = await api.get('/inventory/purchases');
  return response.data.data;
};

export const createPurchaseOrder = async (data: any) => {
  const response = await api.post('/inventory/purchases', data);
  return response.data;
};

// Auxiliary Data
export const getAccounts = async () => {
  const response = await api.get('/accounts');
  return response.data.data;
};

export const getCustomers = async () => {
  const response = await api.get('/sales/customers');
  return response.data.data;
};
