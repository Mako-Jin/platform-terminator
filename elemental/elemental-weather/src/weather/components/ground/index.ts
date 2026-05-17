import * as Three from "three";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import type GUI from 'lil-gui';
import {
    type ComponentConfig,
    type DateChangedData,
    type IObject3DComponent,
    Object3DComponent, resourcesManager,
    SceneWrapper,
    type SeasonChangedData,
    type TimeChangedData,
    type UpdateParams
} from "common-three";

import groundVertexCommonChunk from '/@/shaders/Chunks/ground/ground.vertex_common_chunk.glsl';
import groundVertexBeginChunk from '/@/shaders/Chunks/ground/ground.vertex_begin_chunk.glsl';
import groundFragmentCommonChunk from '/@/shaders/Chunks/ground/ground.fragment_common_chunk.glsl';
import groundFragmentColorChunk from '/@/shaders/Chunks/ground/ground.fragment_color_chunk.glsl';
import {type ConfigObject, SettingsManager} from "/@/settings";
import BiomeManager from "/@/weather/components/grass/biome.ts";
import GrassManager from "/@/weather/components/grass";


export default class Ground extends Object3DComponent {

    private readonly groundSize: number;
    private readonly gridCols: number;
    private readonly gridRows: number;
    private readonly gridSpacing: number;
    private readonly gridY: number;
    private readonly worldSize: number;

    private gridGeometry: Three.PlaneGeometry | null = null;
    private groundMaterial: Three.MeshStandardMaterial | null = null;
    private customGroundUniforms: any = null;

    private settingsManager: SettingsManager;
    private biomeManager: BiomeManager | null = null;
    private grassManager: GrassManager | null = null;

    constructor(
        scene: SceneWrapper,
        options: {
            isDebugMode?: boolean;
            groundSize?: number;
            gridCols?: number;
            gridRows?: number;
            gridSpacing?: number;
            gridY?: number;
        } = {}
    ) {
        super(scene, 'weather-ground', options.isDebugMode);

        this.groundSize = options.groundSize ?? 11;
        this.gridCols = options.gridCols ?? 5;
        this.gridRows = options.gridRows ?? 5;
        this.gridSpacing = options.gridSpacing ?? this.groundSize;
        this.gridY = options.gridY ?? 0.0;
        this.worldSize = this.gridCols * this.groundSize;

        this.settingsManager = SettingsManager.getInstance();

        if (!this.biomeManager) {
            this.biomeManager = new BiomeManager(this.scene, {
                isDebugMode: this.isDebugMode,
                worldSize: this.worldSize
            });
        }

        if (!this.grassManager) {
            this.grassManager = new GrassManager(this.scene, {
                isDebugMode: this.isDebugMode,
                biomeManager: this.biomeManager!,
                config: {
                    worldSize: this.worldSize,
                    tileSize: this.groundSize,
                    gridCols: this.gridCols,
                    gridRows: this.gridRows,
                    gridSpacing: this.gridSpacing
                }
            });
        }
    }

    /**
     * 初始化阶段 - 创建地面网格
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Ground] Initializing...');
        await this.waitForDependencies();

        this.createGroundGroup();
        this.addGrid();
        this.initializeBiomeAndGrass();
        this.logger.info('[Ground] Initialization complete');
    }

    /**
     * ✅ 激活阶段 - 延迟初始化 Biome 和 Grass
     */
    protected onActivate(): void {
        this.logger.info('[Ground] Activating...');

        this.refreshGroundColors();
    }

    /**
     * ✅ 添加到场景 - 确保 Biome 和 Grass 也被添加
     */
    public addToScene(): void {
        super.addToScene();

        if (this.biomeManager && !this.biomeManager.isActive) {
            this.biomeManager.addToScene();
            this.logger.info('[Ground] BiomeManager added to scene');
        }

        if (this.grassManager && !this.grassManager.isActive) {
            this.grassManager.addToScene();
            this.logger.info('[Ground] GrassManager added to scene');
        }
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        if (this.grassManager && this.grassManager.isActive) {
            this.grassManager.update(params);
        }
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Ground] Deactivated');

        if (this.grassManager && this.grassManager.isActive) {
            this.grassManager.deActivate();
        }

        if (this.biomeManager && this.biomeManager.isActive) {
            this.biomeManager.deActivate();
        }
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Ground] Disposing...');

        if (this.grassManager) {
            this.grassManager.dispose();
            this.grassManager = null;
        }

        if (this.biomeManager) {
            this.biomeManager.dispose();
            this.biomeManager = null;
        }

        if (this.gridGeometry) {
            this.gridGeometry.dispose();
            this.gridGeometry = null;
        }

        if (this.groundMaterial) {
            this.groundMaterial.dispose();
            this.groundMaterial = null;
        }

        this.customGroundUniforms = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用
     */
    public onTimeChanged(_data: TimeChangedData): void {
        this.refreshGroundColors();
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Ground] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Ground] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Ground] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
        this.refreshGroundColors();
    }

    /**
     * ✅ 配置调试面板（必须实现的抽象方法）
     */
    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();
        gui.add({ visible: component.isVisible }, 'visible').name('Visible').disable();
    }

    /**
     * 等待依赖初始化
     */
    private async waitForDependencies(): Promise<void> {
        try {
            await this.settingsManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Ground] Failed to wait for Season config initialization:', error);
        }
    }

    /**
     * ✅ 延迟初始化 Biome 和 Grass 管理器
     */
    private initializeBiomeAndGrass(): void {
        if (!this.biomeManager) {
            this.biomeManager = new BiomeManager(this.scene, {
                isDebugMode: this.isDebugMode,
                worldSize: this.worldSize
            });

            this.biomeManager.initialize().then(() => {
                this.logger.info('[Ground] BiomeManager initialized');
            }).catch((error) => {
                this.logger.error('[Ground] Failed to initialize BiomeManager:', error);
            });
        }

        if (!this.grassManager) {
            this.grassManager = new GrassManager(this.scene, {
                isDebugMode: this.isDebugMode,
                biomeManager: this.biomeManager!,
                config: {
                    worldSize: this.worldSize,
                    tileSize: this.groundSize,
                    gridCols: this.gridCols,
                    gridRows: this.gridRows,
                    gridSpacing: this.gridSpacing
                }
            });

            this.grassManager.initialize().then(() => {
                this.logger.info('[Ground] GrassManager initialized');
            }).catch((error) => {
                this.logger.error('[Ground] Failed to initialize GrassManager:', error);
            });
        }
    }

    /**
     * 创建地面组作为根节点
     */
    private createGroundGroup(): void {
        const group = new Three.Group();
        group.name = 'GroundGroup';
        this.setRoot(group);
    }

    /**
     * 刷新地面颜色
     */
    private refreshGroundColors(): void {
        if (!this.customGroundUniforms) {
            return;
        }

        const colors = this.getGroundColorConfig();
        if (colors) {
            this.updateGroundColors(colors);
        }
    }

    /**
     * 获取地面颜色配置
     */
    private getGroundColorConfig(): ConfigObject | null {
        const colors = this.settingsManager.getComponentConfig('ground', 'smoothstep');

        if (!colors) {
            this.logger.warn('[Ground] Ground color config not available yet, using defaults');
            return null;
        }

        return colors;
    }

    /**
     * 添加地面网格
     */
    private addGrid(): void {
        const root = this.root;
        if (!root) {
            this.logger.error('[Ground] Root node not found');
            return;
        }

        const segments = 1;
        this.gridGeometry = new Three.PlaneGeometry(
            this.groundSize,
            this.groundSize,
            segments,
            segments
        );

        this.groundMaterial = new Three.MeshStandardMaterial({
            roughness: 1.0,
            metalness: 0.0,
            color: 0x8B7355,
            emissiveIntensity: 0.3,
        });

        // ✅ 检查所有必需的资源
        const requiredResources = [
            "grassPathDensityDataTexture",
            "displacementMap",
            "perlinNoise",
            "groundRockMap",
            "groundRockAOMap"
        ];

        const missingResources: string[] = [];
        for (const resourceId of requiredResources) {
            const resource = resourcesManager.getItemById(resourceId);
            if (!resource) {
                missingResources.push(resourceId);
                this.logger.error(`[Ground] ${resourceId} not found in ResourcesManager`);
            }
        }

        if (missingResources.length > 0) {
            return;
        }

        const biomeTexture = resourcesManager.getItemById("grassPathDensityDataTexture");
        if (!biomeTexture) return;
        biomeTexture.wrapS = biomeTexture.wrapT = Three.ClampToEdgeWrapping;

        const displacementTexture = resourcesManager.getItemById("displacementMap");
        if (!displacementTexture) return;
        displacementTexture.wrapS = displacementTexture.wrapT = Three.RepeatWrapping;

        const perlinNoise = resourcesManager.getItemById("perlinNoise");
        if (!perlinNoise) return;
        perlinNoise.wrapS = perlinNoise.wrapT = Three.RepeatWrapping;

        const groundRockMap = resourcesManager.getItemById("groundRockMap");
        if (!groundRockMap) return;
        groundRockMap.wrapS = groundRockMap.wrapT = Three.RepeatWrapping;

        const groundRockAO = resourcesManager.getItemById("groundRockAOMap");
        if (!groundRockAO) return;
        groundRockAO.wrapS = groundRockAO.wrapT = Three.RepeatWrapping;

        const colors = this.getGroundColorConfig();

        this.customGroundUniforms = {
            uDensityMap: { value: biomeTexture },
            uGroundSize: {
                value: new Three.Vector3(this.worldSize, 0, this.worldSize),
            },
            uDisplacementMap: { value: displacementTexture },
            uPerlinNoise: { value: perlinNoise },
            uGroundRockMap: { value: groundRockMap },
            uGroundRockAO: { value: groundRockAO },
            uGroundColorLight: { value: colors?.uGroundColorLight?.clone() || new Three.Color(0.2784, 0.1372, 0.0235) },
            uGroundColorDark: { value: colors?.uGroundColorDark?.clone() || new Three.Color(0.94, 0.58, 0.22) },
            uGroundColorBelowGrass: { value: colors?.uGroundColorBelowGrass?.clone() || new Three.Color(0.12, 0.15, 0.03) },
            uRockColor: { value: colors?.uRockColor?.clone() || new Three.Color(1.0, 0.78, 0.47) },
            uHeightMap: { value: groundRockMap },
            uRockTiling: { value: 6.0 },
            uWaterShallow: { value: colors?.uWaterShallow?.clone() || new Three.Color(1.0, 0.4, 0.0) },
            uWaterDeep: { value: colors?.uWaterDeep?.clone() || new Three.Color(0.06, 0.5, 0.51) },
            uWaterDepthIntensity: { value: 1.0 },
        };

        const configureTexture = (texture: Three.Texture, repeat = 1) => {
            texture.wrapS = texture.wrapT = Three.RepeatWrapping;
            texture.repeat.set(repeat, repeat);
            texture.minFilter = Three.LinearMipmapLinearFilter;
            texture.magFilter = Three.LinearFilter;
            texture.generateMipmaps = true;
        };

        configureTexture(displacementTexture);
        configureTexture(perlinNoise);
        configureTexture(
            groundRockMap,
            this.customGroundUniforms.uRockTiling.value
        );
        configureTexture(groundRockAO, this.customGroundUniforms.uRockTiling.value);

        this.groundMaterial.onBeforeCompile = (shader) => {
            shader.uniforms = { ...shader.uniforms, ...this.customGroundUniforms };

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                groundVertexCommonChunk
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                groundVertexBeginChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                groundFragmentCommonChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                groundFragmentColorChunk
            );
            this.logger.info('[Ground] Shader compiled successfully');
        };

        const geometries: Three.BufferGeometry[] = [];
        const spacing = this.gridSpacing;
        const startX = -((this.gridCols - 1) / 2) * spacing;
        const startZ = -((this.gridRows - 1) / 2) * spacing;

        for (let i = 0; i < this.gridCols; i++) {
            for (let j = 0; j < this.gridRows; j++) {
                const x = startX + i * spacing;
                const z = startZ + j * spacing;

                let geo = this.gridGeometry!.clone();
                geo.rotateX(-Math.PI / 2);
                geo.translate(x, this.gridY, z);
                geometries.push(geo);
            }
        }

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
        geometries.forEach((g) => g.dispose());
        mergedGeometry.computeVertexNormals();

        const groundMesh = new Three.Mesh(mergedGeometry, this.groundMaterial);
        groundMesh.receiveShadow = true;
        groundMesh.name = 'GroundMesh';

        root.add(groundMesh);
    }

    /**
     * 更新地面颜色
     */
    private updateGroundColors(colors: ConfigObject): void {
        if (!colors || !this.customGroundUniforms) {
            return;
        }

        this.customGroundUniforms.uGroundColorLight.value.copy(colors.uGroundColorLight || new Three.Color(0.2784, 0.1372, 0.0235));
        this.customGroundUniforms.uGroundColorDark.value.copy(colors.uGroundColorDark || new Three.Color(0.94, 0.58, 0.22));
        this.customGroundUniforms.uGroundColorBelowGrass.value.copy(colors.uGroundColorBelowGrass || new Three.Color(0.12, 0.15, 0.03));
        this.customGroundUniforms.uRockColor.value.copy(colors.uRockColor || new Three.Color(1.0, 0.78, 0.47));
        this.customGroundUniforms.uWaterShallow.value.copy(colors.uWaterShallow || new Three.Color(1.0, 0.4, 0.0));
        this.customGroundUniforms.uWaterDeep.value.copy(colors.uWaterDeep || new Three.Color(0.06, 0.5, 0.51));

        if (this.groundMaterial) {
            this.groundMaterial.needsUpdate = true;
        }
    }

    /**
     * 获取世界尺寸
     */
    public getWorldSize(): number {
        return this.worldSize;
    }

    /**
     * ✅ 获取 BiomeManager 实例
     */
    public getBiomeManager(): BiomeManager | null {
        return this.biomeManager;
    }

    /**
     * ✅ 获取 GrassManager 实例
     */
    public getGrassManager(): GrassManager | null {
        return this.grassManager;
    }
}
