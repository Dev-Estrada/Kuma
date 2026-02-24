export interface User {
  id: number;
  username: string;
  displayName?: string | null;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export interface UserCreate {
  username: string;
  password: string;
  displayName?: string;
  role?: 'admin' | 'user';
}

export interface UserUpdate {
  displayName?: string;
  password?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
}
