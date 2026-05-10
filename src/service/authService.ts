import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginResponse {
  token: string;
  status: number;
  id: number;
  massage: string; // matches API typo
  code: number;
  userRole: string;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', { username, password });
      const data = response.data;

      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
      }

      if (data.userRole) {
        await AsyncStorage.setItem('userRole', data.userRole);
      }

      if (data.id) {
        await AsyncStorage.setItem('userId', data.id.toString());
      }

      // Save full response as userInfo for later use
      await AsyncStorage.setItem('userInfo', JSON.stringify(data));

      return data;
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userInfo');
  },

  getToken: async () => {
    return await AsyncStorage.getItem('userToken');
  },

  getUserRole: async () => {
    return await AsyncStorage.getItem('userRole');
  }
};
