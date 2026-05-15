import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    type ComponentConfig,
    type IObject3DComponent,
    Object3DComponent,
    SceneWrapper,
    type SeasonChangedData,
    type TimeChangedData,
    type UpdateParams,
    resourcesManager,
    datetimeManager
} from "common-three";
import gsap from 'gsap';
import * as MATH from '/@/utils/math';
import BiomeManager from './biome';
import {type ConfigObject, SettingsManager, type EasingType} from "/@/settings";

import grassVertexCommonChunk from '/@/shaders/Chunks/grass/grass.vertex_common_chunk.glsl';
import grassVertexBeginNormalChunk from '/@/shaders/Chunks/grass/grass.vertex_begin_normal_chunk.glsl';
import grassVertexBeginChunk from '/@/shaders/Chunks/grass/grass.vertex_begin_chunk.glsl';
import grassFragmentCommonChunk from '/@/shaders/Chunks/grass/grass.fragment_common_chunk.glsl';
import grassFragmentColorChunk from '/@/shaders/Chunks/grass/grass.fragment_color_chunk.glsl';
import flowersVertexShader from '/@/shaders/Materials/flowers/vertex.glsl';
import flowersFragmentShader from '/@/shaders/Materials/flowers/fragment.glsl';


interface GrassConfig {
    worldSize?: number;
    tileSize?: number;
    gridCols?: number;
    gridRows?: number;
    gridSpacing?: number;
    grassPerTile?: number;
    flowersPerTile?: number;
    grassSize?: number;
    densityThreshold?: number;
}

export default class GrassManager extends Object3DComponent {

    private worldSize: number;
    private tileSize: number;
    private gridCols: number;
    private gridRows: number;
    private gridSpacing: number;
    private grassSize: number;
    private grassPerTile: number;
    private flowersPerTile: number;
    private densityThreshold: number;

    private sharedGeometry: Three.BufferGeometry | null = null;
    private sharedMaterial: Three.MeshStandardMaterial | null = null;
    private sharedUniforms: any = null;
    private grassInstancedMesh: Three.InstancedMesh | null = null;

    private flowerInstancedMesh: Three.InstancedMesh | null = null;
    private flowerMaterial: Three.ShaderMaterial | null = null;

    private colorConfig: ConfigObject | null | undefined = null;

    // BiomeManager
    private biomeManager: BiomeManager | null = null;
    private settingsManager: SettingsManager;

    constructor(scene: SceneWrapper, options: { 
        isDebugMode?: boolean;
        config?: GrassConfig;
        biomeManager?: BiomeManager;
    } = {}) {
        super(scene, 'weather-grass', options.isDebugMode);

        const config = options.config || {};

        this.biomeManager = options.biomeManager || null;

        this.settingsManager = SettingsManager.getInstance();
        
        this.worldSize = config.worldSize ?? 33;
        this.tileSize = config.tileSize ?? 11;
        this.gridCols = config.gridCols ?? 3;
        this.gridRows = config.gridRows ?? 3;
        this.gridSpacing = config.gridSpacing ?? this.tileSize;
        this.grassSize = config.grassSize ?? 1.185;
        
        this.grassPerTile = config.grassPerTile ?? this.getInitialGrassDensity();
        this.flowersPerTile = config.flowersPerTile ?? 20;
        this.densityThreshold = config.densityThreshold ?? 0.9;
    }

    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Grass] Initializing...');
        this.colorConfig = this.getGrassColorConfig();

        const grassGroup = new Three.Group();
        grassGroup.name = 'GrassGroup';
        this.setRoot(grassGroup);

        this.loadSharedResources();
        this.createAllGrassInSingleMesh();
        await this.createFlowers();

        this.logger.info('[Grass] Initialization complete');
    }

    protected onActivate(): void {
        this.logger.info('[Grass] Activating...');
    }

    protected onUpdate(params: UpdateParams): void {
        if (this.sharedUniforms) {
            this.sharedUniforms.uTime.value += 0.012;
        }

        if (this.flowerMaterial) {
            this.flowerMaterial.uniforms.uTime.value += 0.016;
        }
    }

    protected onDeactivate(): void {
        this.logger.info('[Grass] Deactivated');
    }

    protected onDispose(): void {
        this.logger.info('[Grass] Disposing...');

        if (this.grassInstancedMesh) {
            this.grassInstancedMesh.dispose();
            this.grassInstancedMesh = null;
        }

        if (this.flowerInstancedMesh) {
            this.flowerInstancedMesh.dispose();
            this.flowerInstancedMesh = null;
        }

        if (this.flowerMaterial) {
            this.flowerMaterial.dispose();
            this.flowerMaterial = null;
        }

        if (this.sharedGeometry) {
            this.sharedGeometry.dispose();
            this.sharedGeometry = null;
        }

        if (this.sharedMaterial) {
            this.sharedMaterial.dispose();
            this.sharedMaterial = null;
        }

        this.biomeManager = null;
    }

    public onTimeChanged(data: TimeChangedData): void {
        this.updateColors();
    }

    public onSeasonChanged(data: SeasonChangedData): void {
        this.colorConfig = this.getGrassColorConfig();
        this.updateColors();
    }

    private getInitialGrassDensity(): number {
        const defaultDensity = 12500;

        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (!savedSettings) return defaultDensity;

            const settings = JSON.parse(savedSettings);
            const quality = settings.graphicsQuality || 'medium';

            if (quality === 'custom') {
                return settings.customGrass || defaultDensity;
            }

            const presetDensities: Record<string, number> = {
                low: 10000,
                medium: 12500,
                high: 25000,
                ultra: 50000,
            };

            return presetDensities[quality] || defaultDensity;
        } catch (error) {
            this.logger.warn('Failed to load grass density from localStorage:', error);
            return defaultDensity;
        }
    }

    public getGrassColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('grass', easing);
    }

    private loadSharedResources(): void {
        const grassBlade = resourcesManager.getItemById('grassBladeModel');
        if (!grassBlade || !grassBlade.scene) {
            this.logger.error('Grass blade model not found');
            return;
        }

        grassBlade.scene.traverse((child: any) => {
            if (child.isMesh) {
                this.sharedGeometry = child.geometry;
                this.sharedGeometry?.computeBoundingBox();
            }
        });

        const biomeTexture = this.biomeManager?.getBiomeTexture();
        const normalTexture = resourcesManager.getItemById('displacedNormalMap');
        const displacementTexture = resourcesManager.getItemById('displacementMap');

        if (normalTexture) {
            normalTexture.wrapS = normalTexture.wrapT = Three.RepeatWrapping;
        }
        if (displacementTexture) {
            displacementTexture.wrapS = displacementTexture.wrapT = Three.RepeatWrapping;
        }

        const bb = this.sharedGeometry?.boundingBox;
        const bladeMinY = bb ? bb.min.y : 0.0;
        const bladeHeight = bb ? bb.max.y - bb.min.y : 1.0;

        const dayNight = datetimeManager.isDaytime() ? 'day' : 'night';
        const colors = this.colorConfig[dayNight];

        this.sharedUniforms = {
            uTime: { value: 0 },
            uDensityMap: { value: biomeTexture },
            uTerrainNormalMap: { value: normalTexture },
            uDisplacementMap: { value: displacementTexture },
            uGroundSize: { value: this.worldSize },
            uNormalStrength: { value: 0.3 },
            uTerrainNormalScale: { value: 1.0 },
            uGrassColorDark: { value: colors.dark.clone() },
            uGrassColorLight: { value: colors.light.clone() },
            uShadowColor: { value: colors.shadow.clone() },
            uWindSpeed: { value: 1.5 },
            uWindAmplitude: { value: 1.5 },
            uWindWaveTiling: { value: 1.0 },
            uWindWaveStrength: { value: -0.5 },
            uWindBaseTiling: { value: 0.3 },
            uWindBaseStrength: { value: 1.0 },
            uBladeModelMinY: { value: bladeMinY },
            uBladeModelHeight: { value: Math.max(bladeHeight, 1e-4) },
            uDensityThreshold: { value: this.densityThreshold },
        };

        this.sharedMaterial = this.createGrassMaterial();
    }

    private createGrassMaterial(): Three.MeshStandardMaterial {
        const material = new Three.MeshStandardMaterial();

        material.onBeforeCompile = (shader) => {
            shader.uniforms = { ...shader.uniforms, ...this.sharedUniforms };

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                grassVertexCommonChunk
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <beginnormal_vertex>',
                grassVertexBeginNormalChunk
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                grassVertexBeginChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                grassFragmentCommonChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                grassFragmentColorChunk
            );
        };

        return material;
    }

    private createAllGrassInSingleMesh(): void {
        const cols = this.gridCols;
        const rows = this.gridRows;
        const spacing = this.gridSpacing;

        const startX = -((cols - 1) / 2) * spacing;
        const startZ = -((rows - 1) / 2) * spacing;

        const allPositions: Array<{ worldX: number; worldZ: number }> = [];
        const allScales: number[] = [];

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const tileX = startX + i * spacing;
                const tileZ = startZ + j * spacing;

                for (let g = 0; g < this.grassPerTile; g++) {
                    const localX = MATH.random() * this.tileSize;
                    const localZ = MATH.random() * this.tileSize;

                    const worldX = tileX - this.tileSize / 2 + localX;
                    const worldZ = tileZ - this.tileSize / 2 + localZ;

                    const density = this.biomeManager?.getGrassDensity(worldX, worldZ) ?? 1.0;

                    if (density >= this.densityThreshold) {
                        allPositions.push({ worldX, worldZ });
                        allScales.push(this.grassSize + MATH.random() * 0.5);
                    }
                }
            }
        }

        const totalCount = allPositions.length;
        if (totalCount === 0) {
            this.logger.warn('No grass accepted! Check density threshold.');
            return;
        }

        if (!this.sharedGeometry || !this.sharedMaterial) {
            this.logger.error('Shared geometry or material not ready');
            return;
        }

        this.grassInstancedMesh = new Three.InstancedMesh(
            this.sharedGeometry,
            this.sharedMaterial,
            totalCount
        );
        this.grassInstancedMesh.receiveShadow = true;
        this.grassInstancedMesh.frustumCulled = false;
        this.grassInstancedMesh.castShadow = false;

        const baseScales = new Float32Array(totalCount);
        const worldPositions = new Float32Array(totalCount * 2);

        const dummy = new Three.Object3D();

        for (let i = 0; i < totalCount; i++) {
            const { worldX, worldZ } = allPositions[i];
            const scale = allScales[i];

            baseScales[i] = scale;
            worldPositions[i * 2] = worldX;
            worldPositions[i * 2 + 1] = worldZ;

            dummy.position.set(worldX, 0, worldZ);
            dummy.rotation.y = MATH.random() * Math.PI;
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();

            this.grassInstancedMesh.setMatrixAt(i, dummy.matrix);
        }

        this.grassInstancedMesh.instanceMatrix.needsUpdate = true;
        this.grassInstancedMesh.position.set(0, -0.3, 0);

        this.sharedGeometry.setAttribute(
            'aBaseScale',
            new Three.InstancedBufferAttribute(baseScales, 1)
        );
        this.sharedGeometry.setAttribute(
            'aWorldPosition',
            new Three.InstancedBufferAttribute(worldPositions, 2)
        );

        const root = this.root;
        if (root) {
            root.add(this.grassInstancedMesh);
        }
    }

    private async createFlowers(): Promise<void> {
        const texture1 = resourcesManager.getItemById('flowerTexture1');
        const texture2 = resourcesManager.getItemById('flowerTexture2');

        if (!texture1 || !texture2) {
            this.logger.warn('Flower textures not found, skipping flowers');
            return;
        }

        const texturesArray = [texture1, texture2];

        const atlasCanvas = document.createElement('canvas');
        const texSize = 256;
        atlasCanvas.width = texSize * 2;
        atlasCanvas.height = texSize;
        const ctx = atlasCanvas.getContext('2d');

        if (!ctx) {
            this.logger.error('Failed to get canvas context');
            return;
        }

        const promises = texturesArray.map((texture, i) => {
            return new Promise<void>((resolve) => {
                const img = texture.image;
                if (img && img.complete) {
                    ctx.drawImage(img, i * texSize, 0, texSize, texSize);
                    resolve();
                } else if (img) {
                    img.onload = () => {
                        ctx.drawImage(img, i * texSize, 0, texSize, texSize);
                        resolve();
                    };
                }
            });
        });

        await Promise.all(promises);

        const atlasTexture = new Three.CanvasTexture(atlasCanvas);
        atlasTexture.needsUpdate = true;
        this.createFlowersWithAtlas(atlasTexture);
    }

    private createFlowersWithAtlas(atlasTexture: Three.CanvasTexture): void {
        const cols = this.gridCols;
        const rows = this.gridRows;
        const spacing = this.gridSpacing;

        const startX = -((cols - 1) / 2) * spacing;
        const startZ = -((rows - 1) / 2) * spacing;

        const flowerPositions: Array<{ worldX: number; worldZ: number }> = [];

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const tileX = startX + i * spacing;
                const tileZ = startZ + j * spacing;

                for (let f = 0; f < this.flowersPerTile; f++) {
                    const localX = MATH.random() * this.tileSize;
                    const localZ = MATH.random() * this.tileSize;

                    const worldX = tileX - this.tileSize / 2 + localX;
                    const worldZ = tileZ - this.tileSize / 2 + localZ;

                    const density = this.biomeManager?.getGrassDensity(worldX, worldZ) ?? 1.0;
                    if (density >= this.densityThreshold) {
                        flowerPositions.push({ worldX, worldZ });
                    }
                }
            }
        }

        const totalFlowers = flowerPositions.length;
        if (totalFlowers === 0) {
            this.logger.warn('No flowers placed!');
            return;
        }

        const dayNight = datetimeManager.isDaytime() ? 'day' : 'night';
        const colors = this.colorConfig[dayNight];
        const fogUniforms = Three.UniformsUtils.merge([Three.UniformsLib['fog']]);
        
        this.flowerMaterial = new Three.ShaderMaterial({
            fog: true,
            uniforms: {
                ...fogUniforms,
                uTime: { value: 0 },
                uFlowerAtlas: { value: atlasTexture },
                uWindSpeed: { value: 1.5 },
                uWindAmplitude: { value: 0.3 },
                uTimeColorAlpha: { value: colors.flowerVisibility },
            },
            vertexShader: flowersVertexShader,
            fragmentShader: flowersFragmentShader,
            side: Three.FrontSide,
            alphaTest: 0.5,
            depthWrite: false,
            depthTest: true,
            transparent: true,
        });

        const flowerGeometry = new Three.PlaneGeometry(0.4, 0.4);

        this.flowerInstancedMesh = new Three.InstancedMesh(
            flowerGeometry,
            this.flowerMaterial,
            totalFlowers
        );

        this.flowerInstancedMesh.castShadow = true;
        this.flowerInstancedMesh.receiveShadow = true;

        const texOffsets = new Float32Array(totalFlowers * 2);
        const dummy = new Three.Object3D();

        for (let i = 0; i < totalFlowers; i++) {
            const { worldX, worldZ } = flowerPositions[i];

            const texIndex = Math.floor(MATH.random() * 3);

            texOffsets[i * 2] = texIndex * 0.5;
            texOffsets[i * 2 + 1] = 0.0;

            const scale = 0.6 + MATH.random() * 0.4;
            const yOffset = MATH.random() * 0.2;

            dummy.position.set(worldX, 0.7 + yOffset, worldZ);
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();

            this.flowerInstancedMesh.setMatrixAt(i, dummy.matrix);
        }

        flowerGeometry.setAttribute(
            'aTexOffset',
            new Three.InstancedBufferAttribute(texOffsets, 2)
        );

        this.flowerInstancedMesh.instanceMatrix.needsUpdate = true;
        
        const root = this.root;
        if (root) {
            root.add(this.flowerInstancedMesh);
        }
    }

    private updateColors(): void {
        if (!this.sharedUniforms) {
            return;
        }

        const dayNight = datetimeManager.isDaytime() ? 'day' : 'night';
        const colors = this.colorConfig[dayNight];

        gsap.to(this.sharedUniforms.uShadowColor.value, {
            r: colors.shadow.r,
            g: colors.shadow.g,
            b: colors.shadow.b,
            duration: 1,
            ease: 'power2.out',
        });

        gsap.to(this.sharedUniforms.uGrassColorDark.value, {
            r: colors.dark.r,
            g: colors.dark.g,
            b: colors.dark.b,
            duration: 1,
            ease: 'power2.out',
        });

        gsap.to(this.sharedUniforms.uGrassColorLight.value, {
            r: colors.light.r,
            g: colors.light.g,
            b: colors.light.b,
            duration: 1,
            ease: 'power2.out',
        });

        if (this.flowerMaterial) {
            this.flowerMaterial.uniforms.uTimeColorAlpha.value = colors.flowerVisibility;
        }
    }

    public regenerateGrass(): void {
        if (this.grassInstancedMesh) {
            this.grassInstancedMesh.dispose();
            this.grassInstancedMesh = null;
        }

        if (this.flowerInstancedMesh) {
            this.flowerInstancedMesh.dispose();
            this.flowerInstancedMesh = null;
        }

        this.createAllGrassInSingleMesh();
        this.createFlowers().then();
    }

    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();

        if (!this.sharedUniforms) return;

        const grassFolder = gui.addFolder('Grass');

        grassFolder
            .add(this.sharedUniforms.uNormalStrength, 'value', 0, 5, 0.1)
            .name('Normal Strength');

        grassFolder
            .addColor(this.sharedUniforms.uShadowColor, 'value')
            .name('Shadow Color');

        grassFolder
            .addColor(this.sharedUniforms.uGrassColorDark, 'value')
            .name('Grass Color Dark');

        grassFolder
            .addColor(this.sharedUniforms.uGrassColorLight, 'value')
            .name('Grass Color Light');

        grassFolder
            .add(this.sharedUniforms.uTerrainNormalScale, 'value', 0, 5, 0.1)
            .name('Terrain Normal Scale');

        grassFolder
            .add(this.sharedUniforms.uWindSpeed, 'value', 0, 50, 0.1)
            .name('Wind Speed');

        grassFolder
            .add(this.sharedUniforms.uWindAmplitude, 'value', 0, 50, 0.1)
            .name('Wind Amplitude');

        grassFolder
            .add(this.sharedUniforms.uWindWaveTiling, 'value', 0, 50, 0.1)
            .name('Wind Wave Tiling');

        grassFolder
            .add(this.sharedUniforms.uWindWaveStrength, 'value', -5, 5, 0.1)
            .name('Wind Wave Strength');

        grassFolder
            .add(this.sharedUniforms.uWindBaseTiling, 'value', 0, 5, 0.1)
            .name('Wind Base Tiling');

        grassFolder
            .add(this.sharedUniforms.uWindBaseStrength, 'value', 0, 5, 0.1)
            .name('Wind Base Strength');

        grassFolder
            .add(this.sharedUniforms.uDensityThreshold, 'value', 0, 1, 0.01)
            .name('Density Threshold');

        grassFolder.add({
            regenerate: () => this.regenerateGrass()
        }, 'regenerate').name('Regenerate Grass');
    }
}
