import api from './api';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  designation: string;
  role: string;
  fathersName?: string;
  department?: string;
  mobileNumber?: string;
  joiningDate?: string;
  aadharCardNo?: string;
  panCardNo?: string;
  aadharCardImage?: string;
  panCardImage?: string;
  organization?: {
    id: number;
    organizationName: string;
  };
}

export interface UserListResponse {
  status: number;
  code: number;
  message: string;
  data: User[];
}

export interface UserResponse {
  status: number;
  code: number;
  message: string;
  data: User;
}

/**
 * GET /api/users/getAllUsers
 * Returns a list of all users.
 */
export const getAllUsers = async (): Promise<User[]> => {
  const response = await api.get<UserListResponse>('/users/getAllUsers');
  return response.data.data;
};

/**
 * GET /api/users/getUsersById/{id}
 * Returns a specific user by ID.
 */
export const getUserById = async (id: number): Promise<User> => {
  const response = await api.get<UserResponse>(`/users/getUsersById/${id}`);
  return response.data.data;
};
/**
 * POST /api/users/updateUserById/{id}
 * Updates an existing user.
 */
export const updateUser = async (id: number, userData: Partial<User>): Promise<User> => {
  const response = await api.post<UserResponse>(`/users/updateUserById/${id}`, userData);
  return response.data.data;
};
