// types/auth.ts

export interface UserInfo {
    userId?: string;
    username: string;
    realName?: string;
    token: string;
    loginTime: number;
    expireTime?: number;
    roleId?: string;
    roleName?: string;
    permissions?: string[];
}

// 认证相关的工具函数
export const AUTH_KEY = 'auth_user_info';
