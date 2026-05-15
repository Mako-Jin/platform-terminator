import type { IObject3DComponent, ResourceDependencies, UpdateParams, ComponentConfig, LifecyclePhase } from "../types";
import { LoggerFactory } from "common-tools";
import * as Three from 'three';
import type GUI from "lil-gui";
import { debugPanel } from "../debugger";
import type { DateChangedData, SeasonChangedData, TimeChangedData } from "../datetimes";
import { datetimeManager } from '../datetimes';
import { type SizeChangedData, sizeManager } from "../size";
import { SceneWrapper } from "./scene";

/**
 * Object3D 组件抽象基类
 * 实现模板方法模式，提供默认的生命周期实现
 */
export abstract class Object3DComponent implements IObject3DComponent {

    protected logger: ReturnType<typeof LoggerFactory.create>;
    protected scene: SceneWrapper;
    protected isDebugMode: boolean;

    private _name: string;
    private _isInitialized: boolean = false;
    private _isActive: boolean = false;
    private _isVisible: boolean = true;
    private _isPaused: boolean = false;
    private _receiveShadow: boolean = false;
    protected _root: Three.Object3D | null = null;

    protected constructor(scene: SceneWrapper, name: string, isDebugMode: boolean = false) {
        this.scene = scene;
        this._name = name;
        this.isDebugMode = isDebugMode;
        this.logger = LoggerFactory.create(`component-${name.toLowerCase()}`);
    }

    // ==================== Getters ====================
    get name(): string { return this._name; }
    get root(): Three.Object3D | null { return this._root; }
    get isInitialized(): boolean { return this._isInitialized; }
    get isActive(): boolean { return this._isActive; }
    get isVisible(): boolean { return this._isVisible; }
    get isPaused(): boolean { return this._isPaused; }
    get receiveShadow(): boolean { return this._receiveShadow; }

    // ==================== 核心生命周期 ====================

    async initialize(config?: ComponentConfig): Promise<void> {
        if (this._isInitialized) {
            this.logger.warn(`[${this._name}] Already initialized, skipping...`);
            return;
        }
        await this.executeLifecycle('init', async () => {
            // 1. 应用配置
            this.applyConfig(config);
            // 2. 验证资源依赖
            await this.validateResources();
            // 3. 执行子类特定的初始化逻辑
            await this.onInitialize(config);
            // 4. 注册事件监听器
            this.registerEventListeners();
            // 5. 标记为已初始化
            this._isInitialized = true;
            // 6. 添加调试面板
            if (this.isDebugMode) {
                this.addToDebugPanel();
            }
        });
    }

    activate(): void {
        if (!this._isInitialized) {
            this.logger.error(`[${this._name}] Cannot activate before initialization`);
            return;
        }
        if (this._isActive) {
            this.logger.warn(`[${this._name}] Already active`);
            return;
        }
        this.executeLifecycleSync('active', () => {
            this.onActivate();
            this._isActive = true;
            this._isVisible = true;
        });
    }

    public addToScene(): void {
        if (!this._isActive) this.activate();
        this.executeLifecycleSync('addToScene', () => {
            if (this._root) {
                this.applyShadowSettings(this._root);
                this.scene.addObject(this._root);
            } else {
                this.logger.warn(`[${this._name}] Cannot add to scene: root is null`);
            }
        });
    }

    update(params: UpdateParams): void {
        if (!this._isActive || !this._isVisible || this._isPaused) {
            return;
        }
        try {
            this.onUpdate(params);
        } catch (error) {
            this.handleError('update', error);
        }
    }

    deActivate(): void {
        if (!this._isActive) {
            return;
        }
        this.executeLifecycleSync('deActivate', () => {
            this.onDeactivate();
            if (this._root) {
                this.scene.removeObject(this._root);
            }
            this._isActive = false;
        });
    }

    dispose(): void {
        this.executeLifecycleSync('dispose', () => {
            if (this._isActive) {
                this.deActivate();
            }
            this.unregisterEventListeners();
            this.removeFromDebugPanel();
            this.onDispose();
            if (this._root) {
                this.disposeObject3D(this._root);
                this._root = null;
            }
            this._isInitialized = false;
        });
    }

    // ==================== 扩展生命周期 ====================

    pause(): void {
        if (this._isPaused) {
            return;
        }
        this._isPaused = true;
        this.onPause?.();
    }

    resume(): void {
        if (!this._isPaused) {
            return;
        }
        this._isPaused = false;
        this.onResume?.();
    }

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

    // ==================== 错误处理与工具 ====================

    private async executeLifecycle(phase: LifecyclePhase, fn: () => Promise<void>): Promise<void> {
        try {
            // ✅ 优化：日志带上具体的阶段名称
            this.logger.debug(`[${this._name}] async '${phase}' starting...`);
            await fn();
            this.logger.debug(`[${this._name}] async '${phase}' completed.`);
        } catch (error) {
            this.logger.error(`[${this._name}] async '${phase}' failed:`, error);
            this.handleError(phase, error);
            throw error;
        }
    }

    private executeLifecycleSync(phase: LifecyclePhase, fn: () => void): void {
        try {
            this.logger.error(`[${this._name}] sync '${phase}' starting...`);
            fn();
            this.logger.error(`[${this._name}] sync '${phase}' completed.`);
        } catch (error) {
            this.logger.error(`[${this._name}] sync '${phase}' failed:`, error);
            this.handleError(phase, error);
            throw error;
        }
    }

    private handleError(phase: LifecyclePhase, error: unknown): void {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`[${this._name}] Error in phase '${phase}':`, err);
        this.onError?.(phase, err);
    }

    /**
     * 时间变化回调（可选）
     * 子类可以重写此方法来响应时间变化
     *
     * @param data 时间变化数据
     */
    public onTimeChanged?(data: TimeChangedData): void;

    /**
     * 日期变化回调（可选）
     * 子类可以重写此方法来响应日期/节日变化
     *
     * @param data 日期变化数据
     */
    public onDateChanged?(data: DateChangedData): void;

    /**
     * 季节变化回调（可选）
     * 子类可以重写此方法来响应季节变化
     *
     * @param data 季节变化数据
     */
    public onSeasonChanged?(data: SeasonChangedData): void;

    /**
     * 尺寸变化回调（可选）
     * 子类可以重写此方法来响应窗口/容器尺寸变化
     *
     * @param data 尺寸变化数据
     */
    public onSizeChanged?(data: SizeChangedData): void;

    // ==================== 受保护的钩子 (Hooks) ====================

    protected abstract onInitialize(config?: ComponentConfig): Promise<void>;
    protected onActivate(): void {}
    protected abstract onUpdate(params: UpdateParams): void;
    protected onDeactivate(): void {}
    protected abstract onDispose(): void;
    
    protected onPause?(): void;
    protected onResume?(): void;
    protected onShow(): void {}
    protected onHide(): void {}
    public onError?(phase: LifecyclePhase, error: Error): void;

    // ==================== 事件监听管理 ====================

    private registerEventListeners(): void {
        // 1. 注册时间变化监听器（如果子类实现了 onTimeChanged）
        if (this.onTimeChanged) {
            datetimeManager.onTimeChanged(this.handleTimeChanged.bind(this));
            this.logger.debug(`[${this._name}] Registered time changed listener`);
        }

        // 2. 注册日期变化监听器（如果子类实现了 onDateChanged）
        if (this.onDateChanged) {
            datetimeManager.onDateChanged(this.handleDateChanged.bind(this));
            this.logger.debug(`[${this._name}] Registered date changed listener`);
        }

        // 3. 注册季节变化监听器（如果子类实现了 onSeasonChanged）
        if (this.onSeasonChanged) {
            datetimeManager.onSeasonChanged(this.handleSeasonChanged.bind(this));
            this.logger.debug(`[${this._name}] Registered season changed listener`);
        }

        // 4. 注册尺寸变化监听器（如果子类实现了 onSizeChanged）
        if (this.onSizeChanged) {
            sizeManager.onSizeChanged(this.handleSizeChanged.bind(this));
            this.logger.debug(`[${this._name}] Registered size changed listener`);
        }
    }

    private unregisterEventListeners(): void {
        if (this.onTimeChanged) datetimeManager.offTimeChanged(this.handleTimeChanged.bind(this));
        if (this.onDateChanged) datetimeManager.offDateChanged(this.handleDateChanged.bind(this));
        if (this.onSeasonChanged) datetimeManager.offSeasonChanged(this.handleSeasonChanged.bind(this));
        if (this.onSizeChanged) sizeManager.offSizeChanged(this.handleSizeChanged.bind(this));
    }

    private handleTimeChanged(data: TimeChangedData): void {
        if (this.onTimeChanged && this._isActive) {
            try { 
                this.onTimeChanged(data); 
            } catch (error) { 
                // ✅ 优化：使用更精确的阶段标识
                this.handleError('timeChange', error); 
            }
        }
    }

    private handleDateChanged(data: DateChangedData): void {
        if (this.onDateChanged && this._isActive) {
            try { 
                this.onDateChanged(data); 
            } catch (error) { 
                this.handleError('dateChange', error); 
            }
        }
    }

    private handleSeasonChanged(data: SeasonChangedData): void {
        if (this.onSeasonChanged && this._isActive) {
            try { 
                this.onSeasonChanged(data); 
            } catch (error) { 
                this.handleError('seasonChange', error); 
            }
        }
    }

    private handleSizeChanged(data: SizeChangedData): void {
        if (this.onSizeChanged && this._isActive) {
            try { 
                this.onSizeChanged(data); 
            } catch (error) { 
                this.handleError('sizeChange', error); 
            }
        }
    }

    // ==================== 辅助方法 ====================

    protected applyConfig(config?: ComponentConfig): void {
        if (config?.isDebugMode !== undefined) {
            this.isDebugMode = config.isDebugMode;
        }
    }

    getResourceDependencies?(): ResourceDependencies;

    protected async validateResources(): Promise<void> {
        const deps = this.getResourceDependencies?.();
        if (!deps) {
            return;
        }

        // 默认实现：检查必需资源是否存在
        // 具体实现由子类根据资源管理器来完成
        this.logger.info(`[${this._name}] Validating resources...`, deps);
    }

    protected applyShadowSettings(object: Three.Object3D): void {
        object.traverse((child) => {
            if (child instanceof Three.Mesh) {
                child.receiveShadow = this._receiveShadow;
            }
        });
    }

    protected setReceiveShadow(receive: boolean): void {
        this._receiveShadow = receive;
        if (this._isActive && this._root) {
            this.applyShadowSettings(this._root);
        }
    }

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

    protected setRoot(root: Three.Object3D): void {
        this._root = root;
        if (this._name && !root.name) {
            root.name = this._name;
        }
    }

    protected createRootGroup(): Three.Group {
        const group = new Three.Group();
        this.setRoot(group);
        return group;
    }

    protected addToDebugPanel(): void {
        debugPanel.add({
            component: this,
            configure: (gui, component) => this.configureDebugPanel(gui, component),
        });
    }

    protected removeFromDebugPanel(): void {
        debugPanel.remove(this._name);
    }

    protected abstract configureDebugPanel(gui: GUI, component: IObject3DComponent): void;
}

export default Object3DComponent;
