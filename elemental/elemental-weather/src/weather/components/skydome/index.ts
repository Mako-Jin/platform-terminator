import {
    type ComponentConfig, type DateChangedData,
    datetimeManager, type IObject3DComponent,
    Object3DComponent,
    SceneWrapper,
    type SeasonChangedData, type TimeChangedData,
    type UpdateParams
} from "common-three";
import {type ConfigObject, type EasingType, SettingsManager} from "/@/settings";
import * as Three from 'three';

import skydomeVertexShader from '/@/shaders/Materials/skydome/vertex.glsl';
import skydomeFragmentShader from '/@/shaders/Materials/skydome/fragment.glsl';
import type GUI from "lil-gui";


export default class Skydome extends Object3DComponent {

    private settingsManager: SettingsManager;

    private skydomeMaterial: Three.ShaderMaterial | null = null;
    private skydome: Three.Mesh | undefined;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-skydome', options.isDebugMode);

        this.settingsManager = SettingsManager.getInstance();
    }

    /**
     * 初始化阶段 - 创建天空穹顶
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Skydome] Initializing...');

        // 等待依赖初始化
        await this.waitForDependencies();

        // 创建天空穹顶作为根节点
        this.createSkydome();

        this.logger.info('[Skydome] Initialization complete');
    }

    /**
     * 创建天空穹顶
     */
    private createSkydome(): void {
        const geometry = new Three.SphereGeometry(150, 32, 16);

        this.skydomeMaterial = new Three.ShaderMaterial({
            uniforms: {
                uZenithColor: { value: new Three.Color(0.2, 0.5, 0.9) },
                uHorizonColor: { value: new Three.Color(0.7, 0.85, 0.95) },
                uGroundColor: { value: new Three.Color(0.95, 0.9, 0.85) },

                uSunPosition: { value: new Three.Vector3(-0.846, -0.085, -1.0) },
                uSunColor: { value: new Three.Color(1.0, 0.95, 0.8) },
                uSunGlowColor: { value: new Three.Color(1.0, 0.7, 0.3) },
                uSunSize: { value: 0.005 },
                uSunGlowSize: { value: 0.03386 },
                uSunRayCount: { value: 12.0 },
                uSunRayLength: { value: 0.0352 },
                uSunRaySharpness: { value: 8.0 },

                uMoonPosition: { value: new Three.Vector3(-0.5, -0.085, -1.0) },
                uMoonColor: { value: new Three.Color(0.95, 0.95, 1.0) },
                uMoonGlowColor: { value: new Three.Color(0.7, 0.8, 1.0) },
                uMoonSize: { value: 0.0268665 },
                uMoonGlowSize: { value: 0.0266345 },

                uStarColor: { value: new Three.Color(1.0, 1.0, 1.0) },
                uStarDensity: { value: 10.0 },
                uStarBrightness: { value: 2.5 },

                uTime: { value: 0 },
                uIsNight: { value: 0.0 },
                uSeason: { value: 0.0 },
                uAtmosphereIntensity: { value: 0.0 },
            },
            vertexShader: skydomeVertexShader,
            fragmentShader: skydomeFragmentShader,
            side: Three.BackSide,
        });

        this.skydome = new Three.Mesh(geometry, this.skydomeMaterial);
        this.skydome.name = 'Skydome';

        // 设置为根节点
        this.setRoot(this.skydome);
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Skydome] Activating...');

        // 立即更新天空颜色
        this.updateSkyColors();
    }

    /**
     * 更新天空颜色
     */
    private updateSkyColors(): void {
        const colors = this.getSkydomeColorConfig('smoothstep');

        if (!colors) {
            this.logger.warn('[Skydome] No skydome color config available');
            return;
        }

        if (!this.skydomeMaterial || !this.skydomeMaterial.uniforms) {
            this.logger.warn('[Skydome] Skydome material not initialized');
            return;
        }

        this.updateColorUniform(colors);
        this.updateDayNightUniform(colors);
        this.updateSeasonUniform();
    }

    /**
     * 更新季节 uniform
     */
    private updateSeasonUniform(): void {
        if (!this.skydomeMaterial) {
            return;
        }

        const seasonMap: Record<string, number> = {
            spring: 0,
            summer: 1,
            autumn: 2,
            winter: 3,
            rainy: 4
        };

        const currentSeason = datetimeManager.getCurrentSeason();
        const seasonValue = seasonMap[currentSeason] ?? 0;

        if (this.skydomeMaterial.uniforms.uSeason) {
            this.skydomeMaterial.uniforms.uSeason.value = seasonValue;
        }
    }

    /**
     * 更新昼夜 uniform
     */
    private updateDayNightUniform(colors: ConfigObject): void {
        if (!this.skydomeMaterial) {
            return;
        }

        // ✅ 使用 datetimeManager 获取当前小时
        const currentHour = new Date().getHours();
        const isNight = currentHour < 6 || currentHour >= 18 ? 1.0 : 0.0;

        if (this.skydomeMaterial.uniforms.uIsNight) {
            this.skydomeMaterial.uniforms.uIsNight.value = isNight;
        }

        if (!colors) {
            return;
        }

        const uniforms = this.skydomeMaterial.uniforms;

        if (isNight === 0.0) {
            // 白天 - 更新太阳相关
            if (colors.sunColor && uniforms.uSunColor) {
                uniforms.uSunColor.value.copy(colors.sunColor as Three.Color);
            }
            if (colors.sunGlowColor && uniforms.uSunGlowColor) {
                uniforms.uSunGlowColor.value.copy(colors.sunGlowColor as Three.Color);
            }
        } else {
            // 夜晚 - 更新月亮和星星相关
            if (colors.moonColor && uniforms.uMoonColor) {
                uniforms.uMoonColor.value.copy(colors.moonColor as Three.Color);
            }
            if (colors.moonGlowColor && uniforms.uMoonGlowColor) {
                uniforms.uMoonGlowColor.value.copy(colors.moonGlowColor as Three.Color);
            }
            if (colors.starColor && uniforms.uStarColor) {
                uniforms.uStarColor.value.copy(colors.starColor as Three.Color);
            }
        }
    }

    /**
     * 更新颜色 uniform
     */
    private updateColorUniform(colors: ConfigObject): void {
        if (!this.skydomeMaterial) {
            return;
        }

        const uniforms = this.skydomeMaterial.uniforms;

        if (colors.zenithColor && uniforms.uZenithColor) {
            uniforms.uZenithColor.value.copy(colors.zenithColor as Three.Color);
        }
        if (colors.horizonColor && uniforms.uHorizonColor) {
            uniforms.uHorizonColor.value.copy(colors.horizonColor as Three.Color);
        }
        if (colors.groundColor && uniforms.uGroundColor) {
            uniforms.uGroundColor.value.copy(colors.groundColor as Three.Color);
        }
    }

    public getSkydomeColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('skydome', easing);
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        // 更新时间 uniform
        if (this.skydomeMaterial && this.skydomeMaterial.uniforms) {
            this.skydomeMaterial.uniforms.uTime.value = params.elapsedTime;
        }
    }

    /**
     * 等待依赖初始化
     */
    private async waitForDependencies(): Promise<void> {
        try {
            await this.settingsManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Skydome] Failed to wait for Season Config initialization:', error);
        }
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用
     */
    public onTimeChanged(_data: TimeChangedData): void {
        this.updateSkyColors();
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Skydome] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Skydome] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Skydome] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
        this.updateSkyColors();
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

        const skyFolder = gui.addFolder('Skydome');

        skyFolder
            .addColor(this.skydomeMaterial.uniforms.uZenithColor, 'value')
            .name('Zenith Color');
        skyFolder
            .addColor(this.skydomeMaterial.uniforms.uHorizonColor, 'value')
            .name('Horizon Color');
        skyFolder
            .addColor(this.skydomeMaterial.uniforms.uGroundColor, 'value')
            .name('Ground Color');

        skyFolder
            .add(this.skydomeMaterial.uniforms.uIsNight, 'value', 0, 1)
            .name('Night Mode');
        skyFolder
            .add(this.skydomeMaterial.uniforms.uSeason, 'value', 0, 3)
            .name('Season (0=Spring, 1=Winter, 2=Autumn, 3=Rainy)');
        skyFolder
            .add(this.skydomeMaterial.uniforms.uAtmosphereIntensity, 'value', 0, 3.0)
            .name('Atmosphere');

        const sunFolder = skyFolder.addFolder('Sun');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunPosition.value, 'x', -1, 1)
            .name('Sun X');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunPosition.value, 'y', -1, 1)
            .name('Sun Y');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunPosition.value, 'z', -1, 1)
            .name('Sun Z');
        sunFolder
            .addColor(this.skydomeMaterial.uniforms.uSunColor, 'value')
            .name('Sun Color');
        sunFolder
            .addColor(this.skydomeMaterial.uniforms.uSunGlowColor, 'value')
            .name('Sun Glow');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunSize, 'value', 0.005, 0.05)
            .name('Sun Size');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunGlowSize, 'value', 0.02, 0.2)
            .name('Sun Glow Size');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunRayCount, 'value', 4, 24)
            .step(1)
            .name('Ray Count');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunRayLength, 'value', 0.01, 0.1)
            .name('Ray Length');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunRaySharpness, 'value', 1, 8)
            .name('Ray Sharpness');

        const moonFolder = skyFolder.addFolder('Moon');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonPosition.value, 'x', -1, 1)
            .name('Moon X');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonPosition.value, 'y', -1, 1)
            .name('Moon Y');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonPosition.value, 'z', -1, 1)
            .name('Moon Z');
        moonFolder
            .addColor(this.skydomeMaterial.uniforms.uMoonColor, 'value')
            .name('Moon Color');
        moonFolder
            .addColor(this.skydomeMaterial.uniforms.uMoonGlowColor, 'value')
            .name('Moon Glow');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonSize, 'value', 0.0001, 0.08)
            .name('Moon Size');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonGlowSize, 'value', 0.0005, 0.2)
            .name('Moon Glow Size');

        const starsFolder = skyFolder.addFolder('Stars');
        starsFolder
            .addColor(this.skydomeMaterial.uniforms.uStarColor, 'value')
            .name('Star Color');
        starsFolder
            .add(this.skydomeMaterial.uniforms.uStarDensity, 'value', 0.01, 10.0)
            .name('Star Density');
        starsFolder
            .add(this.skydomeMaterial.uniforms.uStarBrightness, 'value', 0.1, 10.0)
            .name('Star Brightness');
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Skydome] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Skydome] Disposing...');

        datetimeManager.offTimeChanged(() => {});
        datetimeManager.offDateChanged(() => {});
        datetimeManager.offSeasonChanged(() => {});

        if (this.skydome) {
            this.scene.removeObject(this.skydome);
            this.skydome.geometry.dispose();
        }

        // 清理材质引用
        if (this.skydomeMaterial) {
            this.scene.removeObject(this.skydome);
            this.skydomeMaterial.dispose();
            this.skydomeMaterial = null;
        }
    }

}
