const TOKEN_KEY = 'app:token';
const USER_KEY = 'app:user';

// 获取用户信息
export const getAuth = () => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
        const user = JSON.parse(userStr);
        // 检查是否过期
        if (Date.now() > user.expireTime) {
            clearAuth();
            return null;
        }
        return user;
    } catch {
        return null;
    }
};

// 保存认证信息
export const saveAuth = (userInfo) => {
    localStorage.setItem(TOKEN_KEY, userInfo.token);
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
};

// 清除认证信息
export const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

// 检查是否已认证
export const isAuthenticated = (): boolean => {
    const user = getAuth();
    return !!user && !!user.token;
};

// 获取用户权限
export const getPermissions = (): string[] => {
    const user = getAuth();
    return user?.permissions || [];
};
