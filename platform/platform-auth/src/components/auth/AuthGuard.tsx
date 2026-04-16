// components/AuthGuard.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface AuthGuardProps {
    children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isAuth, loading } = useAuth();

    if (loading) {
        // 加载中显示 Loading 组件
        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                background: '#0a0a0a',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#d4af37'
            }}>
                ⚜️ 验证中...
            </div>
        );
    }

    // if (!isAuth) {
    //     return <Navigate to="/login" replace />;
    // }

    return <>{children}</>;
};

export default AuthGuard;
