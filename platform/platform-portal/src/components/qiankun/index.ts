import {registerMicroApps, start, loadMicroApp} from 'qiankun';
import type {QiankunStartOptions} from './types';
import {baseApps, weatherApp, getMicroApps} from './apps';
import {lifecycleHooks} from './lifecycles';
import {LoggerFactory} from 'common-tools';

const Logger = LoggerFactory.create("qiankun");

let isStarted = false;
let currentWeatherEnabled = true;

// 获取应用配置（带沙箱配置）
const getAppsWithSandbox = (apps: typeof baseApps) => {
    return apps.map(app => ({
        ...app,
        // 对于 Vite 应用，禁用沙箱
        sandbox: false,
        // 过滤掉 React Refresh 的脚本
        excludeAssetFilter: (url: string) => {
            return url.includes('react-refresh') || url.includes('@react-refresh');
        },
    }));
};

// 注册应用的生命周期钩子
const registerLifecycleHooks = (apps: typeof baseApps) => {
    registerMicroApps(apps, {
        beforeLoad: lifecycleHooks.beforeLoad ? [lifecycleHooks.beforeLoad] : [],
        beforeMount: lifecycleHooks.beforeMount ? [lifecycleHooks.beforeMount] : [],
        afterMount: lifecycleHooks.afterMount ? [lifecycleHooks.afterMount] : [],
        beforeUnmount: lifecycleHooks.beforeUnmount ? [lifecycleHooks.beforeUnmount] : [],
        afterUnmount: lifecycleHooks.afterUnmount ? [lifecycleHooks.afterUnmount] : [],
    });

    apps.forEach(app => {
        if (lifecycleHooks.loadError) {
            registerMicroApps([app], {
                loadError: (err: Error) => lifecycleHooks.loadError!(err, app),
            });
        }
    });
};

export const registerApps = (weatherEnabled: boolean = true): void => {
    const apps = getMicroApps(weatherEnabled);

    if (apps.length === 0) {
        Logger.warn('[Qiankun] 没有可注册的子应用');
        return;
    }

    Logger.info('[Qiankun] 注册子应用:', apps.map(app => app.name));

    // 为每个应用配置独立的沙箱选项
    const appsWithSandboxConfig = getAppsWithSandbox(apps);

    registerLifecycleHooks(appsWithSandboxConfig);
    currentWeatherEnabled = weatherEnabled;
};

// 存储已加载的微应用实例
let weatherAppInstance: ReturnType<typeof loadMicroApp> | null = null;

/**
 * 切换天气应用状态
 * @param enabled 是否启用天气
 */
export const toggleWeatherApp = async (enabled: boolean): Promise<void> => {
    if (enabled === currentWeatherEnabled) {
        Logger.info('[Qiankun] 天气应用状态未变化:', enabled);
        return;
    }

    if (enabled) {
        // 启用天气应用
        Logger.info('[Qiankun] 启用天气应用');
        const weatherWithSandbox = getAppsWithSandbox([weatherApp]);
        registerLifecycleHooks(weatherWithSandbox);
        
        // 尝试挂载天气应用
        try {
            weatherAppInstance = loadMicroApp(weatherWithSandbox[0]);
            await weatherAppInstance.mountPromise;
            Logger.success('[Qiankun] 天气应用已启用');
        } catch (error) {
            Logger.error('[Qiankun] 启用天气应用失败:', error);
        }
    } else {
        // 禁用天气应用
        Logger.info('[Qiankun] 禁用天气应用');
        try {
            if (weatherAppInstance) {
                await weatherAppInstance.unmount();
                weatherAppInstance = null;
            }
            Logger.success('[Qiankun] 天气应用已禁用');
        } catch (error) {
            Logger.error('[Qiankun] 禁用天气应用失败:', error);
        }
    }
    
    currentWeatherEnabled = enabled;
};

export const startQiankun = async (options?: QiankunStartOptions & { weatherEnabled?: boolean }): Promise<void> => {
    if (isStarted) {
        Logger.warn('[Qiankun] 乾坤已经启动，跳过重复启动');
        return;
    }

    try {
        // 根据天气开关注册应用
        const weatherEnabled = options?.weatherEnabled ?? true;
        registerApps(weatherEnabled);

        start({
            prefetch: options?.prefetch ?? 'all',
            sandbox: {
                strictStyleIsolation: false,
                experimentalStyleIsolation: true,
            },
            singular: false,
        });

        isStarted = true;
        Logger.success('[Qiankun] 乾坤已成功启动');
    } catch (error) {
        Logger.error('[Qiankun] 启动失败:', error);
        if (error instanceof Error && error.message.includes('already started')) {
            Logger.warn('[Qiankun] 乾坤已经被启动过了');
            isStarted = true;
        } else {
            throw error;
        }
    }
};

export { globalActions } from './state';
export type { MicroAppConfig, LifecycleHooks, QiankunStartOptions } from './types';