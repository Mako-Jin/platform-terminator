// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {clearAuth, getAuth, saveAuth} from "/@types/auth";
import type {UserInfo} from "/@types/auth";
// import { UserInfo, getAuth, saveAuth, clearAuth, isAuthenticated } from '/@types/auth';

interface AuthContextType {
    user: UserInfo | null;
    isAuth: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 初始化时检查本地存储
        const authUser = getAuth();
        setUser(authUser);
        setLoading(false);
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        // 模拟登录请求
        return new Promise((resolve) => {
            setTimeout(() => {
                if (username && password) {
                    const userInfo: UserInfo = {
                        username,
                        token: `mock_token_${Date.now()}_${Math.random()}`,
                        loginTime: Date.now(),
                    };
                    saveAuth(userInfo);
                    setUser(userInfo);
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 500);
        });
    };

    const logout = () => {
        clearAuth();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuth: !!user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
