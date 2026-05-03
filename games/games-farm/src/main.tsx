import { StrictMode } from 'react'
import {createRoot, type Root} from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Farm from "./farm";
import {LoggerFactory} from "common-tools";


const Logger = LoggerFactory.create("games-farm");

let root: Root | null = null;
let isQiankun = false;

// 渲染函数
function render(props: any = {}) {
    const { container } = props;
    
    let mountRoot: HTMLElement | null = null;
    
    if (container) {
        // qiankun 环境：直接在容器中创建 #root
        const existingRoot = container.querySelector('#root');
        if (existingRoot) {
            mountRoot = existingRoot as HTMLElement;
        } else {
            mountRoot = document.createElement('div');
            mountRoot.id = 'root';
            container.appendChild(mountRoot);
        }
    } else {
        // 独立运行
        mountRoot = document.getElementById('root');
    }

    if (mountRoot) {
        root = createRoot(mountRoot);
        
        if (isQiankun && container) {
            root.render(
                <StrictMode>
                    <Farm container={mountRoot} />
                </StrictMode>
            );
        } else {
            root.render(
                <StrictMode>
                    <App />
                </StrictMode>
            );
        }
    } else {
        Logger.error('[games-farm] 找不到挂载点')
    }
}

// qiankun生命周期钩子 - 必须始终导出
export async function bootstrap() {
    Logger.info('[games-farm] 子应用启动')
    isQiankun = true;
}

export async function mount(props: any) {
    Logger.info('[games-farm] 子应用挂载', props)
    render(props)

    // 监听全局状态变化（可选）
    props.onGlobalStateChange?.((state: any, prev: any) => {
        Logger.info('[games-farm] 全局状态变化', state, prev)
    }, true)
}

export async function unmount(props: any) {
    Logger.info('[games-farm] 子应用卸载', props)
    
    if (root) {
        root.unmount()
        root = null
    }
    
    // 清理容器中的内容
    const { container } = props
    if (container) {
        const rootElement = container.querySelector('#root')
        if (rootElement) {
            container.removeChild(rootElement)
        }
    }
}

// 判断是否在乾坤环境中，如果不是则独立运行
if (!(window as any).__POWERED_BY_QIANKUN__) {
    Logger.info('[games-farm] 独立运行模式')
    render()
}

