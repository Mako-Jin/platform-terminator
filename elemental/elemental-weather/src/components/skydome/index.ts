import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    type ComponentConfig,
    type DateChangedData,
    type IObject3DComponent,
    Object3DComponent,
    SceneWrapper,
    datetimeManager,
    type SeasonChangedData,
    type TimeChangedData,
    type UpdateParams
} from "common-three";
import ColorManager from "/@/manager/ColorManager.ts";
import type {ConfigObject} from "/@/utils/color.ts";

import skydomeVertexShader from '/@/shaders/Materials/skydome/vertex.glsl';
import skydomeFragmentShader from '/@/shaders/Materials/skydome/fragment.glsl';
import SeasonConfigManager from "/@/resources/loader";


export default class Skydome extends Object3DComponent {

    private seasonConfigManager: SeasonConfigManager;
    private colorManager: ColorManager;

    private skydomeMaterial: Three.ShaderMaterial | null = null;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-skydome', options.isDebugMode);

        this.seasonConfigManager = SeasonConfigManager.getInstance();
        this.colorManager = ColorManager.getInstance();
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
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Skydome] Activating...');

        // 立即更新天空颜色
        this.updateSkyColors();
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

        // 清理材质引用
        if (this.skydomeMaterial) {
            this.skydomeMaterial.dispose();
            this.skydomeMaterial = null;
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

        // 可以添加更多天空相关的调试选项
        // 例如：太阳位置、月亮位置、星星密度等
    }

    /**
     * 等待依赖初始化
     */
    private async waitForDependencies(): Promise<void> {
        try {
            await this.seasonConfigManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Skydome] Failed to wait for Season Config initialization:', error);
        }
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

        const skydome = new Three.Mesh(geometry, this.skydomeMaterial);
        skydome.name = 'Skydome';

        // 设置为根节点
        this.setRoot(skydome);
    }

    /**
     * 更新天空颜色
     */
    private updateSkyColors(): void {
        const colors = this.colorManager.getSkydomeColorConfig('smoothstep');

        if (!colors) {
            this.logger.warn('[Skydome] No skydome color config available');
            return;
        }

        if (!this.skydomeMaterial || !this.skydomeMaterial.uniforms) {
            this.logger.warn('[Skydome] Skydome material not initialized');
            return;
        }

        this.updateColorUniform(colors);
        this.updateDayNightUniform();
        this.updateSeasonUniform();
    }

    /**
     * 更新颜色 uniform
     */
    private updateColorUniform(colors: ConfigObject): void {
        if (!this.skydomeMaterial) return;

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

    /**
     * 更新昼夜 uniform
     */
    private updateDayNightUniform(): void {
        if (!this.skydomeMaterial) return;

        // ✅ 使用 datetimeManager 获取当前小时
        const currentHour = new Date().getHours();
        const isNight = currentHour < 6 || currentHour >= 18 ? 1.0 : 0.0;

        if (this.skydomeMaterial.uniforms.uIsNight) {
            this.skydomeMaterial.uniforms.uIsNight.value = isNight;
        }

        const colors = this.colorManager.getSkydomeColorConfig('smoothstep');
        if (!colors) return;

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
     * 更新季节 uniform
     */
    private updateSeasonUniform(): void {
        if (!this.skydomeMaterial) return;

        const seasonMap: Record<string, number> = {
            spring: 0,
            summer: 1,
            autumn: 2,
            winter: 3
        };

        const currentSeason = datetimeManager.getCurrentSeason();
        const seasonValue = seasonMap[currentSeason] ?? 0;

        if (this.skydomeMaterial.uniforms.uSeason) {
            this.skydomeMaterial.uniforms.uSeason.value = seasonValue;
        }
    }
}
