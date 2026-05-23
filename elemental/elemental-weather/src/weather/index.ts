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
    clockManager, OrbitControls
} from "common-three";
import * as Three from 'three';
import {AmbientSoundManager, AudioManager, MusicManager} from "/@/manager";
import World from "/@/weather/word.ts";
import {Vector3} from "three";

interface WeatherConfig {
    container: HTMLElement;
    isDebugMode?: boolean;
    onInitProgress?: (progress: number) => void;
}

class Weather {
    
    private logger = LoggerFactory.create("elemental-weather-instance");
    
    private static instance: Weather;

    private isInitialized: boolean = false;
    private isRunning: boolean = false;
    
    private container!: HTMLElement;
    private scene!: SceneWrapper;
    private renderer!: RendererWrapper;
    private camera!: BaseCamera | null;
    private orbitControls!: OrbitControls | null;
    private world!: World;

    private audioManager!: AudioManager;
    public musicManager!: MusicManager;
    public ambientSoundManager!: AmbientSoundManager;
    private withMusic: boolean = false;
    private isDebugMode: boolean = false;
    private onInitProgress?: (progress: number) => void;

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

    public async init(config: WeatherConfig): Promise<void> {
        if (this.isInitialized) {
            this.logger.warn('[Weather] Already initialized');
            return;
        }

        this.container = config.container;
        this.isDebugMode = config.isDebugMode ?? false;
        this.onInitProgress = config.onInitProgress;

        try {
            this.logger.debug('[Weather] Initializing...');

            this.reportProgress(0);

            this.initializeSceneAndRenderer();
            this.reportProgress(10);

            this.initializeGlobalManagers();
            this.reportProgress(15);

            await this.initializeAudioSystem();
            this.reportProgress(30);

            this.world = new World(this.scene, this.isDebugMode);
            await this.world.initialize((progress) => {
                this.reportProgress(30 + (progress * 0.5));
            });
            this.reportProgress(80);

            this.registerEventListeners();
            this.reportProgress(90);

            this.isInitialized = true;
            this.reportProgress(100);
            this.logger.debug('[Weather] Initialization complete');
        } catch (error) {
            this.logger.error('[Weather] Initialization failed', error);
            throw error;
        }
    }

    private reportProgress(progress: number): void {
        if (this.onInitProgress) {
            this.onInitProgress(Math.round(progress));
        }
    }

    public start(withMusic?: boolean): void {
        if (!this.isInitialized) {
            this.logger.error('[Weather] Cannot start before initialization');
            return;
        }
        this.withMusic = withMusic ?? false;
        if (this.isRunning) {
            return;
        }

        this.logger.info('[Weather] Starting render loop...');
        this.isRunning = true;
        if (this.withMusic) {
            this.musicManager.startRandomMusic();
        } else {
            this.musicManager.setIsMusicEnabled(false);
        }
        this.world.activate();
        clockManager.start();
    }

    public stop(): void {
        if (!this.isRunning) return;
        
        this.logger.info('[Weather] Stopping render loop...');
        this.isRunning = false;
        this.world.stop();
        clockManager.stop();
    }

    public dispose(): void {
        this.logger.info('[Weather] Disposing...');
        
        this.stop();

        if (this.unsubscribeClock) this.unsubscribeClock();
        sizeManager.offSizeChanged(this.handleResize.bind(this));

        this.world.dispose();
        this.renderer.dispose();
        this.scene.dispose();
        cameraManager.dispose();
        this.orbitControls?.dispose();
        datetimeManager.stop();

        this.ambientSoundManager?.dispose();
        this.musicManager?.stopMusic();
        this.audioManager?.dispose();

        this.isInitialized = false;
        this.logger.info('[Weather] Disposed');
    }

    private initializeSceneAndRenderer(): void {
        this.scene = new SceneWrapper({
            backgroundColor: '#000000',
            backgroundAlpha: 1,
            fog: false,
            autoAddLights: false,
        });

        this.camera = cameraManager.createCamera(CameraType.PERSPECTIVE, {
            fov: 25, near: 0.1, far: 200,
            position: { x: 18.25, y: 10.69, z: 27.32 },
            target: { x: 0, y: 0, z: 0 },
        });

        this.renderer = new RendererWrapper(this.container, {
            antialias: false, alpha: false, shadows: true,
            shadowType: Three.PCFShadowMap,
            toneMapping: Three.LinearToneMapping,
            toneMappingExposure: 1.75,
            backgroundColor: '#000000',
        });
        this.renderer.enable();

        const orbitControlsConfig = {
            enableDamping: true,
                enablePan: false,
                enableZoom: true,
                maxPolarAngle: Math.PI / 2.2,
                minPolarAngle: Math.PI / 4,
                maxDistance: 35,
                dampingFactor: 0.05,
        }
        this.orbitControls = new OrbitControls(this.camera.getCamera(), this.container, orbitControlsConfig);

        this.camera.getCamera().lookAt(0, 0, 0);
        this.orbitControls.setTarget(new Vector3(0, 0, 0));
        this.orbitControls.update(0.1);
    }

    private initializeGlobalManagers(): void {
        datetimeManager.start(60000);
    }

    private registerEventListeners(): void {
        sizeManager.onSizeChanged(this.handleResize.bind(this));
        this.unsubscribeClock = clockManager.onUpdate((delta, elapsedTime) => {
            if (this.isRunning) this.update(delta, elapsedTime);
        });
    }

    private handleResize(data: SizeChangedData): void {
        this.renderer.onResize(data.width, data.height);
        cameraManager.onResize(data.width, data.height);
    }

    private async initializeAudioSystem(): Promise<void> {
        try {
            this.logger.debug('Initializing audio system...');
            this.audioManager = AudioManager.getInstance();
            await this.audioManager.loadAllSounds();
            if (this.camera) this.audioManager.addListenerToCamera(this.camera);
            this.musicManager = new MusicManager(this.audioManager);
            this.ambientSoundManager = new AmbientSoundManager(this.audioManager);
            this.logger.debug('Audio system initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize audio system', error);
        }
    }

    private update(delta: number, elapsedTime: number): void {
        this.world.update(delta, elapsedTime);

        this.orbitControls?.update(delta);

        this.camera?.update(delta, elapsedTime);
        if (this.ambientSoundManager) this.ambientSoundManager.update();
        this.renderer.render(this.scene, this.camera!);
    }

    getMusicManager(): MusicManager { return this.musicManager; }
}

export default Weather;
