// src/qiankun/apps.ts
import type { MicroAppConfig } from './types';
import { globalActions } from './state';
import { LoggerFactory } from 'common-tools';

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

export const microApps: MicroAppConfig[] = [
    // 平台级
    createMicroApp('platform-auth', 3001, '/platform/platform-auth/', '/platform-auth'),
    // 系统元素
    createMicroApp('elemental-weather', 5001, '/elemental/elemental-weather/', '/elemental-weather', '#elemental-weather-container'),
    // 休闲游戏
    createMicroApp('games-farm', 7001, '/games/games-farm/', '/games-farm', '#games-farm-container'),
];

export const getAllApps = (): MicroAppConfig[] => {
    return microApps;
};

export const getAppByName = (name: string): MicroAppConfig | undefined => {
    return microApps.find(app => app.name === name);
};
