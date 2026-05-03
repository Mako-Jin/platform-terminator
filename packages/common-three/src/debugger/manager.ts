import {LoggerFactory} from "common-tools";
import GUI from "lil-gui";
import type {DebugConfig} from "./types.ts";
import type {IObject3DComponent} from "../types";


/**
 * 调试面板管理器（单例）
 */
export class DebugPanelManager {

    private static instance: DebugPanelManager | null = null;
    private logger = LoggerFactory.create('debug-panel');

    private gui: GUI | null = null;
    private isDebugMode: boolean = false;
    private components: Map<string, DebugConfig> = new Map();
    private folders: Map<string, GUI> = new Map();

    private constructor() {}

    /**
     * 获取单例实例
     */
    static getInstance(): DebugPanelManager {
        if (!DebugPanelManager.instance) {
            DebugPanelManager.instance = new DebugPanelManager();
        }
        return DebugPanelManager.instance;
    }

    /**
     * 初始化调试面板
     *
     * @param isDebugMode 是否启用调试模式
     * @param container 容器元素（可选，默认添加到 body）
     */
    initialize(isDebugMode: boolean, container?: HTMLElement): void {
        this.isDebugMode = isDebugMode;

        if (!isDebugMode) {
            this.logger.info('Debug mode is disabled, debug panel will not be created');
            return;
        }

        if (this.gui) {
            this.logger.warn('Debug panel already initialized');
            return;
        }

        try {
            this.gui = new GUI({
                container,
                title: '🎮 Debug Panel',
                width: 320,
            });

            this.logger.info('Debug panel initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize debug panel:', error);
            throw error;
        }
    }

    /**
     * 添加组件到调试面板
     *
     * @param config 调试配置
     */
    add(config: DebugConfig): void {
        if (!this.isDebugMode || !this.gui) {
            return;
        }

        const { component, configure, expanded = true } = config;
        const componentName = component.name;

        if (this.components.has(componentName)) {
            this.logger.warn(`Component "${componentName}" already added to debug panel`);
            return;
        }

        try {
            // 创建文件夹
            const folder = this.gui.addFolder(componentName);
            if (expanded) {
                folder.open();
            }

            // 保存配置
            this.components.set(componentName, config);
            this.folders.set(componentName, folder);

            // 如果有自定义配置，使用自定义配置
            if (configure) {
                configure(folder, component);
            } else {
                // 否则使用自动配置
                this.autoConfigure(folder, component);
            }

            this.logger.info(`Added component "${componentName}" to debug panel`);
        } catch (error) {
            this.logger.error(`Failed to add component "${componentName}" to debug panel:`, error);
        }
    }

    /**
     * 移除组件
     *
     * @param componentName 组件名称
     */
    remove(componentName: string): void {
        if (!this.gui) return;

        const folder = this.folders.get(componentName);
        if (folder) {
            folder.destroy();
            this.folders.delete(componentName);
            this.components.delete(componentName);
            this.logger.info(`Removed component "${componentName}" from debug panel`);
        }
    }

    /**
     * 清空所有组件
     */
    clear(): void {
        if (!this.gui) return;

        this.folders.forEach(folder => folder.destroy());
        this.folders.clear();
        this.components.clear();
        this.logger.info('Cleared all components from debug panel');
    }

    /**
     * 显示调试面板
     */
    show(): void {
        if (this.gui) {
            this.gui.show();
        }
    }

    /**
     * 隐藏调试面板
     */
    hide(): void {
        if (this.gui) {
            this.gui.hide();
        }
    }

    /**
     * 销毁调试面板
     */
    dispose(): void {
        if (this.gui) {
            this.clear();
            this.gui.destroy();
            this.gui = null;
            this.logger.info('Debug panel disposed');
        }
    }

    /**
     * 自动配置组件参数
     * 尝试自动检测并添加可调试的参数
     */
    private autoConfigure(folder: GUI, component: IObject3DComponent): void {
        // 添加基本信息
        folder.add({ name: component.name }, 'name').disable();
        folder.add({ initialized: component.isInitialized }, 'initialized').disable();
        folder.add({ active: component.isActive }, 'active').disable();
        folder.add({ visible: component.isVisible }, 'visible').disable();

        // 添加控制方法
        folder.add(component, 'show').name('Show');
        folder.add(component, 'hide').name('Hide');

        // 如果组件有 root，添加位置/旋转/缩放控制
        if (component.root) {
            const transformFolder = folder.addFolder('Transform');

            // 位置
            const positionFolder = transformFolder.addFolder('Position');
            positionFolder.add(component.root.position, 'x').name('X').listen();
            positionFolder.add(component.root.position, 'y').name('Y').listen();
            positionFolder.add(component.root.position, 'z').name('Z').listen();

            // 旋转
            const rotationFolder = transformFolder.addFolder('Rotation');
            rotationFolder.add(component.root.rotation, 'x').name('X').listen();
            rotationFolder.add(component.root.rotation, 'y').name('Y').listen();
            rotationFolder.add(component.root.rotation, 'z').name('Z').listen();

            // 缩放
            const scaleFolder = transformFolder.addFolder('Scale');
            scaleFolder.add(component.root.scale, 'x').name('X').listen();
            scaleFolder.add(component.root.scale, 'y').name('Y').listen();
            scaleFolder.add(component.root.scale, 'z').name('Z').listen();
        }

        // 尝试提取材质 uniforms（如果组件暴露了 material）
        this.extractMaterialUniforms(folder, component);
    }

    /**
     * 提取材质 Uniforms
     */
    private extractMaterialUniforms(folder: GUI, component: IObject3DComponent): void {
        // 检查组件是否有 material 属性
        const componentAny = component as any;

        if (componentAny.material) {
            const material = componentAny.material;

            // 如果是 ShaderMaterial，提取 uniforms
            if (material.uniforms && typeof material.uniforms === 'object') {
                const uniformsFolder = folder.addFolder('Uniforms');

                Object.entries(material.uniforms).forEach(([key, uniform]: [string, any]) => {
                    if (uniform && uniform.value !== undefined) {
                        const value = uniform.value;

                        // 根据类型添加不同的控制器
                        if (typeof value === 'number') {
                            uniformsFolder.add(uniform, 'value', 0, 100).name(key).listen();
                        } else if (typeof value === 'boolean') {
                            uniformsFolder.add(uniform, 'value').name(key).listen();
                        } else if (value.x !== undefined && value.y !== undefined) {
                            // Vector2/Vector3
                            const vectorFolder = uniformsFolder.addFolder(key);
                            vectorFolder.add(value, 'x').name('X').listen();
                            vectorFolder.add(value, 'y').name('Y').listen();
                            if (value.z !== undefined) {
                                vectorFolder.add(value, 'z').name('Z').listen();
                            }
                        } else if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
                            // Color
                            const colorObj = { color: `#${value.getHexString()}` };
                            uniformsFolder.addColor(colorObj, 'color')
                                .name(key)
                                .onChange((hex: string) => {
                                    value.set(hex);
                                });
                        }
                    }
                });
            }
        }
    }

    /**
     * 获取 GUI 实例（用于高级自定义）
     */
    getGUI(): GUI | null {
        return this.gui;
    }

    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.gui !== null;
    }
}

// 导出单例实例
export const debugPanel = DebugPanelManager.getInstance();

export default DebugPanelManager;
