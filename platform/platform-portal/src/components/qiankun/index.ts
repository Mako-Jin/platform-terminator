import { registerMicroApps, start } from 'qiankun';
import type { QiankunStartOptions } from './types';
import { getAllApps } from './apps';
import { lifecycleHooks } from './lifecycles';
import { LoggerFactory } from 'common-tools';

const Logger = LoggerFactory.create("qiankun");

let isStarted = false;

export const registerApps = (): void => {
    const apps = getAllApps();

    if (apps.length === 0) {
        Logger.warn('[Qiankun] 没有可注册的子应用');
        return;
    }

    Logger.info('[Qiankun] 注册子应用:', apps.map(app => app.name));

    // 为每个应用配置独立的沙箱选项
    const appsWithSandboxConfig = apps.map(app => ({
        ...app,
        // 对于 Vite 应用，使用 legacy 沙箱或禁用沙箱
        sandbox: !(app.name.includes('farm') || app.name.includes('weather')),
    }));

    registerMicroApps(appsWithSandboxConfig, {
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

export const startQiankun = async (options?: QiankunStartOptions): Promise<void> => {
    if (isStarted) {
        Logger.warn('[Qiankun] 乾坤已经启动，跳过重复启动');
        return;
    }

    try {
        registerApps();

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
