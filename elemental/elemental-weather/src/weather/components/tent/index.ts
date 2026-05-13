import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    Object3DComponent,
    type ComponentConfig,
    type UpdateParams,
    type DateChangedData,
    type TimeChangedData,
    type SeasonChangedData,
    type IObject3DComponent,
    SceneWrapper,
    resourcesManager
} from "common-three";
import {type ConfigObject, type EasingType, SettingsManager} from "/@/settings";
import {datetimeManager} from "common-three";


interface LampConfig {
    transparent: boolean;
    opacity: number;
    emissiveIntensity: number;
    castShadow: boolean;
}


export default class Tent extends Object3DComponent {

    private tentModel: Three.Group | null = null;
    private lampMeshes: Three.Mesh[] = [];
    private readonly lampConfigs: { day: LampConfig; night: LampConfig };

    private settingsManager: SettingsManager;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'Tent', options.isDebugMode);

        this.settingsManager = SettingsManager.getInstance();

        this.lampConfigs = {
            day: {
                transparent: true,
                opacity: 0.55,
                emissiveIntensity: 0.1,
                castShadow: true,
            },
            night: {
                transparent: false,
                opacity: 1.0,
                emissiveIntensity: 1.0,
                castShadow: false,
            },
        };
    }

    /**
     * 初始化阶段 - 加载帐篷模型
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Tent] Initializing...');

        // 等待依赖初始化
        await this.waitForDependencies();

        const tentResource = resourcesManager.getItemById("tentModel");
        if (!tentResource || !tentResource.scene) {
            this.logger.error('[Tent] tentModel resource not found or invalid');
            return;
        }

        this.tentModel = tentResource.scene;
        this.tentModel!.name = 'TentModel';
        this.tentModel!.scale.set(1.1, 1.1, 1.1);
        this.tentModel!.position.set(2.5, 0.6, -9);
        this.tentModel!.rotation.y = -Math.PI / 60;

        // ✅ 设置为根节点
        this.setRoot(this.tentModel!);

        // 配置材质和阴影
        await this.configureMaterials();

        this.logger.info('[Tent] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Tent] Activating...');

        // 应用初始灯光配置（默认白天）
        const timeKey = datetimeManager.isDaytime() ? 'day' : 'night';
        this.applyLampConfig(timeKey);
    }

    /**
     * 更新阶段 - 每帧调用（目前不需要）
     */
    protected onUpdate(params: UpdateParams): void {
        // Tent 不需要每帧更新
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Tent] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Tent] Disposing...');

        // 清理引用
        this.lampMeshes = [];
        this.tentModel = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用
     */
    public onTimeChanged(data: TimeChangedData): void {
        this.logger.debug(`[Tent] Time changed: ${data.currentTime}`);

        // 根据时间段切换灯光配置
        const timeKey = datetimeManager.isDaytime() ? 'day' : 'night';
        this.applyLampConfig(timeKey);
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Tent] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Tent] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Tent] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);

        // 更新灯颜色
        this.updateLampColor();
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

        // 可以添加更多帐篷相关的调试选项
    }

    /**
     * 配置材质和阴影
     */
    private async configureMaterials(): Promise<void> {
        if (!this.tentModel) return;

        // 加载纹理资源
        const woodColorTexture = resourcesManager.getItemById("woodColorTexture");
        const woodNormalTexture = resourcesManager.getItemById("woodNormalTexture");
        const woodAOTexture = resourcesManager.getItemById("woodAOTexture");

        if (woodColorTexture) {
            woodColorTexture.colorSpace = Three.SRGBColorSpace;
        }

        this.tentModel.traverse((child) => {
            if (!(child instanceof Three.Mesh)) return;

            child.castShadow = true;
            child.receiveShadow = true;

            // 配置木材材质
            if (child.material.name === 'wood') {
                Object.assign(child.material, {
                    map: woodColorTexture?.resource || null,
                    normalMap: woodNormalTexture?.resource || null,
                    aoMap: woodAOTexture?.resource || null,
                    aoMapIntensity: 0.55,
                    roughness: 1.0,
                    color: null,
                });
            }

            // 配置灯玻璃材质
            if (child.material.name === 'Lamp glass.001') {
                const lampColor = this.getLampColor();
                child.material = new Three.MeshStandardMaterial({
                    emissive: lampColor.clone(),
                });
                this.lampMeshes.push(child);
            }
        });
    }

    public getTentConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('tent', easing);
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
     * 获取灯颜色
     */
    private getLampColor(): Three.Color {
        return this.getTentConfig()?.lampColor;
    }

    /**
     * 应用灯光配置
     */
    private applyLampConfig(timeKey: string): void {
        const config = this.lampConfigs[timeKey as keyof typeof this.lampConfigs] || this.lampConfigs.day;

        this.lampMeshes.forEach((mesh) => {
            const mat = mesh.material as Three.MeshStandardMaterial;

            mesh.castShadow = config.castShadow;
            if (mat.transparent !== config.transparent) {
                mat.transparent = config.transparent;
                mat.needsUpdate = true;
            }

            mat.opacity = config.opacity;
            mat.emissiveIntensity = config.emissiveIntensity;
        });

        this.logger.debug(`[Tent] Applied lamp config: ${timeKey}`);
    }

    /**
     * 更新灯颜色
     */
    private updateLampColor(): void {
        const lampColor = this.getLampColor();

        this.lampMeshes.forEach((mesh) => {
            const mat = mesh.material as Three.MeshStandardMaterial;
            mat.emissive.copy(lampColor);
        });

        this.logger.debug('[Tent] Updated lamp color for season');
    }

    /**
     * 从时间字符串提取小时
     */
    private getHourFromTime(timeString: string): number {
        // 假设时间格式为 "HH:mm"
        const parts = timeString.split(':');
        return parseInt(parts[0], 10);
    }
}
