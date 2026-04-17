// App.tsx (更新版本，包含loading)
import React from 'react';
import './App.scss';

import { BrowserRouter } from 'react-router-dom';
import AuthGuard from "./components/auth/AuthGuard";
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

// 主应用组件
const App: React.FC = () => {
    // 判断是否在乾坤环境中
    const isInQiankun = qiankunWindow.__POWERED_BY_QIANKUN__;

    // 如果在乾坤中，不需要 BrowserRouter（由基座控制路由）
    if (isInQiankun) {
        return <AuthGuard></AuthGuard>;
    }

    // 独立运行时，使用 BrowserRouter
    return (
        <BrowserRouter basename="/platform-auth">
            <AuthGuard></AuthGuard>
        </BrowserRouter>
    );
};

export default App;
