import type { MicroApp } from 'qiankun';
import type { LifecycleHooks } from './types';
import { LoggerFactory } from 'common-shared';

let loadingElement: HTMLDivElement | null = null;

const showLoading = (): void => {
    if (loadingElement) return;

    loadingElement = document.createElement('div');
    loadingElement.id = 'sub-app-loading';
    loadingElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 20px 40px;
        color: #d4af37;
        font-size: 1.2rem;
        letter-spacing: 2px;
        z-index: 9999;
        border: 1px solid #d4af37;
        box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
    `;
    loadingElement.innerHTML = '⚜️ 加载子应用中... ⚜️';
    document.body.appendChild(loadingElement);
};

const hideLoading = (): void => {
    if (loadingElement && loadingElement.parentNode) {
        loadingElement.parentNode.removeChild(loadingElement);
        loadingElement = null;
    }
};

const showError = (message: string): void => {
    const errorEl = document.createElement('div');
    errorEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
    `;
    errorEl.textContent = message;
    document.body.appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 3000);
};

export const lifecycleHooks: LifecycleHooks = {
    beforeLoad: async (app: MicroApp): Promise<void> => {
        Logger.info('[Qiankun Lifecycle] before load:', app.name);
    },

    beforeMount: async (app: MicroApp): Promise<void> => {
        Logger.info('[Qiankun Lifecycle] before mount:', app.name);
        showLoading();
    },

    afterMount: async (app: MicroApp): Promise<void> => {
        Logger.info('[Qiankun Lifecycle] after mount:', app.name);
        hideLoading();
    },

    beforeUnmount: async (app: MicroApp): Promise<void> => {
        Logger.info('[Qiankun Lifecycle] before unmount:', app.name);
    },

    afterUnmount: async (app: MicroApp): Promise<void> => {
        Logger.info('[Qiankun Lifecycle] after unmount:', app.name);
    },

    loadError: (err: Error, app: MicroApp): void => {
        Logger.error('[Qiankun Lifecycle] load error for', app.name, ':', err);
        showError(`子应用 ${app.name} 加载失败`);
    },
};
