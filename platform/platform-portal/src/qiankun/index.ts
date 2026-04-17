import { registerMicroApps, start, initGlobalState } from 'qiankun';
import { getAuth } from '/@/utils/auth';
import {getSystems} from "./apps";
import {
    afterMount,
    afterUnmount,
    beforeLoad,
    beforeMount,
    beforeUnmount,
    loadError
} from "./lifecycles";

// 是否已启动
let isStarted = false;

// 注册子应用（可多次调用，用于动态更新）
export const registerApps = () => {
    // 根据权限获取子应用列表
    const apps = getSystems();

    console.log('[qiankun] 注册子应用:', apps.map(app => app.name));

    // qiankun 支持多次注册，会合并子应用列表
    registerMicroApps(apps, {
        beforeLoad: [beforeLoad],
        beforeMount: [beforeMount],
        afterMount: [afterMount],
        beforeUnmount: [beforeUnmount],
        afterUnmount: [afterUnmount],
    });

    // 添加加载失败处理
    apps.forEach(app => {
        registerMicroApps([app], {
            loadError: (err: Error) => loadError(err, app),
        });
    });
};


// 启动乾坤
export const startQiankun = () => {
    // 防止重复启动
    if (isStarted) {
        console.warn('[qiankun] 乾坤已经启动过了，跳过重复启动');
        return;
    }

    try {
        // 注册默认子应用
        const user = getAuth();
        registerApps();

        // 启动乾坤
        start({
            prefetch: 'all', // 预加载所有子应用
            sandbox: {
                experimentalStyleIsolation: true, // 样式隔离
            },
            singular: false, // 支持同时挂载多个子应用
        });

        isStarted = true;
        console.log('[qiankun] 乾坤已启动');
    } catch (error) {
        console.error('[qiankun] 启动失败:', error);
        // 如果已经启动过，qiankun 会抛出错误，这里捕获并处理
        if (error instanceof Error && error.message.includes('already started')) {
            console.warn('[qiankun] 乾坤已经被启动过了');
            isStarted = true;
        } else {
            throw error;
        }
    }
};
