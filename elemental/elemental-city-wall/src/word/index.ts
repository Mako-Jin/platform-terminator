import {LoggerFactory} from "common-tools";
import type {QiankunConfig} from "/@/settings";
import {Ground, Lighting} from "./components";
import {
    BaseCamera,
    cameraManager,
    CameraType,
    clockManager,
    OrbitControls,
    RendererWrapper,
    SceneWrapper, type SizeChangedData, sizeManager
} from "common-three";
import * as Three from "three";
import {Vector3} from "three";


interface WorldConfig {
    container: HTMLElement;
    isDebugMode?: boolean;
    onInitProgress?: (progress: number) => void;
    qiankunConfig?: QiankunConfig;
}



class World {

    private logger = LoggerFactory.create("elemental-city-wall-world");

    private static instance: World;

    private container!: HTMLElement;
    private isDebugMode: boolean = false;
    private onInitProgress?: (progress: number) => void;
    private qiankunConfig?: QiankunConfig;

    private scene!: SceneWrapper;
    private camera!: BaseCamera;
    private renderer!: RendererWrapper;
    private orbitControls!: OrbitControls | null;

    private unsubscribeClock: (() => void) | null = null;

    private ground: Ground;
    private lighting: Lighting;

    constructor() {
        if (World.instance) {
            return World.instance;
        }
        World.instance = this;
    }

    static getInstance() {
        if (!World.instance) {
            World.instance = new World();
        }
        return World.instance;
    }

    init(config: WorldConfig) {

        this.container = config.container;
        this.isDebugMode = config.isDebugMode || false;
        this.onInitProgress = config.onInitProgress;
        this.qiankunConfig = config.qiankunConfig;

        this.scene = new SceneWrapper({
            backgroundColor: 0xe0e0e0,
            backgroundAlpha: 1,
            fog: false,
            autoAddLights: false,
        });

        this.camera = cameraManager.createCamera(CameraType.PERSPECTIVE, {
            fov: 80,
            near: 0.25,
            far: 2000,
            position: { x: -30, y: 160, z: -180 },
            target: { x: 0, y: 0, z: -50 },
        });

        this.renderer = new RendererWrapper(this.container, {
            antialias: true,
            alpha: false,
            shadows: true,
            pixelRatio: sizeManager.getPixelRatio(),
            shadowType: Three.PCFShadowMap,
            toneMapping: Three.LinearToneMapping,
            toneMappingExposure: 1.0,
            backgroundColor: '#87CEEB',
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

        const targetVector = new Vector3(0, 0, -50);
        this.camera.getCamera().lookAt(targetVector);
        this.orbitControls.setTarget(targetVector);
        this.orbitControls.update();
        clockManager.start();

        this.lighting = new Lighting(this.scene);
        this.ground = new Ground(this.scene);

        this.registerEventListeners();
    }

    private registerEventListeners(): void {
        sizeManager.onSizeChanged(this.handleResize.bind(this));
        this.unsubscribeClock = clockManager.onUpdate(async (delta, elapsedTime) => {
            this.update(delta, elapsedTime);
        });
    }

    private handleResize(data: SizeChangedData): void {
        // ✅ 使用正确的 onResize 方法和事件数据中的尺寸
        this.renderer.onResize(data.width, data.height);
        cameraManager.onResize(data.width, data.height);
    }

    start() {

    }

    dispose() {
        if (this.unsubscribeClock) this.unsubscribeClock();
        sizeManager.offSizeChanged(this.handleResize.bind(this));
    }

    update(delta: number, elapsedTime: number) {
        this.orbitControls?.update(delta);
        this.camera?.update(delta, elapsedTime);
        this.renderer.render(this.scene, this.camera!);
    }

}

export default World;
