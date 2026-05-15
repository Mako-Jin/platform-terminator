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
    type UpdateParams,
    resourcesManager
} from "common-three";

import BushFragmentShader from '/@/shaders/Materials/bush/fragment.glsl';
import BushVertexShader from '/@/shaders/Materials/bush/vertex.glsl';
import {type EasingType, type ConfigObject, SettingsManager} from "/@/settings";
import BushManager from "./manager";
import {type BushDefinition} from "./types";


export default class Bush extends Object3DComponent {

    private keyLight: Three.Object3D | null = null;
    private samplerMesh: Three.Mesh | null = null;
    private bushManager: BushManager | null = null;
    private material: Three.ShaderMaterial | null = null;
    private bushDefinitions: BushDefinition[] = [];

    // ✅ 添加缓存标志
    private static isBushDefinitionsLoaded = false;
    private static cachedBushDefinitions: BushDefinition[] = [];

    private settingsManager: SettingsManager;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-bush', options.isDebugMode);

        this.settingsManager = SettingsManager.getInstance();
    }

    public getBushColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('bush', easing);
    }

    /**
     * 初始化阶段 - 创建灌木系统
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Bush] Initializing...');
        // ✅ 创建组作为根节点
        const bushGroup = new Three.Group();
        bushGroup.name = 'BushGroup';
        this.setRoot(bushGroup);

        await this.waitForDependencies();

        // ✅ 获取主光源（处理 undefined -> null）
        this.keyLight = this.scene.getObjectByName('keyLight') ?? null;

        this.bushDefinitions = [
            { position: [7.3, 1.0, 3], scale: 1.2 },
            { position: [9, 0.2, 4.1], scale: 0.6 },
            { position: [10, 0.3, 0.0], scale: 0.6 },
            { position: [11, 0.1, 1.5], scale: 0.8 },

            { position: [-10, 0.7, -5.5], scale: 1.2 },
            { position: [-12, 1.0, -5.5], scale: 2.0 },
            { position: [-11, 0.2, -8.5], scale: 0.7 },

            { position: [-2, 0.2, -7.5] },

            { position: [8, 0.5, -9.5], scale: 0.6 },

            { position: [-4.0, 0.5, 10.5], scale: 0.7 },
            { position: [0.0, 0.5, 11.5], scale: 0.5 },
            { position: [1.8, 0.2, 9.5], scale: 0.5 },

            { position: [-4, 0.0, -15.5] },
            { position: [-6, 0.0, -15], scale: 0.9 },

            { position: [-9.8, 0.5, 4.5], leafCount: 30, scale: 1.2 },
            { position: [-8.8, 0.5, 8.5], leafCount: 30 },
            { position: [-6.5, 0.1, 8.5], leafCount: 30, scale: 0.8 },

            { position: [12.0, 5.0, -0.2], scale: 0.6, bushType: 'tree' },
            { position: [12.0, 7.0, 1.5], scale: 0.7, bushType: 'tree' },
            { position: [12.5, 5.0, 3.2], scale: 0.7, bushType: 'tree' },
            { position: [13.5, 5.0, 0.5], scale: 0.6, bushType: 'tree' },
            { position: [11.0, 6.0, 2.5], scale: 0.6, bushType: 'tree' },

            { position: [8.1, 6.5, -5.5], scale: 1.0, bushType: 'birch' },
            { position: [8.5, 7.5, -8.5], scale: 1.0, bushType: 'birch' },
            { position: [6.0, 7.5, -7.5], scale: 1.0, bushType: 'birch' },

            { position: [-10.5, 4.5, 0.0], scale: 1.0, bushType: 'tree' },
            { position: [-9.5, 5.0, -2.5], scale: 1.0, bushType: 'tree' },
            { position: [-8, 4.0, -2.5], scale: 1.0, bushType: 'tree' },
            { position: [-7, 3.7, -9.0], scale: 1.0, bushType: 'tree' },
            { position: [-7, 5.0, -11.0], scale: 1.0, bushType: 'tree' },
            { position: [-5, 3.7, -11.0], scale: 1.0, bushType: 'tree' },

            { position: [-10, 6.0, 7.0], scale: 1.0, bushType: 'tree' },
            { position: [-11, 6.0, 5.0], scale: 1.0, bushType: 'tree' },
            { position: [-12, 4.0, 4.0], scale: 1.0, bushType: 'tree' },
            { position: [-12, 6.0, 6.0], scale: 1.0, bushType: 'tree' },
            { position: [-12, 4.0, 7.0], scale: 1.0, bushType: 'tree' },

            { position: [-3.1, 8.0, 10.5], scale: 1.0, bushType: 'birch' },
            { position: [-3.0, 6.0, 10.5], scale: 1.5, bushType: 'birch' },
            { position: [-5.0, 7.5, 11.5], scale: 1.0, bushType: 'birch' },
            { position: [-4.0, 6.0, 12.5], scale: 1.0, bushType: 'birch' },
        ];

        this.createMaterial();

        // 准备采样器网格
        this.samplerMesh = this.prepareSamplerMesh();
        // 创建 BushManager（包含 warming up）
        this.bushManager = new BushManager(this.scene, {
            material: this.material,
            samplerMesh: this.samplerMesh,
            maxLeaves: 1755,
        });
        // 生成灌木
        this.spawnFromDefinitions();
        this.logger.info(`[Bush] Initialization complete`);
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Bush] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        if (this.material) {
            this.material.uniforms.uTime.value += 0.001;
        }

        if (this.bushManager) {
            this.bushManager.update();
        }
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Bush] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Bush] Disposing...');

        // 清理 BushManager
        if (this.bushManager) {
            this.bushManager.dispose();
            this.bushManager = null;
        }

        // 清理材质
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }

        // 清理采样器网格
        if (this.samplerMesh) {
            this.samplerMesh.geometry.dispose();
            (this.samplerMesh.material as Three.Material).dispose();
            this.samplerMesh = null;
        }
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用
     */
    public onTimeChanged(_data: TimeChangedData): void {
        this.updateColors();
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Bush] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Bush] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Bush] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
        // ✅ 季节变化时才需要重建（因为可能改变叶子数量等）
        this.updateColors();
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

        // 添加灌木相关的调试选项
        if (!this.material || !this.bushManager) return;

        const controls = [
            { uniform: 'uShadowColor', label: 'Shadow Color', type: 'color' },
            { uniform: 'uMidColor', label: 'Mid Color', type: 'color' },
            { uniform: 'uHighlightColor', label: 'Highlight Color', type: 'color' },
            {
                uniform: 'uBreezeSpeed',
                label: 'Breeze Speed',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uBreezeScale',
                label: 'Breeze Scale',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uBreezeStrength',
                label: 'Breeze Strength',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uSquallSpeed',
                label: 'Squall Speed',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uSquallScale',
                label: 'Squall Scale',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uSquallStrength',
                label: 'Squall Strength',
                options: { min: 0, max: 20, step: 0.01 },
            },
        ];

        controls.forEach((c) => {
            const uniformObj = this.material!.uniforms[c.uniform];
            if (!uniformObj) return;

            if (c.type === 'color') {
                gui.add(uniformObj, 'value', { type: 'color', label: c.label }).name(c.label);
            } else {
                gui.add(uniformObj, 'value', { ...c.options, label: c.label }).name(c.label);
            }
        });
    }

    /**
     * 等待依赖初始化
     */
    private async waitForDependencies(): Promise<void> {
        try {
            await this.settingsManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Bush] Failed to wait for Season Config initialization:', error);
        }
    }

    /**
     * 辅助函数：创建 Vector3
     */
    private v3(arr: number[]): Three.Vector3 {
        return new Three.Vector3(arr[0], arr[1], arr[2]);
    }

    /**
     * 辅助函数：创建 Color
     */
    private col(arr: number[]): Three.Color {
        return new Three.Color(arr[0], arr[1], arr[2]);
    }

    /**
     * 获取灌木类型的颜色乘数
     */
    private getColorMultiplierForType(bushType: string): number[] {
        const preset = this.getBushColorConfig();

        if (!preset) {
            return [0.73, 0.89, 0.62];
        }

        let multiplier;
        if (bushType === 'tree') {
            multiplier = preset.treeColorMultiplier;
        } else if (bushType === 'birch') {
            multiplier = preset.birchColorMultiplier;
        } else {
            multiplier = preset.colorMultiplier;
        }

        return Array.isArray(multiplier) ? multiplier : [0.73, 0.89, 0.62];
    }

    /**
     * 获取灌木类型的颜色
     */
    private getColorsForBushType(bushType: string) {
        const preset = this.getBushColorConfig("smoothstep");

        const defaultColors = {
            shadowColor: [0.01, 0.12, 0.01],
            midColor: [0.0, 0.25, 0.015],
            highlightColor: [0.25, 0.5, 0.007],
        };

        let colorArray;

        if (!preset) {
            this.logger.warn('[Bush] No color preset available, using defaults');
            colorArray = defaultColors;
        } else {
            if (bushType === 'tree') {
                colorArray = {
                    shadowColor: preset.treeShadowColor || defaultColors.shadowColor,
                    midColor: preset.treeMidColor || defaultColors.midColor,
                    highlightColor: preset.treeHighlightColor || defaultColors.highlightColor,
                };
            } else if (bushType === 'birch') {
                colorArray = {
                    shadowColor: preset.birchShadowColor || defaultColors.shadowColor,
                    midColor: preset.birchMidColor || defaultColors.midColor,
                    highlightColor: preset.birchHighlightColor || defaultColors.highlightColor,
                };
            } else {
                colorArray = {
                    shadowColor: preset.shadowColor || defaultColors.shadowColor,
                    midColor: preset.midColor || defaultColors.midColor,
                    highlightColor: preset.highlightColor || defaultColors.highlightColor,
                };
            }
        }

        return {
            shadowColor: Array.isArray(colorArray.shadowColor)
                ? this.col(colorArray.shadowColor)
                : (colorArray.shadowColor as Three.Color).clone(),
            midColor: Array.isArray(colorArray.midColor)
                ? this.col(colorArray.midColor)
                : (colorArray.midColor as Three.Color).clone(),
            highlightColor: Array.isArray(colorArray.highlightColor)
                ? this.col(colorArray.highlightColor)
                : (colorArray.highlightColor as Three.Color).clone(),
        };
    }

    /**
     * 获取默认配置
     */
    private getDefaults() {
        const preset = this.getBushColorConfig();
        return {
            leafCount: 45,
            scale: 1.0,
            colorMultiplier: preset.colorMultiplier,
            shadowColor: preset.shadowColor,
            midColor: preset.midColor,
            highlightColor: preset.highlightColor,
        };
    }

    /**
     * 创建材质
     */
    private createMaterial(): void {
        const leavesAlphaMap = resourcesManager.getItemById("leavesAlphaMap");

        if (!leavesAlphaMap) {
            this.logger.error('[Bush] leavesAlphaMap not found! This will cause rendering issues.');
        } else {
            this.logger.info('[Bush] leavesAlphaMap loaded successfully');
        }

        const preset = this.getBushColorConfig();
        const fogUniforms = Three.UniformsUtils.merge([Three.UniformsLib['fog']]);

        this.material = new Three.ShaderMaterial({
            side: Three.DoubleSide,
            fog: true,
            uniforms: {
                ...fogUniforms,
                uTime: { value: 0.0 },
                uLightDirection: {
                    value: this.keyLight ? this.keyLight.position : new Three.Vector3(),
                },
                uAlphaMap: { value: leavesAlphaMap },
                uShadowColor: { value: this.col(preset.shadowColor) },
                uMidColor: { value: this.col(preset.midColor) },
                uHighlightColor: { value: this.col(preset.highlightColor) },

                uBreezeSpeed: { value: 16.25 },
                uBreezeScale: { value: 6.2 },
                uBreezeStrength: { value: 2.5 },
                uSquallSpeed: { value: 4.02 },
                uSquallScale: { value: 4.3 },
                uSquallStrength: { value: 0.5 },
            },
            vertexShader: BushVertexShader,
            fragmentShader: BushFragmentShader,
            depthTest: true,
            depthWrite: true,
            transparent: false,
            alphaTest: 0.8,
        });

        this.logger.info('[Bush] Bush material created successfully');
    }

    /**
     * 准备采样器网格
     */
    private prepareSamplerMesh(): Three.Mesh {
        const model = resourcesManager.getItemById("BushEmitterModel");
        if (!model) {
            this.logger.warn('[Bush] BushEmitterModel not found in resources');
            return new Three.Mesh(
                new Three.BufferGeometry(),
                new Three.MeshBasicMaterial()
            );
        }

        const emitterMesh = model.scene.children[0];
        emitterMesh.updateMatrixWorld(true);

        const samplerGeometry = emitterMesh.geometry.clone();
        samplerGeometry.applyMatrix4(emitterMesh.matrixWorld);
        const nonIndexed = samplerGeometry.toNonIndexed();
        return new Three.Mesh(nonIndexed, new Three.MeshBasicMaterial());
    }

    /**
     * 从定义生成灌木
     */
    private spawnFromDefinitions(): void {
        const d = this.getDefaults();
        // ✅ 移除所有循环内的日志输出，避免阻塞
        this.bushDefinitions.forEach((def: BushDefinition) => {
            const bushType = def.bushType || 'default';
            const colors = this.getColorsForBushType(bushType);
            const colorMultiplier = this.getColorMultiplierForType(bushType);

            const cfg = {
                position: this.v3(def.position),
                leafCount: def.leafCount ?? d.leafCount,
                scale: def.scale ?? d.scale,
                colorMultiplier: this.col(colorMultiplier),
                shadowColor: colors.shadowColor,
                midColor: colors.midColor || this.col(d.midColor),
                highlightColor: colors.highlightColor || this.col(d.highlightColor),
            };

            this.bushManager!.addBush(cfg);
        });

        this.logger.info(`[Bush] Successfully created bushes total leaves`);
    }

    /**
     * 更新颜色
     */
    private updateColors(): void {
        const preset = this.getBushColorConfig();

        if (!preset || !this.material) {
            return;
        }

        this.material.uniforms.uShadowColor.value.setRGB(
            preset.shadowColor[0],
            preset.shadowColor[1],
            preset.shadowColor[2]
        );
        this.material.uniforms.uMidColor.value.setRGB(
            preset.midColor[0],
            preset.midColor[1],
            preset.midColor[2]
        );
        this.material.uniforms.uHighlightColor.value.setRGB(
            preset.highlightColor[0],
            preset.highlightColor[1],
            preset.highlightColor[2]
        );

        this.rebuildBushes();
    }

    /**
     * ✅ 优化的重建灌木方法 - 复用 BushManager
     */
    private rebuildBushes(): void {
        if (!this.bushManager || !this.material || !this.samplerMesh) {
            return;
        }
        if (typeof this.bushManager.dispose === 'function') {
            this.bushManager.dispose();
        } else if (typeof this.bushManager.clear === 'function') {
            this.bushManager.clear();
        } else {
            console.warn(
                '[Bush] BushManager has no dispose/clear method, attempting manual cleanup'
            );

            const bushMeshesToRemove = [];
            this.scene.traverse((child) => {
                if (child.material === this.material) {
                    bushMeshesToRemove.push(child);
                }
            });

            bushMeshesToRemove.forEach((mesh) => {
                this.scene.remove(mesh);
                if (mesh.geometry) {
                    mesh.geometry.dispose();
                }
            });
        }

        this.bushManager = new BushManager(this.scene,{
            material: this.material,
            samplerMesh: this.samplerMesh,
            maxLeaves: 1755,
        });

        this.spawnFromDefinitions();
    }
}
