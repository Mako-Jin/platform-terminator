import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    type ComponentConfig,
    type DateChangedData,
    type IObject3DComponent,
    Object3DComponent, resourcesManager,
    SceneWrapper,
    type SeasonChangedData,
    type TimeChangedData,
    type UpdateParams
} from "common-three";
import {type ConfigObject, SettingsManager} from "/@/settings";
import type {EasingType} from "/@/settings/manager.ts";


interface LightingConfig {
    key: Three.DirectionalLight | null;
    fill: Three.DirectionalLight | null;
    ambient: Three.AmbientLight | null;
    rim: Three.DirectionalLight | null;
    lamp: Three.PointLight | null
}


export default class Lighting extends Object3DComponent {

    private helperEnabled: boolean;

    private lights: LightingConfig = {
        key: null,
        fill: null,
        ambient: null,
        rim: null,
        lamp: null,
    };

    private settingsManager: SettingsManager;

    private environmentMap: {
        day: Three.Texture;
        night: Three.Texture;
        current: Three.Texture | null;
        intensity: number;
    } | null = null;

    private envMapRotationY: number = 0;

    private helpers: Three.Object3D[] = [];
    private shadowCameraHelper: Three.CameraHelper | null = null;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-lighting', options.isDebugMode);

        this.helperEnabled = this.isDebugMode;

        this.settingsManager = SettingsManager.getInstance();
    }

    public getLightingConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('lighting', easing);
    }

    /**
     * 【初始化】创建灯光、环境贴图和阴影配置
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Lighting] Initializing...');

        await this.waitForDependencies();

        // 创建根节点
        const root = this.createRootGroup();
        root.name = 'LightsGroup';
        this.setRoot(root); // ✅ 关键修复：设置 root

        // 创建灯光
        this.createLights(root);
        this.configureShadows();
        this.setupEnvironment();

        this.logger.info('[Lighting] Initialization complete');
    }

    /**
     * 【激活】应用初始配置并添加 Helper
     */
    protected onActivate(): void {
        this.logger.info('[Lighting] Activating...');
        this.refreshLightingConfig();

        if (this.helperEnabled) {
            this.addHelpers();
        }
    }

    /**
     * 【更新】每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        // 目前灯光变化由事件驱动，此处留空
    }

    /**
     * 【销毁】清理资源
     */
    protected onDispose(): void {
        this.logger.info('[Lighting] Disposing...');

        // 清理 Helper
        this.helpers.forEach(helper => {
            helper.removeFromParent();
            if (helper instanceof Three.CameraHelper || helper instanceof Three.LightHelper) {
                helper.dispose();
            }
        });
        this.helpers = [];
        this.shadowCameraHelper = null;

        // 清理引用
        this.environmentMap = null;
        Object.keys(this.lights).forEach(key => {
            (this.lights as any)[key] = null;
        });
    }

    // ==================== 事件监听 ====================

    public onTimeChanged(_data: TimeChangedData): void {
        this.refreshLightingConfig();
    }

    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Lighting] Date changed: ${data.currentDate}`);
    }

    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Lighting] Season changed: ${data.currentSeason}`);
        this.refreshLightingConfig();
    }

    // ==================== 调试面板 ====================

    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        gui.add({ name: component.name }, 'name').name('Component').disable();
        
        const folder = gui.addFolder('Lighting Controls');
        
        if (this.lights.key) {
            folder.addColor(this.lights.key, 'color').name('Key Light Color');
            folder.add(this.lights.key, 'intensity', 0, 5, 0.05).name('Key Intensity');
        }
        if (this.lights.fill) {
            folder.addColor(this.lights.fill, 'color').name('Fill Light Color');
            folder.add(this.lights.fill, 'intensity', 0, 2, 0.05).name('Fill Intensity');
        }
        if (this.lights.ambient) {
            folder.addColor(this.lights.ambient, 'color').name('Ambient Color');
            folder.add(this.lights.ambient, 'intensity', 0, 2, 0.05).name('Ambient Intensity');
        }
        if (this.environmentMap) {
            folder.add(this.environmentMap, 'intensity', 0, 2, 0.05).name('Env Intensity')
                .onChange(() => this.updateMaterials());
        }
    }

    // ==================== 内部逻辑 ====================

    private async waitForDependencies(): Promise<void> {
        try {
            await this.settingsManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Lighting] Failed to wait for Season config:', error);
        }
    }

    private refreshLightingConfig(): void {
        const config = this.getLightingConfig('smoothstep');
        if (config) {
            this.applyLightingConfig(config);
        }
    }

    private createLights(root: Three.Group): void {
        this.lights.lamp = new Three.PointLight();
        this.lights.lamp.name = 'lampLight';
        root.add(this.lights.lamp);

        this.lights.key = new Three.DirectionalLight();
        this.lights.key.name = 'keyLight';
        root.add(this.lights.key);

        this.lights.fill = new Three.DirectionalLight();
        this.lights.fill.name = 'fillLight';
        root.add(this.lights.fill);

        this.lights.ambient = new Three.AmbientLight();
        this.lights.ambient.name = 'ambientLight';
        root.add(this.lights.ambient);

        this.lights.rim = new Three.DirectionalLight();
        this.lights.rim.name = 'rimLight';
        root.add(this.lights.rim);
    }

    private configureShadows(): void {
        if (this.lights.key) {
            this.lights.key.castShadow = true;
            this.lights.key.shadow.mapSize.set(2048, 2048);
            const frustumSize = 12;
            Object.assign(this.lights.key.shadow.camera, {
                left: -frustumSize, right: frustumSize,
                top: frustumSize, bottom: -frustumSize,
                near: 0.1, far: 60
            });
            this.lights.key.shadow.bias = -0.0001;
            this.lights.key.shadow.normalBias = 0.02;
        }
    }

    private setupEnvironment(): void {
        const dayTexture = resourcesManager.getItemById<Three.Texture>("environmentMapDayTexture");
        const nightTexture = resourcesManager.getItemById<Three.Texture>("environmentMapNightTexture");

        if (dayTexture && nightTexture) {
            this.environmentMap = {
                day: dayTexture,
                night: nightTexture,
                current: null,
                intensity: 0.3,
            };
            this.environmentMap.day.colorSpace = Three.SRGBColorSpace;
            this.environmentMap.night.colorSpace = Three.SRGBColorSpace;
        }
    }

    private applyLightingConfig(config: ConfigObject | null | undefined): void {
        if (!config) return;
        const c = config as any;

        if (this.lights.lamp && c.lamp) {
            this.lights.lamp.color.setHex(c.lamp.color);
            this.lights.lamp.intensity = c.lamp.intensity;
            this.lights.lamp.position.set(...(c.lamp.position as number[]));
        }
        if (this.lights.key && c.key) {
            this.lights.key.color.setHex(c.key.color);
            this.lights.key.intensity = c.key.intensity;
            this.lights.key.position.set(...(c.key.position as number[]));
        }
        if (this.lights.fill && c.fill) {
            this.lights.fill.color.setHex(c.fill.color);
            this.lights.fill.intensity = c.fill.intensity;
            this.lights.fill.position.set(...(c.fill.position as number[]));
        }
        if (this.lights.ambient && c.ambient) {
            this.lights.ambient.color.setHex(c.ambient.color);
            this.lights.ambient.intensity = c.ambient.intensity;
        }
        if (this.lights.rim && c.rim) {
            this.lights.rim.color.setHex(c.rim.color);
            this.lights.rim.intensity = c.rim.intensity;
            this.lights.rim.position.set(...(c.rim.position as number[]));
        }
        if (c.environment) {
            this.updateEnvironment(c.environment);
        }
    }

    private updateEnvironment(envSettings: any): void {
        if (!this.environmentMap) return;

        const timeFactor = this.settingsManager.getColorInterpolationFactor('smoothstep');
        this.environmentMap.current = timeFactor > 0.5 ? this.environmentMap.night : this.environmentMap.day;
        this.environmentMap.intensity = envSettings.intensity;

        const scene = this.scene.getScene();
        scene.environment = this.environmentMap.current;
        scene.background = null;
        scene.environmentIntensity = envSettings.intensity;

        this.envMapRotationY = envSettings.rotationY || 0;
        scene.environmentRotation.y = this.envMapRotationY;

        this.updateMaterials();
    }

    private updateMaterials(): void {
        if (!this.environmentMap?.current) return;
        const scene = this.scene.getScene();
        
        scene.traverse((child) => {
            if (child instanceof Three.Mesh && child.material) {
                const mat = child.material as Three.MeshStandardMaterial;
                if (mat.isMeshStandardMaterial) {
                    mat.envMap = this.environmentMap!.current;
                    mat.envMapIntensity = this.environmentMap!.intensity;
                    mat.needsUpdate = true;
                }
            }
        });
    }

    private addHelpers(): void {
        const root = this.root;
        if (!root) return;

        if (this.lights.key) {
            const keyHelper = new Three.DirectionalLightHelper(this.lights.key, 0.5);
            this.helpers.push(keyHelper);
            root.add(keyHelper);

            this.shadowCameraHelper = new Three.CameraHelper(this.lights.key.shadow.camera);
            this.helpers.push(this.shadowCameraHelper);
            root.add(this.shadowCameraHelper);
        }
        if (this.lights.fill) {
            const fillHelper = new Three.DirectionalLightHelper(this.lights.fill, 0.5);
            this.helpers.push(fillHelper);
            root.add(fillHelper);
        }
        if (this.lights.rim) {
            const rimHelper = new Three.DirectionalLightHelper(this.lights.rim, 0.5);
            this.helpers.push(rimHelper);
            root.add(rimHelper);
        }
        if (this.lights.lamp) {
            const lampHelper = new Three.PointLightHelper(this.lights.lamp, 0.5);
            this.helpers.push(lampHelper);
            root.add(lampHelper);
        }
        
    }

}
