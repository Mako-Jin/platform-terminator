import {ResourceLoader} from "/@/resources";
import {LoggerFactory} from "common-tools";
import {
    cameraManager,
    CameraType,
    clockManager,
    datetimeManager,
    RendererWrapper,
    SceneWrapper,
    sizeManager
} from "common-three";
import World from "./world";
import * as Three from "three";

class Weather {

    private static instance: Weather;

    private logger = LoggerFactory.create("weather");
    private isDebugMode: boolean = false;
    private resources!: ResourceLoader;
    private container!: HTMLElement;
    private scene!: SceneWrapper;
    private renderer!: RendererWrapper;
    private world!: World;
    private unsubscribeClock: (() => void) | null = null;

    constructor() {
        if (Weather.instance) {
            return Weather.instance;
        }
        Weather.instance = this;
    }

    static getInstance() {
        if (!Weather.instance) {
            Weather.instance = new Weather();
        }
        return Weather.instance;
    }

    public async init(
        container: HTMLElement,
        resources: ResourceLoader,
        isDebugMode: boolean = false
    ) {
        this.isDebugMode = isDebugMode;
        this.container = container;
        this.resources = resources;

        // ✅ 使用 SceneWrapper
        this.scene = new SceneWrapper({
            backgroundColor: '#000000',
            backgroundAlpha: 1,
            fog: false,
            autoAddLights: false, // 由 Lighting 组件管理灯光
        });

        // ✅ 使用 cameraManager
        cameraManager.createCamera(CameraType.PERSPECTIVE, {
            fov: 25,
            near: 0.1,
            far: 200,
            position: { x: 18.25, y: 10.69, z: 27.32 },
            target: { x: 0, y: 0, z: 0 },
        });

        // ✅ 使用 RendererWrapper
        this.renderer = new RendererWrapper(this.container, {
            antialias: false,
            alpha: false,
            shadows: true,
            shadowType: Three.PCFShadowMap,
            toneMapping: Three.LinearToneMapping,
            toneMappingExposure: 1.75,
            backgroundColor: '#000000',
        });
        this.renderer.enable();

        // ✅ 启动时间管理器
        datetimeManager.start(60000); // 每分钟更新

        // 创建 World，传入包装类
        this.world = new World(
            this.scene,
            this.renderer,
            this.resources,
            isDebugMode
        );

        // ✅ 异步初始化 World（会自动初始化所有组件）
        await this.world.initialize();

        // 监听尺寸变化
        sizeManager.onSizeChanged((data) => {
            this.resize();
        });

        // ✅ 使用 clockManager 替代自定义 Clock
        this.unsubscribeClock = clockManager.onUpdate((delta, elapsedTime) => {
            this.update(delta, elapsedTime);
        });
        
        // 启动时钟
        clockManager.start();

        this.logger.info('Weather app initialized with common-three');
    }

    resize(): void {
        const width = sizeManager.getWidth();
        const height = sizeManager.getHeight();
        
        // ✅ 使用包装类的 onResize
        this.renderer.onResize(width, height);
        cameraManager.onResize(width, height);
        
        // ✅ World 的 onResize 已不需要调用，SceneWrapper 会自动通知所有组件
        // this.world.onResize(width, height);
    }

    update(delta: number, elapsedTime: number): void {
        // ✅ 更新相机（OrbitControls）
        const activeCamera = cameraManager.getActiveCamera();
        if (activeCamera) {
            // 注意：需要在相机包装类中暴露 controls
            // 这里暂时跳过，后续优化
        }

        // ✅ World 的 update 已不需要调用，SceneWrapper 会自动更新所有组件
        this.world.update(delta, elapsedTime);

        // ✅ 使用包装类渲染
        const camera = cameraManager.getActiveCamera();
        if (camera) {
            this.renderer.render(this.scene, camera);
        }

        // 调试日志
        if (this.isDebugMode && Math.random() < 0.01) {
            this.logger.debug(
                `Rendering frame - Delta: ${delta.toFixed(4)}, ` +
                `Elapsed: ${elapsedTime.toFixed(2)}, ` +
                `FPS: ${clockManager.getFPS()}`
            );
        }

        if (this.isDebugMode) {
            const frameCount = clockManager.getFrameCount();
            if (frameCount % 60 === 0) {
                this.logger.info(`[Weather] Rendering frame #${frameCount}, FPS: ${clockManager.getFPS()}`);
            }
        }
    }

    dispose(): void {
        // ✅ 取消时钟订阅
        if (this.unsubscribeClock) {
            this.unsubscribeClock();
        }
        
        // ✅ 停止时钟
        clockManager.stop();
        
        // ✅ World 的 dispose 已不需要调用，SceneWrapper 会自动销毁所有组件
        // this.world.dispose();
        
        this.renderer.dispose();
        this.scene.dispose();
        cameraManager.dispose();
        datetimeManager.stop();
        
        this.logger.info('Weather app disposed');
    }
}

export default Weather;
