import { StrictMode } from 'react'
import { createRoot, Root } from 'react-dom/client'
import './index.scss'
import App from './App.tsx'

import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

let root: Root | null = null;

// 渲染函数
function render(props: any = {}) {
    const { container } = props;
    const mountRoot = container
        ? container.querySelector('#root')
        : document.getElementById('root');

    if (mountRoot) {
        root = createRoot(mountRoot);
        root.render(
            <StrictMode>
                <App />
            </StrictMode>
        );
    }
}

// 判断是否在乾坤环境中
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
    // 独立运行
    render();
}

// 导出乾坤生命周期钩子
export async function bootstrap() {
    console.log('[platform-auth] bootstrap');
}

export async function mount(props: any) {
    console.log('[platform-auth] mount', props);

    // 接收基座传递的 props
    const { getGlobalState, setGlobalState, onGlobalStateChange, container } = props;

    // 保存全局状态操作方法到 window，供组件使用
    if (getGlobalState && setGlobalState) {
        (window as any).__QIANKUN_GLOBAL_STATE__ = { getGlobalState, setGlobalState, onGlobalStateChange };
    }

    render(props);
}

export async function unmount(props: any) {
    console.log('[platform-auth] unmount', props);
    if (root) {
        root.unmount();
        root = null;
    }
}

export async function update(props: any) {
    console.log('[platform-auth] update', props);
}

// 使用 qiankun 插件注册生命周期
renderWithQiankun({
    bootstrap,
    mount,
    unmount,
    update,
});

