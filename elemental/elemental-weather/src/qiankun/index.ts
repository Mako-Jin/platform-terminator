import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

let gameInstance: any = null;
let containerElement: HTMLElement | null = null;

// 渲染函数 - 独立运行时
function render(props: any = {}) {
    const { container } = props;

    // 确定挂载点
    const mountRoot = container
        ? (container.querySelector('#root') as HTMLElement)
        : document.getElementById('root');

    if (!mountRoot) {
        console.error('[elemental-weather] Mount root not found');
        return;
    }

    containerElement = mountRoot;

    // 动态加载 Three.js 场景
    initScene(mountRoot, props).then();
}

// 初始化 3D 场景
async function initScene(container: HTMLElement, props: any = {}) {
    try {
        console.log('[elemental-weather] Initializing 3D scene...');

        // 接收基座传递的 props
        const {
            getGlobalState,
            setGlobalState,
            onGlobalStateChange,
            theme = 'light',
            locale = 'zh-CN',
            isEnable = true
        } = props;

        // 保存全局状态操作方法
        if (getGlobalState && setGlobalState) {
            (window as any).__QIANKUN_GLOBAL_STATE__ = {
                getGlobalState,
                setGlobalState,
                onGlobalStateChange
            };
        }

        // 监听全局状态变化
        if (onGlobalStateChange) {
            onGlobalStateChange((state: any) => {
                console.log('[elemental-weather] Global state changed:', state);
                // 可以在这里响应主题、语言等变化
                if (gameInstance) {
                    // 更新场景配置
                    updateSceneConfig(state);
                }
            }, true);
        }

        // 动态导入 Game 类（避免 SSR 问题）
        // const { default: Game } = await import('../Game/Game.class.js');
        // const { default: ResourceLoader } = await import('../Game/Utils/ResourceLoader.class.js');
        // const ASSETS = await import('../config/assets.js');

        // 检查容器是否存在
        const canvasContainer = document.createElement('div');
        canvasContainer.id = 'elemental-weather-container';
        canvasContainer.style.cssText = `
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        `;

        // 清空容器并添加 canvas 容器
        container.innerHTML = '';
        container.appendChild(canvasContainer);

        // 创建资源加载器
        // const resources = new ResourceLoader(ASSETS.default);

        // 判断是否为调试模式
        const isDebugMode = new URLSearchParams(window.location.search).get('mode') === 'debug';

        // 初始化游戏实例
        // gameInstance = new Game(
        //     canvasContainer,
        //     resources,
        //     isDebugMode,
        //     true // withMusic
        // );

        // 暴露实例到 window（便于调试）
        (window as any).__ELEMENTAL_GAME__ = gameInstance;

        console.log('[elemental-weather] Scene initialized successfully');

    } catch (error) {
        console.error('[elemental-weather] Failed to initialize scene:', error);
        showError(container, error);
    }
}

// 更新场景配置
function updateSceneConfig(state: any) {
    if (!gameInstance) return;

    // 根据主题调整场景
    if (state.theme) {
        console.log('[elemental-weather] Theme changed to:', state.theme);
        // TODO: 实现主题切换逻辑
    }

    // 根据语言调整
    if (state.locale) {
        console.log('[elemental-weather] Locale changed to:', state.locale);
        // TODO: 实现国际化逻辑
    }
}

// 显示错误信息
function showError(container: HTMLElement, error: any) {
    const errorEl = document.createElement('div');
    errorEl.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 0, 0, 0.9);
    color: white;
    padding: 20px 40px;
    border-radius: 12px;
    z-index: 10000;
    font-size: 16px;
    text-align: center;
    max-width: 80%;
  `;
    errorEl.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
    <div>场景加载失败</div>
    <div style="font-size: 12px; margin-top: 10px; opacity: 0.8;">
      ${error instanceof Error ? error.message : '未知错误'}
    </div>
  `;
    container.appendChild(errorEl);
}

// 清理资源
function cleanup() {
    if (gameInstance) {
        try {
            gameInstance.destroy();
            console.log('[elemental-weather] Game instance destroyed');
        } catch (error) {
            console.error('[elemental-weather] Error during cleanup:', error);
        }
        gameInstance = null;
    }

    if (containerElement) {
        containerElement.innerHTML = '';
        containerElement = null;
    }

    // 清理 window 上的引用
    delete (window as any).__ELEMENTAL_GAME__;
}

// ==================== 乾坤生命周期导出 ====================

// 应用启动时调用（只调用一次）
export async function bootstrap() {
    console.log('[elemental-weather] bootstrap');
}

// 应用挂载时调用（每次进入路由都会调用）
export async function mount(props: any) {
    console.log('[elemental-weather] mount', props);
    render(props);
}

// 应用卸载时调用（每次离开路由都会调用）
export async function unmount(props: any) {
    console.log('[elemental-weather] unmount', props);
    cleanup();
}

// 应用更新时调用（可选）
export async function update(props: any) {
    console.log('[elemental-weather] update', props);
    if (gameInstance && props) {
        updateSceneConfig(props);
    }
}

// 使用 qiankun 插件注册生命周期
renderWithQiankun({
    bootstrap,
    mount,
    unmount,
    update,
});

// 独立运行时直接渲染
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
    console.log('[elemental-weather] Running in standalone mode');
    render();
}
