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
    resourcesManager, datetimeManager
} from "common-three";
import {SettingsManager, type ConfigObject} from "/@/settings";

import waterVertexCommonChunk from '/@/shaders/Chunks/water/water.vertex_common_chunk.glsl';
import waterVertexBeginChunk from '/@/shaders/Chunks/water/water.vertex_begin_chunk.glsl';
import waterFragmentCommonChunk from '/@/shaders/Chunks/water/water.fragment_common_chunk.glsl';
import waterFragmentColorChunk from '/@/shaders/Chunks/water/water.fragment_color_chunk.glsl';


export interface WaterConfig {
    groundSize?: number;
    gridCols?: number;
    gridRows?: number;
    gridSpacing?: number;
    gridY?: number;
}


export default class Water extends Object3DComponent {

    private settingsManager: SettingsManager;

    // ✅ 几何参数（与 Ground 保持一致）
    private readonly groundSize: number;
    private readonly gridCols: number;
    private readonly gridRows: number;
    private readonly gridSpacing: number;
    private readonly gridY: number;
    private readonly worldSize: number;

    // ✅ 水面 Mesh 和材质
    private waterGeometry: Three.PlaneGeometry | null = null;
    private waterMaterial: Three.MeshStandardMaterial | null = null;
    private customWaterUniforms: any = null;
    private waterMesh: Three.Mesh | null = null;

    constructor(
        scene: SceneWrapper,
        options: { isDebugMode?: boolean; config?: WaterConfig } = {}
    ) {
        super(scene, 'weather-water', options.isDebugMode);

        this.settingsManager = SettingsManager.getInstance();

        // ✅ 使用与 Ground 相同的默认配置
        this.groundSize = options.config?.groundSize ?? 11;
        this.gridCols = options.config?.gridCols ?? 3;
        this.gridRows = options.config?.gridRows ?? 3;
        this.gridSpacing = options.config?.gridSpacing ?? this.groundSize;
        this.gridY = options.config?.gridY ?? 0.1; // ✅ 修正：默认 0.1 而非 0.0

        this.worldSize = this.gridCols * this.groundSize;
    }

    /**
     * 初始化阶段 - 创建水面（参考 Ground.addWaterRipples）
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Water] Initializing...');

        await this.waitForDependencies();

        const root = new Three.Group();
        root.name = 'WaterGroup';
        this.setRoot(root);

        this.createWaterSurface();

        this.logger.info('[Water] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Water] Activating...');
        this.updateWaterColors();
    }

    /**
     * 更新阶段 - 每帧调用（参考 Ground.update）
     */
    protected onUpdate(params: UpdateParams): void {
        if (this.customWaterUniforms) {
            // ✅ 更新时间 uniform
            this.customWaterUniforms.uTime.value += params.delta;
        }

        // ✅ 根据季节动态调整水效果（参考 Ground.update 第 449-505 行）
        this.updateSeasonalEffects();
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Water] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Water] Disposing...');

        if (this.waterMesh) {
            this.waterMesh.geometry.dispose();
            this.waterMesh = null;
        }

        if (this.waterMaterial) {
            this.waterMaterial.dispose();
            this.waterMaterial = null;
        }

        this.waterGeometry = null;
        this.customWaterUniforms = null;
    }

    /**
     * ✅ 时间变化监听器
     */
    public onTimeChanged(_data: TimeChangedData): void {
        this.updateWaterColors();
    }

    /**
     * ✅ 日期变化监听器
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Water] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Water] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Water] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
        this.updateWaterColors();
    }

    /**
     * ✅ 配置调试面板
     */
    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();
        gui.add({ visible: component.isVisible }, 'visible').name('Visible').disable();

        if (!this.customWaterUniforms) return;

        const folder = gui.addFolder('Water Effects');

        // ✅ 波纹控制（参考 Ground.initGUI 第 367-389 行）
        folder.add(this.customWaterUniforms.uRipplesRatio, 'value', 0, 1, 0.01)
            .name('Ripples Ratio');
        folder.add(this.customWaterUniforms.uShoreMaskThreshold, 'value', 0, 1, 0.01)
            .name('Shore Mask Threshold');
        folder.add(this.customWaterUniforms.uRippleFrequency, 'value', 1, 30, 0.5)
            .name('Ripple Frequency');
        folder.add(this.customWaterUniforms.uRippleOpacity, 'value', 0, 5, 0.1)
            .name('Ripple Opacity');

        // ✅ 飞溅控制（参考 Ground.initGUI 第 392-420 行）
        folder.add(this.customWaterUniforms.uSplashesRatio, 'value', 0, 1, 0.01)
            .name('Splashes Ratio');
        folder.add(this.customWaterUniforms.uSplashesNoiseFrequency, 'value', 0.1, 2, 0.01)
            .name('Splash Noise Freq');
        folder.add(this.customWaterUniforms.uSplashesTimeFrequency, 'value', 0, 20, 0.1)
            .name('Splash Time Freq');
        folder.add(this.customWaterUniforms.uSplashesCenterMin, 'value', 0, 1, 0.01)
            .name('Splash Center Min');
        folder.add(this.customWaterUniforms.uSplashesCenterMax, 'value', 0, 1, 0.01)
            .name('Splash Center Max');

        // ✅ 冰层控制（参考 Ground.initGUI 第 422-439 行）
        folder.add(this.customWaterUniforms.uIceRatio, 'value', 0, 1, 0.01)
            .name('Ice Ratio');
        folder.add(this.customWaterUniforms.uIceNoiseFrequency, 'value', 0.1, 2, 0.01)
            .name('Ice Noise Freq');

        const iceColorController = folder.addColor(
            { iceColor: this.customWaterUniforms.uIceColor.value.getHex() },
            'iceColor'
        ).name('Ice Color');
        iceColorController.onChange((hex: number) => {
            this.customWaterUniforms.uIceColor.value.setHex(hex);
        });
    }

    /**
     * 等待依赖初始化
     */
    private async waitForDependencies(): Promise<void> {
        try {
            await this.settingsManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Water] Failed to wait for SettingsManager initialization:', error);
        }
    }

    /**
     * ✅ 创建水面（完全参考 Ground.addWaterRipples 方法）
     */
    private createWaterSurface(): void {
        // ✅ 加载资源（参考 Ground.addWaterRipples 第 239-246 行）
        const biomeTexture = resourcesManager.getItemById('grassPathDensityDataTexture');
        if (!biomeTexture) {
            this.logger.error('[Water] grassPathDensityDataTexture resource not found!');
            return;  // ✅ 关键修复：资源缺失时提前返回
        }
        biomeTexture.wrapS = biomeTexture.wrapT = Three.ClampToEdgeWrapping;
        this.logger.info('[Water] biomeTexture loaded:', biomeTexture);

        const waterDepthTexture = resourcesManager.getItemById('waterDepthMap');
        if (!waterDepthTexture) {
            this.logger.error('[Water] waterDepthMap resource not found!');
            return;  // ✅ 关键修复：资源缺失时提前返回
        }
        waterDepthTexture.wrapS = waterDepthTexture.wrapT = Three.RepeatWrapping;
        this.logger.info('[Water] waterDepthTexture loaded:', waterDepthTexture);

        const perlinNoise = resourcesManager.getItemById('perlinNoise');
        if (!perlinNoise) {
            this.logger.error('[Water] perlinNoise resource not found!');
            return;  // ✅ 关键修复：资源缺失时提前返回
        }
        perlinNoise.wrapS = perlinNoise.wrapT = Three.RepeatWrapping;
        this.logger.info('[Water] perlinNoise loaded:', perlinNoise);

        // ✅ 获取颜色配置
        const colors = this.getWaterColorConfig();
        this.logger.info('[Water] Color config:', colors);

        // ✅ 创建水面几何体（参考 Ground.addWaterRipples 第 228-233 行）
        this.waterGeometry = new Three.PlaneGeometry(
            this.groundSize + 0.5,
            this.groundSize + 2,
            1,
            1
        );
        this.logger.info('[Water] Geometry created, size:', this.groundSize + 0.5, 'x', this.groundSize + 2);

        // ✅ 创建材质并注入 shader chunks（参考 Ground.addWaterRipples 第 234-313 行）
        this.waterMaterial = new Three.MeshStandardMaterial({
            // color: 0x000000,
            // transparent: true,
            color: 0x006994,  // ✅ 临时调试：使用蓝色作为基础色
            transparent: true,
            opacity: 0.8,  // ✅ 临时调试：设置透明度
        });

        // ✅ 设置 uniforms（参考 Ground.addWaterRipples 第 248-286 行）
        this.customWaterUniforms = {
            uTime: { value: 0 },
            // ✅ 关键修复：直接使用纹理对象，不需要 .resource
            uDensityMap: { value: biomeTexture },
            uGroundSize: {
                value: new Three.Vector3(this.worldSize, 0, this.worldSize),
            },
            uPerlinNoise: { value: perlinNoise },
            uWaterDepthTexture: { value: waterDepthTexture },

            // ✅ 波纹参数
            uRipplesRatio: { value: 0.0 },
            uDensityMaskMin: { value: 0.05 },
            uDensityMaskMax: { value: 0.15 },
            uShoreMaskThreshold: { value: 0.4 },
            uNoiseScale1: { value: 3.0 },
            uNoiseScale2: { value: 5.0 },
            uNoiseSpeed1: { value: 0.5 },
            uNoiseSpeed2: { value: 0.3 },
            uNoiseMix1: { value: 0.6 },
            uNoiseMix2: { value: 0.4 },
            uNoiseDepthInfluence: { value: 0.3 },
            uRippleFrequency: { value: 12.0 },
            uRippleInnerEdge: { value: 0.05 },
            uRippleOuterEdge: { value: 0.4 },
            uBreakupMin: { value: 0.2 },
            uBreakupMax: { value: 0.75 },
            uWaterDepthFade: { value: 0.1 },
            uDiscardThreshold: { value: 0.45 },
            uRippleOpacity: { value: 2.5 },

            // ✅ 飞溅参数
            uSplashesRatio: { value: 0.0 },
            uSplashesNoiseFrequency: { value: 0.33 },
            uSplashesTimeFrequency: { value: 6.0 },
            uSplashesThickness: { value: 0.3 },
            uSplashesEdgeAttenuationLow: { value: 0.14 },
            uSplashesEdgeAttenuationHigh: { value: 1.0 },
            uSplashesCenterMin: { value: 0.0 },
            uSplashesCenterMax: { value: 0.5 },

            // ✅ 冰层参数
            uIceRatio: { value: 0.0 },
            uIceNoiseFrequency: { value: 0.3 },
            uIceColor: { value: new Three.Color(0.9, 0.95, 1.0) },
        };

        // ✅ 注入 shader chunks（修正替换顺序）
        let shaderCompiled = false;
        this.waterMaterial.onBeforeCompile = (shader) => {
            shader.uniforms = {
                ...shader.uniforms,
                ...this.customWaterUniforms,
            };

            // ✅ 关键修复：先替换 begin_vertex，再替换 common
            // 因为 waterVertexBeginChunk 包含 #include <begin_vertex>
            // 如果先替换 common，会破坏 begin_vertex 的标记
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                waterVertexBeginChunk
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                waterVertexCommonChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                waterFragmentCommonChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                waterFragmentColorChunk
            );

            if (!shaderCompiled) {
                this.logger.info('[Water] Shader chunks injected successfully');
                this.logger.info('[Water] Vertex shader length:', shader.vertexShader.length);
                this.logger.info('[Water] Fragment shader length:', shader.fragmentShader.length);

                // ✅ 关键调试：输出 fragment shader 的关键部分
                const discardIndex = shader.fragmentShader.indexOf('discard');
                if (discardIndex !== -1) {
                    this.logger.info('[Water] Found discard statement at position:', discardIndex);
                    this.logger.info('[Water] Context around discard:',
                        shader.fragmentShader.substring(Math.max(0, discardIndex - 100), discardIndex + 50)
                    );
                }

                shaderCompiled = true;
            }
        };

        // ✅ 创建 Mesh（参考 Ground.addWaterRipples 第 315-318 行）
        this.waterMesh = new Three.Mesh(this.waterGeometry, this.waterMaterial);
        this.waterMesh.rotateX(-Math.PI / 2);

        // ✅ 关键修复：水面应该位于场景中心，而不是偏移位置
        // 原始项目中的 (-0.2, 0.1, 1.3) 是相对于单个 ground tile 的位置
        // 但我们的场景是 5x5 网格，需要将水面放在中心
        this.waterMesh.position.set(0, 0.1, 0);

        this.waterMesh.name = 'WaterRipples';
        this.waterMesh.renderOrder = 2;

        // ✅ 关键调试：启用材质调试信息
        this.waterMaterial.depthTest = true;
        this.waterMaterial.depthWrite = false;  // ✅ 透明材质不应写入深度缓冲
        this.waterMaterial.side = Three.DoubleSide;  // ✅ 双面渲染

        const root = this.root;
        if (root) {
            root.add(this.waterMesh);
            this.logger.info('[Water] Water mesh added to scene at position:', this.waterMesh.position);
            this.logger.info('[Water] Material properties:', {
                transparent: this.waterMaterial.transparent,
                depthWrite: this.waterMaterial.depthWrite,
                depthTest: this.waterMaterial.depthTest,
                side: this.waterMaterial.side,
                renderOrder: this.waterMesh.renderOrder
            });

            // ✅ 关键调试：检查纹理是否正确加载
            this.logger.info('[Water] Texture check:', {
                uDensityMap: this.customWaterUniforms.uDensityMap.value !== null,
                uPerlinNoise: this.customWaterUniforms.uPerlinNoise.value !== null,
                uWaterDepthTexture: this.customWaterUniforms.uWaterDepthTexture.value !== null,
                worldSize: this.worldSize
            });

            // ✅ 新增：检查纹理尺寸和格式
            const densityMap = this.customWaterUniforms.uDensityMap.value;
            if (densityMap && densityMap.image) {
                this.logger.info('[Water] Density map info:', {
                    width: densityMap.image.width || densityMap.image.naturalWidth,
                    height: densityMap.image.height || densityMap.image.naturalHeight,
                    wrapS: densityMap.wrapS,
                    wrapT: densityMap.wrapT
                });
            }
        } else {
            this.logger.error('[Water] Root node is null, cannot add water mesh!');
        }
    }

    /**
     * ✅ 获取水面颜色配置（从 ground 配置中获取）
     */
    private getWaterColorConfig(): ConfigObject | null | undefined {
        try {
            return this.settingsManager.getComponentConfig('ground', 'smoothstep');
        } catch (error) {
            this.logger.warn('[Water] Failed to get water color config:', error);
            return null;
        }
    }

    /**
     * ✅ 更新水面颜色（参考 Ground.updateColors）
     */
    private updateWaterColors(): void {
        if (!this.customWaterUniforms) return;

        const colors = this.getWaterColorConfig();
        if (!colors) return;

        // ✅ 注意：water shader chunks 中没有直接使用水颜色 uniform
        // 颜色是通过 ground 的 shader 控制的，这里主要控制效果强度
        this.logger.debug('[Water] Updated water effects for season:');
    }

    /**
     * ✅ 根据季节动态调整水效果（完全参考 Ground.update 第 449-505 行）
     */
    private updateSeasonalEffects(): void {
        if (!this.customWaterUniforms) return;

        const lerp = Three.MathUtils.lerp;

        const currentSeason = datetimeManager.getCurrentSeason();

        if (currentSeason === 'rainy') {
            // ✅ 雨天：增强波纹和飞溅
            this.customWaterUniforms.uRipplesRatio.value = lerp(
                this.customWaterUniforms.uRipplesRatio.value,
                1.0,
                0.05
            );
            this.customWaterUniforms.uSplashesRatio.value = lerp(
                this.customWaterUniforms.uSplashesRatio.value,
                1.0,
                0.05
            );
            this.customWaterUniforms.uIceRatio.value = lerp(
                this.customWaterUniforms.uIceRatio.value,
                0.0,
                0.02
            );
        } else if (currentSeason === 'winter') {
            // ✅ 冬季：结冰，无波纹
            this.customWaterUniforms.uRipplesRatio.value = lerp(
                this.customWaterUniforms.uRipplesRatio.value,
                0.0,
                0.05
            );
            this.customWaterUniforms.uSplashesRatio.value = lerp(
                this.customWaterUniforms.uSplashesRatio.value,
                0.0,
                0.05
            );
            this.customWaterUniforms.uIceRatio.value = lerp(
                this.customWaterUniforms.uIceRatio.value,
                1.0,
                0.05
            );
        } else {
            // ✅ 其他季节：正常波纹，无飞溅，无冰
            this.customWaterUniforms.uRipplesRatio.value = lerp(
                this.customWaterUniforms.uRipplesRatio.value,
                1.0,
                0.05
            );
            this.customWaterUniforms.uSplashesRatio.value = lerp(
                this.customWaterUniforms.uSplashesRatio.value,
                0.0,
                0.05
            );
            this.customWaterUniforms.uIceRatio.value = lerp(
                this.customWaterUniforms.uIceRatio.value,
                0.0,
                0.05
            );
        }
    }
}

