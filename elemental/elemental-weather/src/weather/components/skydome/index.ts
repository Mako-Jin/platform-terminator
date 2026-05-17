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
import { 
    DEFAULT_SKY_COLORS, 
    DEFAULT_UNIFORMS, 
    SEASON_MAP, 
    GEOMETRY_DEFAULTS,
    type SkyColorConfig 
} from './defaults';


export default class Skydome extends Object3DComponent {

    private settingsManager: SettingsManager;

    private skydomeMaterial: Three.ShaderMaterial | null = null;
    private skydomeMesh: Three.Mesh | null = null;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-skydome', options.isDebugMode);

        this.settingsManager = SettingsManager.getInstance();
    }

    /**
     * 初始化阶段 - 创建天空穹顶
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Skydome] Initializing...');

        await this.waitForDependencies();

        this.createSkydome();

        this.logger.info('[Skydome] Initialization complete');
    }

    /**
     * 激活阶段 - 应用初始颜色配置
     */
    protected onActivate(): void {
        this.logger.info('[Skydome] Activating...');

        this.updateSkyColors();
    }

    /**
     * 创建天空穹顶并设置为根节点
     */
    private createSkydome(): void {
        const geometry = new Three.SphereGeometry(
            GEOMETRY_DEFAULTS.radius,
            GEOMETRY_DEFAULTS.widthSegments,
            GEOMETRY_DEFAULTS.heightSegments
        );

        this.skydomeMaterial = new Three.ShaderMaterial({
            uniforms: {
                uZenithColor: { value: DEFAULT_UNIFORMS.uZenithColor.clone() },
                uHorizonColor: { value: DEFAULT_UNIFORMS.uHorizonColor.clone() },
                uGroundColor: { value: DEFAULT_UNIFORMS.uGroundColor.clone() },

                uSunPosition: { value: DEFAULT_UNIFORMS.uSunPosition.clone() },
                uSunColor: { value: DEFAULT_UNIFORMS.uSunColor.clone() },
                uSunGlowColor: { value: DEFAULT_UNIFORMS.uSunGlowColor.clone() },
                uSunSize: { value: DEFAULT_UNIFORMS.uSunSize },
                uSunGlowSize: { value: DEFAULT_UNIFORMS.uSunGlowSize },
                uSunRayCount: { value: DEFAULT_UNIFORMS.uSunRayCount },
                uSunRayLength: { value: DEFAULT_UNIFORMS.uSunRayLength },
                uSunRaySharpness: { value: DEFAULT_UNIFORMS.uSunRaySharpness },

                uMoonPosition: { value: DEFAULT_UNIFORMS.uMoonPosition.clone() },
                uMoonColor: { value: DEFAULT_UNIFORMS.uMoonColor.clone() },
                uMoonGlowColor: { value: DEFAULT_UNIFORMS.uMoonGlowColor.clone() },
                uMoonSize: { value: DEFAULT_UNIFORMS.uMoonSize },
                uMoonGlowSize: { value: DEFAULT_UNIFORMS.uMoonGlowSize },

                uStarColor: { value: DEFAULT_UNIFORMS.uStarColor.clone() },
                uStarDensity: { value: DEFAULT_UNIFORMS.uStarDensity },
                uStarBrightness: { value: DEFAULT_UNIFORMS.uStarBrightness },

                uTime: { value: DEFAULT_UNIFORMS.uTime },
                uIsNight: { value: DEFAULT_UNIFORMS.uIsNight },
                uSeason: { value: DEFAULT_UNIFORMS.uSeason },
                uAtmosphereIntensity: { value: DEFAULT_UNIFORMS.uAtmosphereIntensity },
            },
            vertexShader: skydomeVertexShader,
            fragmentShader: skydomeFragmentShader,
            side: Three.BackSide,
        });

        this.skydomeMesh = new Three.Mesh(geometry, this.skydomeMaterial);
        this.skydomeMesh.name = 'Skydome';

        this.setRoot(this.skydomeMesh);
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        if (this.skydomeMaterial) {
            this.skydomeMaterial.uniforms.uTime.value = params.elapsedTime;
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
     * 更新天空颜色配置
     */
    private updateSkyColors(): void {
        if (!this.skydomeMaterial || !this.skydomeMaterial.uniforms) {
            this.logger.warn('[Skydome] Material not ready');
            return;
        }

        const currentSeason = datetimeManager.getCurrentSeason();
        const isNight = datetimeManager.isNighttime();

        const colors = this.getSkyColors(currentSeason, isNight);

        this.applyColorConfiguration(colors, isNight, currentSeason);
    }

    /**
     * 获取颜色配置（优先使用 SettingsManager，回退到内置预设）
     */
    private getSkyColors(season: string, isNight: boolean): SkyColorConfig | undefined {
        const configKey = isNight ? 'night' : 'day';
        
        const config = this.settingsManager.getComponentConfig('skydome', 'smoothstep');
        
        if (config && config[season] && config[season][configKey]) {
            return config[season][configKey];
        }

        return DEFAULT_SKY_COLORS[season]?.[configKey];
    }

    /**
     * 应用颜色配置到 uniform
     */
    private applyColorConfiguration(colors: SkyColorConfig | undefined, isNight: boolean, season: string): void {
        if (!colors || !this.skydomeMaterial) {
            return;
        }

        const uniforms = this.skydomeMaterial.uniforms;

        uniforms.uZenithColor.value.copy(colors.zenithColor);
        uniforms.uHorizonColor.value.copy(colors.horizonColor);
        uniforms.uGroundColor.value.copy(colors.groundColor);

        uniforms.uIsNight.value = isNight ? 1.0 : 0.0;

        uniforms.uSeason.value = SEASON_MAP[season] ?? 0;

        if (!isNight) {
            if (colors.sunColor) uniforms.uSunColor.value.copy(colors.sunColor);
            if (colors.sunGlowColor) uniforms.uSunGlowColor.value.copy(colors.sunGlowColor);
        } else {
            if (colors.moonColor) uniforms.uMoonColor.value.copy(colors.moonColor);
            if (colors.moonGlowColor) uniforms.uMoonGlowColor.value.copy(colors.moonGlowColor);
            if (colors.starColor) uniforms.uStarColor.value.copy(colors.starColor);
        }
    }

    /**
     * 等待依赖初始化
     */
    private async waitForDependencies(): Promise<void> {
        try {
            await this.settingsManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Skydome] Failed to wait for SettingsManager initialization:', error);
        }
    }

    /**
     * ✅ 配置调试面板
     */
    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();
        gui.add({ visible: component.isVisible }, 'visible').name('Visible').disable();

        if (!this.skydomeMaterial) return;

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

        if (this.skydomeMesh) {
            this.skydomeMesh.geometry.dispose();
            this.skydomeMesh = null;
        }

        if (this.skydomeMaterial) {
            this.skydomeMaterial.dispose();
            this.skydomeMaterial = null;
        }
    }

}
