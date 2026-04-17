// src/qiankun/apps.ts
import { registerMicroApps, initGlobalState } from 'qiankun';
import type { MicroApp } from 'qiankun';
import { getAuth } from '/@/utils/auth';

// 全局状态初始值
export const initialState = {
    user: getAuth(),
    isLogin: !!getAuth(),
    theme: 'dark',
    locale: 'zh-CN',
};

// 创建全局状态
export const globalActions = initGlobalState(initialState);

// 子应用列表配置
export const microApps = [
    {
        name: 'platform-auth',
        entry: process.env.NODE_ENV === 'development'
            ? '//localhost:3001'  // 开发环境
            : '/platform/platform-auth/',  // 生产环境
        container: '#subapp-container',
        activeRule: '/platform-auth',
        props: {
            basename: '/platform-auth',
            getGlobalState: globalActions.getGlobalState,
            setGlobalState: globalActions.setGlobalState,
            onGlobalStateChange: globalActions.onGlobalStateChange,
        },
    },
    // 业务子应用示例
    {
        name: 'business-app',
        entry: process.env.NODE_ENV === 'development'
            ? '//localhost:3002'
            : '/apps/business-app/',
        container: '#subapp-container',
        activeRule: '/business',
        props: {
            basename: '/business',
            getGlobalState: globalActions.getGlobalState,
            setGlobalState: globalActions.setGlobalState,
            onGlobalStateChange: globalActions.onGlobalStateChange,
        },
    },
    // 报表子应用示例
    {
        name: 'report-app',
        entry: process.env.NODE_ENV === 'development'
            ? '//localhost:3003'
            : '/apps/report-app/',
        container: '#subapp-container',
        activeRule: '/report',
        props: {
            basename: '/report',
            getGlobalState: globalActions.getGlobalState,
            setGlobalState: globalActions.setGlobalState,
            onGlobalStateChange: globalActions.onGlobalStateChange,
        },
    },
    // 管理后台子应用示例
    {
        name: 'admin-app',
        entry: process.env.NODE_ENV === 'development'
            ? '//localhost:3004'
            : '/apps/admin-app/',
        container: '#subapp-container',
        activeRule: '/admin',
        props: {
            basename: '/admin',
            getGlobalState: globalActions.getGlobalState,
            setGlobalState: globalActions.setGlobalState,
            onGlobalStateChange: globalActions.onGlobalStateChange,
        },
    },
];

// 根据权限动态获取子应用列表
export const getSystems = () => {
    // 根据用户权限过滤子应用
    const permissionMap: Record<string, string[]> = {
        'business:view': ['business-app'],
        'report:view': ['report-app'],
        'admin:all': ['admin-app'],
    };

    const allowedAppNames = new Set<string>();

    // permissions.forEach(permission => {
    //     const apps = permissionMap[permission];
    //     if (apps) {
    //         apps.forEach(app => allowedAppNames.add(app));
    //     }
    // });

    // 登录应用始终可用
    allowedAppNames.add('platform-auth');

    return microApps.filter(app => allowedAppNames.has(app.name));
};
