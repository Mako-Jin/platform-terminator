import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    type ComponentConfig,
    type DateChangedData,
    type IObject3DComponent,
    Object3DComponent,
    SceneWrapper,
    type SeasonChangedData,
    type TimeChangedData,
    type UpdateParams
} from "common-three";
import ResourcesManager from "/@/resources/manager.ts";


export default class TreesTrunks extends Object3DComponent {

    private resourcesManager: ResourcesManager;
    private treeModel: Three.Group | null = null;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'TreesTrunks', options.isDebugMode);
        
        this.resourcesManager = ResourcesManager.getInstance();
    }

    /**
     * 初始化阶段 - 加载树木模型
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[TreesTrunks] Initializing...');

        const resource = this.resourcesManager.getItem("TreeTrunksModel");
        if (!resource || !resource.scene) {
            this.logger.error('[TreesTrunks] TreeTrunksModel resource not found or invalid');
            return;
        }
        
        this.treeModel = resource.scene;
        this.treeModel!.name = 'TreeTrunksModel';
        
        // 设置为根节点
        this.setRoot(this.treeModel!);

        // 配置阴影
        this.configureShadows();

        this.logger.info('[TreesTrunks] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[TreesTrunks] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用（目前不需要）
     */
    protected onUpdate(params: UpdateParams): void {
        // TreesTrunks 不需要每帧更新
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[TreesTrunks] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[TreesTrunks] Disposing...');
        
        // 清理树模型引用
        this.treeModel = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用（可选）
     */
    public onTimeChanged(_data: TimeChangedData): void {
        // TreesTrunks 不需要响应时间变化
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[TreesTrunks] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[TreesTrunks] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用（可选）
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[TreesTrunks] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
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
        
        // 可以添加更多树木相关的调试选项
        // 例如：模型位置、缩放等
    }

    /**
     * 配置阴影
     */
    private configureShadows(): void {
        if (!this.treeModel) return;

        this.treeModel.traverse((child) => {
            if (child instanceof Three.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
}
