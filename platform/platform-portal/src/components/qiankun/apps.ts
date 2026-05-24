// src/qiankun/apps.ts
import type {MicroAppConfig} from './types';
import {globalActions} from './state';

const isDev = import.meta.env.DEV;

const createMicroApp = (
    name: string,
    devPort: number,
    prodPath: string,
    activeRule: string,
    container: string = '#sub-app-container'
): MicroAppConfig => ({
    name,
    entry: isDev ? `//localhost:${devPort}` : prodPath,
    container,
    activeRule,
    props: {
        basename: activeRule,
        getGlobalState: globalActions.getGlobalState,
        setGlobalState: globalActions.setGlobalState,
        onGlobalStateChange: globalActions.onGlobalStateChange,
    },
});

// 基础应用配置（不受开关控制）
export const baseApps: MicroAppConfig[] = [
    // 平台级
    createMicroApp('platform-auth', 3001, '/platform/platform-auth/', '/platform-auth'),
    // 休闲游戏
    createMicroApp('games-farm', 7001, '/games/games-farm/', '/games-farm', '#games-farm-container'),
];

// 天气应用配置（受开关控制）
// 使用函数作为 activeRule，始终返回 true 以便天气应用始终激活
export const weatherApp: MicroAppConfig = {
    name: 'elemental-weather',
    entry: isDev ? '//localhost:5001' : '/elemental/elemental-weather/',
    container: '#elemental-weather-container',
    activeRule: () => true, // 始终激活
    props: {
        basename: '/elemental-weather',
        getGlobalState: globalActions.getGlobalState,
        setGlobalState: globalActions.setGlobalState,
        onGlobalStateChange: globalActions.onGlobalStateChange,
    },
};

// 根据天气开关获取应用列表
export const getMicroApps = (weatherEnabled: boolean): MicroAppConfig[] => {
    if (weatherEnabled) {
        return [...baseApps, weatherApp];
    }
    return baseApps;
};

export const microApps: MicroAppConfig[] = [
    ...baseApps,
    weatherApp,
];

export const getAllApps = (): MicroAppConfig[] => {
    return microApps;
};

export const getAppByName = (name: string): MicroAppConfig | undefined => {
    return microApps.find(app => app.name === name);
};