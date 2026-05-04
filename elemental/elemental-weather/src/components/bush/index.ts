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
import SeasonManager from "/@/manager/SeasonManager.ts";
import ColorManager from "/@/manager/ColorManager.ts";
import BushManager from "/@/manager/BushManager.ts";
import {type BushDefinition, loadBushDefinitions} from "/@components/bush/loader.ts";

import BushFragmentShader from '/@/shaders/Materials/bush/fragment.glsl';
import BushVertexShader from '/@/shaders/Materials/bush/vertex.glsl';


export default class Bush extends Object3DComponent {

    private resourcesManager: ResourcesManager;
    private seasonManager: SeasonManager;
    private colorManager: ColorManager;

    private keyLight: Three.Object3D | null = null;
    private samplerMesh: Three.Mesh | null = null;
    private bushManager: BushManager | null = null;
    private material: Three.ShaderMaterial | null = null;
    private bushDefinitions: BushDefinition[] = [];

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'Bush', options.isDebugMode);
        
        this.resourcesManager = ResourcesManager.getInstance();
        this.seasonManager = SeasonManager.getInstance();
        this.colorManager = ColorManager.getInstance();
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

        // 创建材质
        this.createMaterial();

        // 加载灌木定义
        this.bushDefinitions = await loadBushDefinitions();
        if (this.bushDefinitions.length === 0) {
            this.logger.warn('[Bush] No bush definitions loaded');
            return;
        }
        this.logger.info(`[Bush] Loaded ${this.bushDefinitions.length} bush definitions`);

        // 准备采样器网格
        this.samplerMesh = this.prepareSamplerMesh();

        // 创建 BushManager
        this.bushManager = new BushManager(this.scene, {
            material: this.material!,
            samplerMesh: this.samplerMesh,
            maxLeaves: 1755,
        });

        // 生成灌木
        this.spawnFromDefinitions();

        this.logger.info('[Bush] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Bush] Activating...');
        
        // 立即更新颜色
        this.updateColors();
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
            await this.seasonManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Bush] Failed to wait for SeasonManager initialization:', error);
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
        const preset = this.colorManager.getBushColorConfig("smoothstep");

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
        const preset = this.colorManager.getBushColorConfig("smoothstep");

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
        const preset = this.colorManager.getBushColorConfig("smoothstep");
        
        const defaults = {
            leafCount: 45,
            scale: 1.0,
            colorMultiplier: [0.73, 0.89, 0.62],
            shadowColor: [0.01, 0.12, 0.01],
            midColor: [0.0, 0.25, 0.015],
            highlightColor: [0.25, 0.5, 0.007],
        };

        if (!preset) {
            return defaults;
        }

        return {
            leafCount: 45,
            scale: 1.0,
            colorMultiplier: Array.isArray(preset.colorMultiplier) ? preset.colorMultiplier : defaults.colorMultiplier,
            shadowColor: Array.isArray(preset.shadowColor) ? preset.shadowColor : defaults.shadowColor,
            midColor: Array.isArray(preset.midColor) ? preset.midColor : defaults.midColor,
            highlightColor: Array.isArray(preset.highlightColor) ? preset.highlightColor : defaults.highlightColor,
        };
    }

    /**
     * 创建材质
     */
    private createMaterial(): void {
        const leavesAlphaMap = this.resourcesManager.getItem("leavesAlphaMap");
        
        if (!leavesAlphaMap) {
            this.logger.error('[Bush] leavesAlphaMap not found! This will cause rendering issues.');
        } else {
            this.logger.info('[Bush] leavesAlphaMap loaded successfully');
        }
        
        const preset = this.colorManager.getBushColorConfig("smoothstep");
        const fogUniforms = Three.UniformsUtils.merge([Three.UniformsLib['fog']]);

        const defaultPreset = {
            shadowColor: [0.01, 0.12, 0.01],
            midColor: [0.0, 0.25, 0.015],
            highlightColor: [0.25, 0.5, 0.007],
        };

        const shadowColor = preset ? preset.shadowColor : defaultPreset.shadowColor;
        const midColor = preset ? preset.midColor : defaultPreset.midColor;
        const highlightColor = preset ? preset.highlightColor : defaultPreset.highlightColor;

        let lightDirection = new Three.Vector3(1, 1, 1);
        if (this.keyLight && this.keyLight.position) {
            lightDirection = this.keyLight.position.clone().normalize();
            this.logger.debug('[Bush] Using keyLight direction:', lightDirection.toArray());
        } else {
            this.logger.warn('[Bush] keyLight not found, using default light direction');
        }

        this.logger.info('[Bush] Creating bush material with colors:', {
            shadowColor,
            midColor,
            highlightColor,
            hasPreset: !!preset,
            lightDirection: lightDirection.toArray(),
            hasAlphaMap: !!leavesAlphaMap
        });

        this.material = new Three.ShaderMaterial({
            side: Three.DoubleSide,
            fog: true,
            uniforms: {
                ...fogUniforms,
                uTime: { value: 0.0 },
                uLightDirection: {
                    value: lightDirection,
                },
                uAlphaMap: { value: leavesAlphaMap },
                uShadowColor: { value: this.col(shadowColor) },
                uMidColor: { value: this.col(midColor) },
                uHighlightColor: { value: this.col(highlightColor) },

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
        const model = this.resourcesManager.getItem("BushEmitterModel");
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

        this.logger.info(`[Bush] Spawning ${this.bushDefinitions.length} bushes`);

        let bushCount = 0;
        this.bushDefinitions.forEach((def: BushDefinition, index) => {
            const bushType = def.bushType || 'default';
            const colors = this.getColorsForBushType(bushType);

            const colorMultiplier = this.getColorMultiplierForType(bushType);

            if (index === 0) {
                this.logger.info('[Bush] First bush configuration:', {
                    bushType,
                    position: def.position,
                    shadowColor: colors.shadowColor.toArray(),
                    midColor: colors.midColor.toArray(),
                    highlightColor: colors.highlightColor.toArray(),
                    colorMultiplier: colorMultiplier
                });
                
                const preset = this.colorManager.getBushColorConfig("smoothstep");
                this.logger.info('[Bush] Current preset shadowColor:', preset?.shadowColor);
            }

            const cfg = {
                position: this.v3(def.position),
                leafCount: def.leafCount ?? d.leafCount,
                scale: def.scale ?? d.scale,
                colorMultiplier: this.col(colorMultiplier),
                shadowColor: colors.shadowColor,
                midColor: colors.midColor,
                highlightColor: colors.highlightColor,
            };

            const result = this.bushManager!.addBush(cfg);
            if (result) {
                bushCount++;
            }
        });

        const totalLeaves = this.bushManager!.getTotalLeafCount();
        this.logger.info(`[Bush] Successfully created ${bushCount} bushes with ${totalLeaves} total leaves`);
    }

    /**
     * 更新颜色
     */
    private updateColors(): void {
        const preset = this.colorManager.getBushColorConfig("smoothstep");

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
     * 重建灌木
     */
    private rebuildBushes(): void {
        if (!this.bushManager || !this.material || !this.samplerMesh) {
            return;
        }

        this.bushManager.dispose();

        this.bushManager = new BushManager(this.scene, {
            material: this.material,
            samplerMesh: this.samplerMesh,
            maxLeaves: 1755,
        });

        this.spawnFromDefinitions();
    }
}
