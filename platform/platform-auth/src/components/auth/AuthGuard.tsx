// components/AuthGuard.tsx
import React, {useEffect, useState} from 'react';

import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { isAuthenticated, getGlobalState } from '../../utils/auth';

interface AuthGuardProps {
    children: React.ReactNode;
    redirectUrl?: string;  // 未登录时跳转的路径，默认 /login
    loadingComponent?: React.ReactNode;  // 自定义加载组件
}

const AuthGuard: React.FC<AuthGuardProps> = ({
     children,
     redirectUrl = '/login',
     loadingComponent
 }) => {

    const [loading, setLoading] = useState(true);
    const [hasAuth, setHasAuth] = useState(false);

    useEffect(() => {

        const checkAuth = async () => {
            // 1. 检查乾坤全局状态
            const globalState = getGlobalState();
            if (globalState?.user) {
                setHasAuth(true);
                setLoading(false);
                return;
            }

            // 2. 检查本地存储
            if (isAuthenticated()) {
                setHasAuth(true);
                setLoading(false);
                return;
            }

            // 3. 未认证，跳转到登录页
            const currentUrl = encodeURIComponent(window.location.href);
            const loginUrl = redirectUrl.startsWith('/')
                ? `${redirectUrl}?redirect=${currentUrl}`
                : `${redirectUrl}?redirect=${currentUrl}`;

            // 在乾坤环境中，使用 window.location.href 跳转
            if (qiankunWindow.__POWERED_BY_QIANKUN__) {
                window.location.href = loginUrl;
            } else {
                // 独立运行时，使用路由跳转
                // 这里需要根据实际情况处理
                window.location.href = loginUrl;
            }

            setHasAuth(false);
            setLoading(false);
        };

        checkAuth().then();
    }, [redirectUrl]);

    if (loading) {
        return loadingComponent || (
            <div style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#0a0a0a',
                color: '#d4af37'
            }}>
                ⚜️ 验证中...
            </div>
        );
    }

    if (!hasAuth) {
        return null; // 正在跳转，不渲染内容
    }

    return <>{children}</>;
};

export default AuthGuard;
