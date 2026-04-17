const TOKEN_KEY = 'app:token';
const USER_KEY = 'app:user';

// 获取乾坤全局状态
export const getGlobalState = () => {
    const globalState = (window as any).__QIANKUN_GLOBAL_STATE__;
    if (globalState?.getGlobalState) {
        return globalState.getGlobalState();
    }
    return null;
};

// 设置乾坤全局状态
export const setGlobalState = (state: any) => {
    const globalState = (window as any).__QIANKUN_GLOBAL_STATE__;
    if (globalState?.setGlobalState) {
        globalState.setGlobalState(state);
    }
};

// 保存认证信息
export const saveAuth = (userInfo: UserInfo) => {
    localStorage.setItem(TOKEN_KEY, userInfo.token);
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
};

// 获取用户信息
export const getUserInfo = (): UserInfo | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
};

// 获取用户权限列表
export const getPermissions = (): string[] => {
    const user = getUserInfo();
    return user?.permissions || [];
};

// 检查是否有指定权限
export const hasPermission = (permissionCode: string): boolean => {
    const permissions = getPermissions();
    return permissions.includes('*') || permissions.includes(permissionCode);
};

// 检查是否有任一权限
export const hasAnyPermission = (permissionCodes: string[]): boolean => {
    const permissions = getPermissions();
    if (permissions.includes('*')) return true;
    return permissionCodes.some(code => permissions.includes(code));
};

// 检查是否有所有权限
export const hasAllPermissions = (permissionCodes: string[]): boolean => {
    const permissions = getPermissions();
    if (permissions.includes('*')) return true;
    return permissionCodes.every(code => permissions.includes(code));
};

// 清除认证信息
export const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

// 检查是否已认证
export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem(TOKEN_KEY);
    return !!token;
};

// 登录接口
export const login = async (username: string, password: string): Promise<{
    success: boolean;
    message?: string;
    userInfo?: UserInfo;
}> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (username && password) {
                const userInfo: UserInfo = {
                    userId: '001',
                    username,
                    realName: username === 'admin' ? '管理员' : '用户',
                    token: `mock_token_${Date.now()}`,
                    loginTime: Date.now(),
                    expireTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
                    roleId: username === 'admin' ? 'admin' : 'user',
                    roleName: username === 'admin' ? '系统管理员' : '普通用户',
                    permissions: username === 'admin'
                        ? ['*']
                        : ['business:view', 'report:view'],
                };

                saveAuth(userInfo);

                resolve({
                    success: true,
                    userInfo,
                });
            } else {
                resolve({
                    success: false,
                    message: '用户名或密码错误',
                });
            }
        }, 1000);
    });
};

// 登出
export const logout = () => {
    clearAuth();
    setGlobalState({ user: null, isLogin: false });
};
