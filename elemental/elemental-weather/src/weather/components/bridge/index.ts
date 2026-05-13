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
    SceneWrapper
} from "common-three";
import {SettingsManager} from "/@/settings";
import {resourcesManager} from "common-three";


export default class Bridge extends Object3DComponent {

    private settingsManager: SettingsManager;
    private bridgeModel: Three.Group | null = null;
    private woodColorMultiplier: Three.Color;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'Bridge', options.isDebugMode);

        this.settingsManager = SettingsManager.getInstance();
        this.woodColorMultiplier = new Three.Color(0.55, 0.4, 0.18);
    }

    /**
     * 初始化阶段 - 加载桥梁模型
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Bridge] Initializing...');

        const bridgeResource = resourcesManager.getItemById("bridgeModel");
        if (!bridgeResource || !bridgeResource.scene) {
            this.logger.error('[Bridge] bridgeModel resource not found or invalid');
            return;
        }

        this.bridgeModel = bridgeResource.scene;
        this.bridgeModel!.name = 'BridgeModel';
        this.bridgeModel!.scale.set(0.8, 0.8, 0.85);
        this.bridgeModel!.position.set(-8.0, 1.5, 1.25);
        this.bridgeModel!.rotation.y = Math.PI;
        this.bridgeModel!.rotation.z = Math.PI / 30;

        // ✅ 设置为根节点
        this.setRoot(this.bridgeModel!);

        // 配置材质和阴影
        await this.configureMaterials();

        this.logger.info('[Bridge] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Bridge] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用（目前不需要）
     */
    protected onUpdate(params: UpdateParams): void {
        // Bridge 不需要每帧更新
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Bridge] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Bridge] Disposing...');

        // 清理引用
        this.bridgeModel = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用（可选）
     */
    public onTimeChanged(_data: TimeChangedData): void {
        // Bridge 不需要响应时间变化
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Bridge] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Bridge] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用（可选）
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Bridge] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
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

        // 木材颜色调试选项
        if (this.bridgeModel) {
            const woodColorController = gui.addColor(
                {
                    woodColor: this.woodColorMultiplier.getHex()
                },
                'woodColor'
            ).name('Wood Color');

            woodColorController.onChange((hex: number) => {
                this.woodColorMultiplier.setHex(hex);
                this.updateWoodColor();
            });
        }
    }

    /**
     * 配置材质和阴影
     */
    private async configureMaterials(): Promise<void> {
        if (!this.bridgeModel) return;

        // 加载纹理资源
        const woodColorMap = resourcesManager.getItemById("woodColorTexture");
        const woodNormalMap = resourcesManager.getItemById("woodNormalTexture");
        const woodAOMap = resourcesManager.getItemById("woodAOTexture");

        this.bridgeModel.traverse((child) => {
            if (!(child instanceof Three.Mesh)) {
                return;
            }

            child.castShadow = true;
            child.receiveShadow = true;

            // 配置木材材质
            if (child.material.name === 'Material.001') {
                child.material.map = woodColorMap?.resource || null;
                child.material.normalMap = woodNormalMap?.resource || null;
                child.material.aoMap = woodAOMap?.resource || null;
                child.material.aoMapIntensity = 0.15;
                child.material.roughness = 1.0;
                child.material.color = this.woodColorMultiplier.clone();
            }
        });
    }

    /**
     * 更新木材颜色
     */
    private updateWoodColor(): void {
        if (!this.bridgeModel) return;

        this.bridgeModel.traverse((child) => {
            if (!(child instanceof Three.Mesh)) return;

            if (child.material.name === 'Material.001') {
                child.material.color = this.woodColorMultiplier.clone();
            }
        });

        this.logger.debug('[Bridge] Updated wood color');
    }
}
