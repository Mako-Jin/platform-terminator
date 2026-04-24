import { StrictMode } from 'react'
import {createRoot, Root} from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {LoggerFactory} from "common-shared";
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';


const Logger = LoggerFactory.create("games-farm");


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

// qiankun生命周期钩子
export async function bootstrap() {
    Logger.info('[games-farm] 子应用启动')
}

export async function mount(props: any) {
    Logger.info('[games-farm] 子应用挂载', props)
    render(props)

    // 监听全局状态变化（可选）
    props.onGlobalStateChange?.((state: any, prev: any) => {
        Logger.info('[games-farm] 全局状态变化', {state, prev})
    }, true)
}

export async function unmount(props: any) {
    Logger.info('[games-farm] 子应用卸载', props)
    const { container } = props
    const rootElement = container
        ? container.querySelector('#root')
        : document.getElementById('root')

    if (rootElement) {
        // 清理React根节点
        createRoot(rootElement).unmount()
    }
}

