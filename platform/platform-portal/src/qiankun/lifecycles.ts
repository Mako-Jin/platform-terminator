// src/qiankun/lifecycles.ts
import type { MicroApp } from 'qiankun';

// 加载前
export const beforeLoad = (app: MicroApp): Promise<void> => {
    console.log(`[qiankun] before load ${app.name}`);
    return Promise.resolve();
};

// 挂载前
export const beforeMount = (app: MicroApp): Promise<void> => {
    console.log(`[qiankun] before mount ${app.name}`);
    // 可以在这里添加加载动画
    showLoading();
    return Promise.resolve();
};

// 挂载后
export const afterMount = (app: MicroApp): Promise<void> => {
    console.log(`[qiankun] after mount ${app.name}`);
    hideLoading();
    return Promise.resolve();
};

// 卸载前
export const beforeUnmount = (app: MicroApp): Promise<void> => {
    console.log(`[qiankun] before unmount ${app.name}`);
    return Promise.resolve();
};

// 卸载后
export const afterUnmount = (app: MicroApp): Promise<void> => {
    console.log(`[qiankun] after unmount ${app.name}`);
    return Promise.resolve();
};

// 加载失败
export const loadError = (err: Error, app: MicroApp): void => {
    console.error(`[qiankun] load error for ${app.name}:`, err);
    showError(`子应用 ${app.name} 加载失败`);
};

// 显示加载动画
let loadingElement: HTMLDivElement | null = null;

const showLoading = () => {
    if (!loadingElement) {
        loadingElement = document.createElement('div');
        loadingElement.id = 'subapp-loading';
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
    }
    document.body.appendChild(loadingElement);
};

const hideLoading = () => {
    if (loadingElement && loadingElement.parentNode) {
        loadingElement.parentNode.removeChild(loadingElement);
    }
};

const showError = (message: string) => {
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
    errorEl.innerHTML = message;
    document.body.appendChild(errorEl);
    setTimeout(() => {
        errorEl.remove();
    }, 3000);
};
