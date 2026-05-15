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


export default class Camp extends Object3DComponent {

    private campModel: Three.Group | null = null;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'Camp', options.isDebugMode);
    }

    /**
     * 初始化阶段 - 加载营地模型
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Camp] Initializing...');

        const campResource = resourcesManager.getItemById("campModel");
        if (!campResource || !campResource.scene) {
            this.logger.error('[Camp] campModel resource not found or invalid');
            return;
        }

        this.campModel = campResource.scene;
        this.campModel!.name = 'CampModel';

        // ✅ 设置为根节点
        this.setRoot(this.campModel!);

        // 配置阴影
        this.configureShadows();

        this.logger.info('[Camp] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Camp] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用（目前不需要）
     */
    protected onUpdate(params: UpdateParams): void {
        // Camp 不需要每帧更新
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Camp] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Camp] Disposing...');

        // 清理引用
        this.campModel = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用（可选）
     */
    public onTimeChanged(_data: TimeChangedData): void {
        // Camp 不需要响应时间变化
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Camp] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Camp] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用（可选）
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Camp] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
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

        // 可以添加更多营地相关的调试选项
    }

    /**
     * 配置阴影
     */
    private configureShadows(): void {
        if (!this.campModel) {
            return;
        }

        this.campModel.traverse((child) => {
            if (!(child instanceof Three.Mesh)) {
                return;
            }

            child.castShadow = true;
            child.receiveShadow = true;
        });
    }
}
