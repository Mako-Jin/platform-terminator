import type {ComponentConfig, IObject3DComponent, ResourceDependencies, UpdateParams} from "../types";
import {LoggerFactory} from "common-tools";
import * as Three from 'three';
import type GUI from "lil-gui";
import {debugPanel} from "../debugger";

/**
 * Object3D 组件抽象基类
 * 实现模板方法模式，提供默认的生命周期实现
 */
export abstract class Object3DComponent implements IObject3DComponent {

    protected logger: ReturnType<typeof LoggerFactory.create>;
    protected scene: Three.Scene;
    protected isDebugMode: boolean;

    private _name: string;
    private _isInitialized: boolean = false;
    private _isActive: boolean = false;
    private _isVisible: boolean = true;
    protected _root: Three.Object3D | null = null;

    protected constructor(scene: Three.Scene, name: string, isDebugMode: boolean = false) {
        this.scene = scene;
        this._name = name;
        this.isDebugMode = isDebugMode;
        this.logger = LoggerFactory.create(`component-${name.toLowerCase()}`);
    }

    // ==================== Getter ====================

    get name(): string {
        return this._name;
    }

    get root(): Three.Object3D | null {
        return this._root;
    }

    get isInitialized(): boolean {
        return this._isInitialized;
    }

    get isActive(): boolean {
        return this._isActive;
    }

    get isVisible(): boolean {
        return this._isVisible;
    }

    // ==================== 模板方法：生命周期 ====================

    /**
     * 【生命周期 1】初始化（模板方法）
     * 定义了初始化的标准流程
     */
    async initialize(config?: ComponentConfig): Promise<void> {
        if (this._isInitialized) {
            this.logger.warn(`[${this._name}] Already initialized, skipping...`);
            return;
        }

        try {
            this.logger.info(`[${this._name}] Initializing...`);

            // 1. 应用配置
            this.applyConfig(config);

            // 2. 验证资源依赖
            await this.validateResources();

            // 3. 执行子类特定的初始化逻辑
            await this.onInitialize(config);

            // 4. 标记为已初始化
            this._isInitialized = true;

            this.logger.info(`[${this._name}] Initialized successfully`);
        } catch (error) {
            this.logger.error(`[${this._name}] Initialization failed:`, error);
            throw error;
        }
    }

    /**
     * 【生命周期 2】激活（模板方法）
     * 将组件添加到场景中
     */
    activate(): void {
        if (this._isActive) {
            this.logger.warn(`[${this._name}] Already active`);
            return;
        }

        if (!this._isInitialized) {
            this.logger.error(`[${this._name}] Cannot activate before initialization`);
            return;
        }

        try {
            this.logger.info(`[${this._name}] Activating...`);

            // 1. 执行子类特定的激活逻辑
            this.onActivate();

            // 2. 将根对象添加到场景
            if (this._root) {
                this.scene.add(this._root);
            }

            // 3. 标记为激活状态
            this._isActive = true;
            this._isVisible = true;

            this.logger.info(`[${this._name}] Activated`);
        } catch (error) {
            this.logger.error(`[${this._name}] Activation failed:`, error);
            throw error;
        }
    }

    /**
     * 【生命周期 3】更新（模板方法）
     * 每帧调用的更新逻辑
     */
    update(params: UpdateParams): void {
        if (!this._isActive || !this._isVisible) {
            return;
        }

        try {
            // 执行子类特定的更新逻辑
            this.onUpdate(params);
        } catch (error) {
            this.logger.error(`[${this._name}] Update failed:`, error);
        }
    }

    /**
     * 【生命周期 4】失活（模板方法）
     * 从场景中移除组件
     */
    deactivate(): void {
        if (!this._isActive) {
            this.logger.warn(`[${this._name}] Not active`);
            return;
        }

        try {
            this.logger.info(`[${this._name}] Deactivating...`);

            // 1. 执行子类特定的失活逻辑
            this.onDeactivate();

            // 2. 从场景中移除根对象
            if (this._root) {
                this.scene.remove(this._root);
            }

            // 3. 标记为失活状态
            this._isActive = false;

            this.logger.info(`[${this._name}] Deactivated`);
        } catch (error) {
            this.logger.error(`[${this._name}] Deactivation failed:`, error);
            throw error;
        }
    }

    /**
     * 【生命周期 5】销毁（模板方法）
     * 清理所有资源
     */
    dispose(): void {
        try {
            this.logger.info(`[${this._name}] Disposing...`);

            // 1. 如果处于激活状态，先失活
            if (this._isActive) {
                this.deactivate();
            }

            // 2. 执行子类特定的销毁逻辑
            this.onDispose();

            // 3. 清理根对象
            if (this._root) {
                this.disposeObject3D(this._root);
                this._root = null;
            }

            // 4. 重置状态
            this._isInitialized = false;

            this.logger.info(`[${this._name}] Disposed`);
        } catch (error) {
            this.logger.error(`[${this._name}] Disposal failed:`, error);
            throw error;
        }
    }

    // ==================== 可见性控制 ====================

    show(): void {
        if (this._root) {
            this._root.visible = true;
        }
        this._isVisible = true;
        this.onShow();
    }

    hide(): void {
        if (this._root) {
            this._root.visible = false;
        }
        this._isVisible = false;
        this.onHide();
    }

    // ==================== 调试面板集成 ====================

    /**
     * 添加到调试面板
     * 子类可以重写此方法来自定义调试配置
     */
    protected addToDebugPanel(): void {
        debugPanel.add({
            component: this,
            configure: (gui, component) => this.configureDebugPanel(gui, component),
        });
    }

    /**
     * 从调试面板移除
     */
    protected removeFromDebugPanel(): void {
        debugPanel.remove(this._name);
    }

    /**
     * 配置调试面板
     * 子类可以重写此方法来添加自定义调试项
     *
     * @param gui lil-gui 实例
     * @param component 组件实例
     */
    protected abstract configureDebugPanel(gui: GUI, component: IObject3DComponent): void;

    // ==================== 可选生命周期钩子 ====================

    onResize?(width: number, height: number): void;

    getResourceDependencies?(): ResourceDependencies;

    // ==================== 受保护的钩子方法（子类重写）====================

    /**
     * 应用配置（子类可重写）
     */
    protected applyConfig(config?: ComponentConfig): void {
        if (config?.isDebugMode !== undefined) {
            this.isDebugMode = config.isDebugMode;
        }
    }

    /**
     * 验证资源依赖（子类可重写）
     */
    protected async validateResources(): Promise<void> {
        const deps = this.getResourceDependencies?.();
        if (!deps) return;

        // 默认实现：检查必需资源是否存在
        // 具体实现由子类根据资源管理器来完成
        this.logger.debug(`[${this._name}] Validating resources...`, deps);
    }

    /**
     * 初始化钩子（子类必须实现特定逻辑）
     */
    protected abstract onInitialize(config?: ComponentConfig): Promise<void>;

    /**
     * 激活钩子（子类可重写）
     */
    protected onActivate(): void {
        // 默认空实现
    }

    /**
     * 更新钩子（子类必须实现特定逻辑）
     */
    protected abstract onUpdate(params: UpdateParams): void;

    /**
     * 失活钩子（子类可重写）
     */
    protected onDeactivate(): void {
        // 默认空实现
    }

    /**
     * 销毁钩子（子类必须实现清理逻辑）
     */
    protected abstract onDispose(): void;

    /**
     * 显示钩子（子类可重写）
     */
    protected onShow(): void {
        // 默认空实现
    }

    /**
     * 隐藏钩子（子类可重写）
     */
    protected onHide(): void {
        // 默认空实现
    }

    // ==================== 工具方法 ====================

    /**
     * 递归清理 Object3D
     */
    protected disposeObject3D(object: Three.Object3D): void {
        // 清理几何体
        if (object instanceof Three.Mesh) {
            if (object.geometry) {
                object.geometry.dispose();
            }

            // 清理材质
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => this.disposeMaterial(material));
                } else {
                    this.disposeMaterial(object.material);
                }
            }
        }

        // 递归清理子对象
        while (object.children.length > 0) {
            this.disposeObject3D(object.children[0]);
            object.remove(object.children[0]);
        }
    }

    /**
     * 清理材质
     */
    protected disposeMaterial(material: Three.Material): void {
        // 清理纹理
        Object.values(material).forEach(value => {
            if (value instanceof Three.Texture) {
                value.dispose();
            }
        });

        // 清理事件监听器
        material.dispose();
    }

    /**
     * 设置根对象
     */
    protected setRoot(root: Three.Object3D): void {
        this._root = root;
        if (this._name && !root.name) {
            root.name = this._name;
        }
    }

    /**
     * 创建组作为根对象
     */
    protected createRootGroup(): Three.Group {
        const group = new Three.Group();
        this.setRoot(group);
        return group;
    }
}

export default Object3DComponent;
