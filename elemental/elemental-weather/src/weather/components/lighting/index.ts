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
    } | null;

    private envMapRotationY: number = 0;
    private envMapRotationX: number = 0;
    private envMapRotationZ: number = 0;

    // 灯光组（作为根节点）
    private lightsGroup: Three.Group | null = null;
    private shadowCameraHelper: Three.CameraHelper;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {isDebugMode: false}) {
        super(scene, 'weather-lighting', options.isDebugMode);

        this.helperEnabled = this.isDebugMode;

        this.settingsManager = SettingsManager.getInstance();

        this.environmentMap = null;
    }

    public getLightingConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('lighting', easing);
    }

    /**
     * 初始化阶段 - 创建灯光和环境
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Lighting] Initializing...');

        // 等待依赖初始化
        await this.waitForDependencies();

        // 创建灯光组作为根节点
        this.lightsGroup = new Three.Group();
        this.lightsGroup.name = 'LightsGroup';
        this.setRoot(this.lightsGroup);

        // 创建灯光
        this.logger.info('[Lighting] Creating lights...');
        this.createLights();
        this.configureShadows();
        this.setupEnvironment();

        this.logger.info('[Lighting] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Lighting] Activating...');

        // 刷新灯光配置
        this.refreshLightingConfig();

        // 添加调试辅助
        if (this.helperEnabled) {
            this.addHelpers();
        }
    }

    /**
     * 更新阶段 - 每帧调用（目前不需要）
     */
    protected onUpdate(params: UpdateParams): void {
        // Lighting 不需要每帧更新
        // 时间和季节变化通过事件监听器处理
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Lighting] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Lighting] Disposing...');

        // 清理环境贴图引用
        if (this.environmentMap) {
            this.environmentMap.current = null;
            this.environmentMap = null;
        }

        // 清理灯光引用
        this.lights.key = null;
        this.lights.fill = null;
        this.lights.ambient = null;
        this.lights.rim = null;
        this.lights.lamp = null;

        if (this.shadowCameraHelper) {
            this.scene.removeObject(this.shadowCameraHelper);
        }
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用
     */
    public onTimeChanged(_data: TimeChangedData): void {
        // 根据时间更新色调映射和灯光
        this.refreshLightingConfig();
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Lighting] Date changed: ${data.currentDate}`);
        if (data.isFestival) {
            this.logger.info(`[Lighting] Festival detected: ${data.festivalName}`);
            // 可以在这里添加节日特效
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Lighting] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
        this.refreshLightingConfig();
    }

    /**
     * ✅ 配置调试面板（必须实现的抽象方法）
     */
    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        // 添加基本信息
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();
        gui.add({ visible: component.isVisible }, 'visible').name('Visible').disable();

        gui.add(this.lights.key, 'color', { type: 'color', label: 'Key Light Color' }, 'Lighting');
        gui.add(this.lights.key, 'intensity', { min: 0, max: 5.0, step: 0.05, label: 'Key Light Intensity' }, 'Lighting');
        gui.add(this.lights.key.position, 'x', { min: -30, max: 30, step: 0.5, label: 'Key Light Position X' }, 'Lighting');
        gui.add(this.lights.key.position, 'y', { min: 0, max: 30, step: 0.5, label: 'Key Light Position Y' }, 'Lighting');
        gui.add(this.lights.key.position, 'z', { min: -30, max: 30, step: 0.5, label: 'Key Light Position Z' }, 'Lighting');
        gui.add(this.lights.fill, 'color', { type: 'color', label: 'Fill Light Color' }, 'Lighting');
        gui.add(this.lights.fill, 'intensity', { min: 0, max: 2.0, step: 0.05, label: 'Fill Light Intensity' }, 'Lighting');
        gui.add(this.lights.fill.position, 'x', { min: -30, max: 30, step: 0.5, label: 'Fill Light Position X' }, 'Lighting');
        gui.add(this.lights.fill.position, 'y', { min: 0, max: 30, step: 0.5, label: 'Fill Light Position Y' }, 'Lighting');
        gui.add(this.lights.fill.position, 'z', { min: -30, max: 30, step: 0.5, label: 'Fill Light Position Z' },'Lighting');
        gui.add(this.lights.ambient, 'color', { type: 'color', label: 'Ambient Light Color' }, 'Lighting');
        gui.add(this.lights.ambient, 'intensity', { min: 0, max: 2.0, step: 0.05, label: 'Ambient Light Intensity' }, 'Lighting');

        gui.add(this.lights.rim, 'color', { type: 'color', label: 'Rim Light Color' }, 'Lighting');
        gui.add(this.lights.rim, 'intensity', { min: 0, max: 2.0, step: 0.05, label: 'Rim Light Intensity' }, 'Lighting');
        gui.add(this.lights.rim.position, 'x', { min: -30, max: 30, step: 0.5, label: 'Rim Light Position X' }, 'Lighting');
        gui.add(this.lights.rim.position, 'y', { min: 0, max: 30, step: 0.5, label: 'Rim Light Position Y' }, 'Lighting');
        gui.add(this.lights.rim.position, 'z', { min: -30, max: 30, step: 0.5, label: 'Rim Light Position Z' }, 'Lighting');
        gui.add(this.environmentMap, 'intensity',
            {min: 0, max: 2.0, step: 0.05, label: 'Environment Intensity',
                onChange: () => this.updateMaterials(),
            },
            'Lighting'
        );
        gui.add(this, 'envMapRotationY',
            {min: 0, max: 10, step: 0.01, label: 'Environment Rotation Y',
                onChange: () => {
                    this.getScene().environmentRotation.y = this.envMapRotationY;
                    this.getScene().backgroundRotation.y = this.envMapRotationY;
                },
            },
            'Lighting'
        );
        gui.add(this, 'envMapRotationX',
            {min: 0, max: 10, step: 0.01, label: 'Environment Rotation X',
                onChange: () => {
                    this.getScene().environmentRotation.x = this.envMapRotationX;
                    this.getScene().backgroundRotation.x = this.envMapRotationX;
                },
            },
            'Lighting'
        );
        gui.add(this, 'envMapRotationZ', {
            min: 0, max: 10, step: 0.01, label: 'Environment Rotation Z',
                onChange: () => {
                    this.getScene().environmentRotation.z = this.envMapRotationZ;
                    this.getScene().backgroundRotation.z = this.envMapRotationZ;
                },
            },
            'Lighting'
        );
    }

    /**
     * 等待依赖初始化
     */
    private async waitForDependencies(): Promise<void> {
        try {
            await this.settingsManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Lighting] Failed to wait for Season config initialization:', error);
        }
    }

    /**
     * 刷新灯光配置
     */
    private refreshLightingConfig(): void {
        this.logger.debug('[Lighting] Refreshing lighting config...');
        const config = this.getLightingConfig('smoothstep');

        if (config) {
            this.applyLightingConfig(config);
        } else {
            this.logger.warn('[Lighting] Lighting config not available yet');
        }
    }

    /**
     * 创建灯光
     */
    private createLights(): void {
        if (!this.lightsGroup) {
            return;
        }

        // 点光源（台灯）
        this.lights.lamp = new Three.PointLight();
        this.lights.lamp.name = 'lampLight';
        this.lightsGroup.add(this.lights.lamp);

        // 主光源（太阳光）
        this.lights.key = new Three.DirectionalLight();
        this.lights.key.name = 'keyLight';
        this.lightsGroup.add(this.lights.key);

        // 补光
        this.lights.fill = new Three.DirectionalLight();
        this.lights.fill.name = 'fillLight';
        this.lightsGroup.add(this.lights.fill);

        // 环境光
        this.lights.ambient = new Three.AmbientLight();
        this.lights.ambient.name = 'ambientLight';
        this.lightsGroup.add(this.lights.ambient);

        // 边缘光
        this.lights.rim = new Three.DirectionalLight();
        this.lights.rim.name = 'rimLight';
        this.lightsGroup.add(this.lights.rim);
    }

    /**
     * 配置阴影
     */
    private configureShadows(): void {
        const shadowSize = 2048;
        const frustumSize = 12;

        if (this.lights.key) {
            this.lights.key.castShadow = true;
            this.lights.key.shadow.mapSize.set(shadowSize, shadowSize);
            this.lights.key.shadow.camera.left = -frustumSize;
            this.lights.key.shadow.camera.right = frustumSize;
            this.lights.key.shadow.camera.top = frustumSize;
            this.lights.key.shadow.camera.bottom = -frustumSize;
            this.lights.key.shadow.camera.near = 0.1;
            this.lights.key.shadow.camera.far = 60;
            this.lights.key.shadow.bias = -0.0001;
            this.lights.key.shadow.normalBias = 0.02;
            this.lights.key.shadow.radius = 2;
        }
    }

    /**
     * 设置环境贴图
     */
    private setupEnvironment(): void {
        const dayTexture = resourcesManager.getItemById<Three.Texture>("environmentMapDayTexture");
        const nightTexture = resourcesManager.getItemById<Three.Texture>("environmentMapNightTexture");

        if (!dayTexture || !nightTexture) {
            this.logger.warn('[Lighting] Environment map textures not found in ResourcesManager');
            return;
        }

        this.environmentMap = {
            day: dayTexture,
            night: nightTexture,
            current: null,
            intensity: 0.3,
        };

        this.environmentMap.day.colorSpace = Three.SRGBColorSpace;
        this.environmentMap.night.colorSpace = Three.SRGBColorSpace;
    }

    /**
     * 应用灯光配置
     */
    private applyLightingConfig(config: ConfigObject | null | undefined): void {
        if (!config) {
            return;
        }

        const interpolatedConfig = config as any;

        if (this.lights.lamp && interpolatedConfig.lamp) {
            this.lights.lamp.color.setHex(interpolatedConfig.lamp.color);
            this.lights.lamp.intensity = interpolatedConfig.lamp.intensity;
            // ✅ 修复：显式转换为 number[] 类型
            const lampPos = interpolatedConfig.lamp.position as number[];
            this.lights.lamp.position.set(lampPos[0], lampPos[1], lampPos[2]);
            this.lights.lamp.castShadow = interpolatedConfig.lamp.castShadow;
            this.lights.lamp.distance = interpolatedConfig.lamp.distance;
            this.lights.lamp.decay = interpolatedConfig.lamp.decay;
        }

        if (this.lights.key && interpolatedConfig.key) {
            this.lights.key.color.setHex(interpolatedConfig.key.color);
            this.lights.key.intensity = interpolatedConfig.key.intensity;
            // ✅ 修复：显式转换为 number[] 类型
            const keyPos = interpolatedConfig.key.position as number[];
            this.lights.key.position.set(keyPos[0], keyPos[1], keyPos[2]);
            this.lights.key.castShadow = interpolatedConfig.key.castShadow;
        }

        if (this.lights.fill && interpolatedConfig.fill) {
            this.lights.fill.color.setHex(interpolatedConfig.fill.color);
            this.lights.fill.intensity = interpolatedConfig.fill.intensity;
            // ✅ 修复：显式转换为 number[] 类型
            const fillPos = interpolatedConfig.fill.position as number[];
            this.lights.fill.position.set(fillPos[0], fillPos[1], fillPos[2]);
        }

        if (this.lights.ambient && interpolatedConfig.ambient) {
            this.lights.ambient.color.setHex(interpolatedConfig.ambient.color);
            this.lights.ambient.intensity = interpolatedConfig.ambient.intensity;
        }

        if (this.lights.rim && interpolatedConfig.rim) {
            this.lights.rim.color.setHex(interpolatedConfig.rim.color);
            this.lights.rim.intensity = interpolatedConfig.rim.intensity;
            // ✅ 修复：显式转换为 number[] 类型
            const rimPos = interpolatedConfig.rim.position as number[];
            this.lights.rim.position.set(rimPos[0], rimPos[1], rimPos[2]);
        }

        if (interpolatedConfig.environment) {
            this.updateEnvironment(interpolatedConfig.environment);
        }
    }

    /**
     * 更新环境
     */
    private updateEnvironment(envSettings: any): void {
        if (!this.environmentMap) {
            return;
        }

        // ✅ 使用 colorManager 获取颜色插值因子
        const timeFactor = this.settingsManager.getColorInterpolationFactor('smoothstep');
        this.environmentMap.current = this.interpolateEnvironmentMap(timeFactor);
        this.environmentMap.intensity = envSettings.intensity;

        const scene = this.getScene();
        if (scene) {
            scene.environment = this.environmentMap.current;
            scene.background = null;
            scene.environmentIntensity = envSettings.intensity;

            this.envMapRotationY = envSettings.rotationY || 0;
            this.envMapRotationX = envSettings.rotationX || 0;
            this.envMapRotationZ = envSettings.rotationZ || 0;

            scene.environmentRotation.y = this.envMapRotationY;
            scene.environmentRotation.x = this.envMapRotationX;
            scene.environmentRotation.z = this.envMapRotationZ;
        }

        this.updateMaterials();
    }

    /**
     * 插值环境贴图
     */
    private interpolateEnvironmentMap(timeFactor: number): Three.Texture | null {
        if (!this.environmentMap) {
            return null;
        }

        if (timeFactor <= 0) {
            return this.environmentMap.day;
        } else if (timeFactor >= 1) {
            return this.environmentMap.night;
        } else {
            return this.environmentMap.day;
        }
    }

    /**
     * 更新材质环境贴图
     */
    private updateMaterials(): void {
        if (!this.environmentMap?.current) {
            return;
        }

        const scene = this.getScene();
        if (!scene) {
            return;
        }

        scene.traverse((child) => {
            if (child instanceof Three.Mesh && child.material) {
                const material = child.material as Three.Material;

                if (
                    material instanceof Three.MeshStandardMaterial ||
                    material instanceof Three.MeshPhysicalMaterial
                ) {
                    material.envMap = this.environmentMap!.current;
                    material.envMapIntensity = this.environmentMap!.intensity;

                    if (material.roughness > 0.6) {
                        material.roughness = 0.75;
                    }

                    material.needsUpdate = true;
                } else if (
                    material instanceof Three.MeshPhongMaterial ||
                    material instanceof Three.MeshBasicMaterial
                ) {
                    material.envMap = this.environmentMap!.current;

                    // ✅ 使用 colorManager 获取颜色插值因子
                    const timeFactor = this.settingsManager.getColorInterpolationFactor('smoothstep');
                    material.reflectivity = 0.5 - timeFactor * 0.2;
                    material.needsUpdate = true;
                }
            }
        });
    }

    /**
     * 添加调试辅助
     */
    private addHelpers(): void {
        if (!this.lightsGroup) {
            return;
        }
        
        if (this.lights.key) {
            const keyHelper = new Three.DirectionalLightHelper(this.lights.key, 0.5);
            this.lightsGroup.add(keyHelper);

            this.shadowCameraHelper = new Three.CameraHelper(
                this.lights.key.shadow.camera
            );
            this.lightsGroup.add(this.shadowCameraHelper);
        }

        if (this.lights.fill) {
            const fillHelper = new Three.DirectionalLightHelper(this.lights.fill, 0.5);
            this.lightsGroup.add(fillHelper);
        }
        if (this.lights.rim) {
            const rimHelper = new Three.DirectionalLightHelper(this.lights.rim, 0.5);
            this.lightsGroup.add(rimHelper);
        }
        if (this.lights.lamp) {
            const lampHelper = new Three.PointLightHelper(this.lights.lamp, 0.5);
            this.lightsGroup.add(lampHelper);
        }
        
    }

    /**
     * 获取场景实例
     */
    private getScene(): Three.Scene {
        return this.scene.getScene();
    }
}
