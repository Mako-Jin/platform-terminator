import { storage } from '../storage';

const TOKEN_KEY = 'sts-yaocode-platform-auth::token';
const USER_KEY = 'sts-yaocode-platform-auth::user';

export interface UserInfo {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  expireTime: number;
  [key: string]: any;
}

/**
 * 获取用户认证信息
 */
export const getAuth = (): UserInfo | null => {
  const userStr = storage.get(USER_KEY);
  if (!userStr) return null;

  try {
    const user: UserInfo = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;

    // 检查是否过期
    if (Date.now() > user.expireTime) {
      clearAuth();
      return null;
    }

    return user;
  } catch (error) {
    console.error('[Auth] 解析用户信息失败:', error);
    return null;
  }
};

/**
 * 保存认证信息（由 platform-auth 调用）
 */
export const saveAuth = (userInfo: UserInfo): void => {
  storage.set(TOKEN_KEY, userInfo.token || userInfo.id);
  storage.set(USER_KEY, JSON.stringify(userInfo));
};

/**
 * 清除认证信息
 */
export const clearAuth = (): void => {
  storage.remove(TOKEN_KEY);
  storage.remove(USER_KEY);
};

/**
 * 检查是否已认证
 */
export const isAuthenticated = (): boolean => {
  const user = getAuth();
  return !!(user && (user.token || user.id));
};

/**
 * 获取用户权限列表
 */
export const getPermissions = (): string[] => {
  const user = getAuth();
  return user?.permissions || [];
};

/**
 * 检查是否有指定权限
 */
export const hasPermission = (permission: string): boolean => {
  const permissions = getPermissions();
  return permissions.includes(permission) || permissions.includes('*');
};

/**
 * 检查是否有任一权限
 */
export const hasAnyPermission = (permissions: string[]): boolean => {
  const userPermissions = getPermissions();
  return permissions.some(p => userPermissions.includes(p) || userPermissions.includes('*'));
};

/**
 * 检查是否有所有权限
 */
export const hasAllPermissions = (permissions: string[]): boolean => {
  const userPermissions = getPermissions();
  return permissions.every(p => userPermissions.includes(p) || userPermissions.includes('*'));
};

/**
 * 获取 Token
 */
export const getToken = (): string | null => {
  return storage.get(TOKEN_KEY);
};
