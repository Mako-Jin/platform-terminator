// types/auth.ts
export interface UserInfo {
    username: string;
    token: string;
    loginTime: number;
}

// 认证相关的工具函数
export const AUTH_KEY = 'auth_user_info';

// 保存用户信息到 localStorage
export const saveAuth = (userInfo: UserInfo): void => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(userInfo));
};

// 获取用户信息
export const getAuth = (): UserInfo | null => {
    const authStr = localStorage.getItem(AUTH_KEY);
    if (!authStr) return null;
    try {
        const auth = JSON.parse(authStr) as UserInfo;
        // 可选：检查登录是否过期（例如7天）
        const isExpired = Date.now() - auth.loginTime > 7 * 24 * 60 * 60 * 1000;
        if (isExpired) {
            clearAuth();
            return null;
        }
        return auth;
    } catch {
        return null;
    }
};

// 清除认证信息
export const clearAuth = (): void => {
    localStorage.removeItem(AUTH_KEY);
};

// 检查是否已认证
export const isAuthenticated = (): boolean => {
    return getAuth() !== null;
};
