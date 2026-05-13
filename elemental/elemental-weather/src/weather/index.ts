import {LoggerFactory} from "common-tools";
import {
    SceneWrapper,
    RendererWrapper,
    cameraManager,
    CameraType,
    datetimeManager,
    BaseCamera,
    sizeManager,
    type SizeChangedData,
    clockManager
} from "common-three";
import * as Three from 'three';
import {AmbientSoundManager, AudioManager, MusicManager} from "/@/manager";
import World from "/@/weather/word.ts";


class Weather {

    private logger = LoggerFactory.create("elemental-weather-instance");

    private static instance: Weather;

    private isDebugMode: boolean = false;
    private container!: HTMLElement;
    private scene!: SceneWrapper;
    private renderer!: RendererWrapper;
    private camera!: BaseCamera | null;
    private world!: World;

    // ✅ 音频管理器实例
    private audioManager!: AudioManager;
    public musicManager!: MusicManager;
    public ambientSoundManager!: AmbientSoundManager;
    private withMusic: boolean;

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
        withMusic: boolean = false,
        isDebugMode: boolean = false
    ) {
        this.isDebugMode = isDebugMode;
        this.container = container;
        this.withMusic = withMusic;

        // ✅ 使用 SceneWrapper
        this.scene = new SceneWrapper({
            backgroundColor: '#000000',
            backgroundAlpha: 1,
            fog: false,
            autoAddLights: false, // 由 Lighting 组件管理灯光
        });

        // ✅ 使用 cameraManager
        this.camera = cameraManager.createCamera(CameraType.PERSPECTIVE, {
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

        // ✅ 初始化音频系统
        await this.initializeAudioSystem();

        // 创建 World，传入包装类
        this.world = new World(
            this.scene,
            this.renderer,
            isDebugMode
        );

        // ✅ 异步初始化 World（会自动初始化所有组件）
        await this.world.initialize();

        // 监听尺寸变化
        sizeManager.onSizeChanged((data: SizeChangedData) => {
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
    }

    /**
     * ✅ 初始化音频系统
     */
    private async initializeAudioSystem(): Promise<void> {
        try {
            this.logger.info('Initializing audio system...');

            // 1. 创建音频管理器
            this.audioManager = AudioManager.getInstance();

            // 2. 加载所有音频资源
            await this.audioManager.loadAllSounds();
            if (this.camera) {
                this.audioManager.addListenerToCamera(this.camera);
            }

            // 3. 创建音乐管理器
            this.musicManager = new MusicManager(this.audioManager);

            // 4. 创建环境音效管理器
            this.ambientSoundManager = new AmbientSoundManager(this.audioManager);

            if (this.withMusic) {
                // 6. 开始播放随机音乐
                this.musicManager.startRandomMusic();
            } else {
                this.musicManager.setIsMusicEnabled(false);
            }

            this.logger.info('Audio system initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize audio system', error);
        }
    }

    update(delta: number, elapsedTime: number): void {
        // ✅ 更新相机（OrbitControls）
        this.camera?.update(delta, elapsedTime);

        // ✅ World 的 update 已不需要调用，SceneWrapper 会自动更新所有组件
        this.world.update(delta, elapsedTime);

        // ✅ 更新环境音效（每帧更新距离音量）
        if (this.ambientSoundManager) {
            this.ambientSoundManager.update();
        }

        this.renderer.render(this.scene, this.camera!);

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
                this.logger.debug(`[Weather] Rendering frame #${frameCount}, FPS: ${clockManager.getFPS()}`);
            }
        }
    }

    dispose(): void {
        // ✅ 取消时钟订阅
        if (this.unsubscribeClock) {
            this.unsubscribeClock();
        }

        sizeManager.offSizeChanged(() => {});
        datetimeManager.offTimeChanged(() => {});
        datetimeManager.offDateChanged(() => {});
        datetimeManager.offSeasonChanged(() => {});

        // ✅ 停止时钟
        clockManager.stop();

        // ✅ 清理音频系统
        if (this.ambientSoundManager) {
            this.ambientSoundManager.dispose();
        }
        if (this.musicManager) {
            this.musicManager.stopMusic();
        }
        if (this.audioManager) {
            this.audioManager.dispose();
        }

        // ✅ World 的 dispose 已不需要调用，SceneWrapper 会自动销毁所有组件
        this.world.dispose();

        this.renderer.dispose();
        this.scene.dispose();
        cameraManager.dispose();
        datetimeManager.stop();

        this.logger.info('Weather app disposed');
    }

    getMusicManager(): MusicManager {
        return this.musicManager;
    }

}

export default Weather;
