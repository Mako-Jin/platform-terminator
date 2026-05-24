import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import './index.scss'
import App from './App.tsx'
import {LoggerFactory} from "common-tools";

let root: Root | null = null

const logger = LoggerFactory.create('elemental-weather-main');

// 独立运行模式
const renderStandalone = () => {
    const container = document.getElementById('root')
    if (!container) {
        return
    }

    root = createRoot(container)
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    )
}

// 微应用模式 - 乾坤生命周期钩子
export async function bootstrap() {
    logger.info('[Elemental Weather] 子应用 bootstrap')
}

export async function mount(props: { container?: HTMLElement }) {
    logger.info('[Elemental Weather] 子应用 mount', props)

    const container = props.container || document.getElementById('root')
    if (!container) return

    root = createRoot(container)
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    )
}

export async function unmount() {
    logger.info('[Elemental Weather] 子应用 unmount')

    if (root) {
        root.unmount()
        root = null
    }
}

export async function update(props: Record<string, unknown>) {
    logger.info('[Elemental Weather] 子应用 update', props)
}

// 判断是否为微应用环境
if (!(window as unknown as { __POWERED_BY_QIANKUN__: boolean }).__POWERED_BY_QIANKUN__) {
    // 独立运行
    renderStandalone()
}
