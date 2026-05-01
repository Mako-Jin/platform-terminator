import * as Three from "three";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import ResourceManager from "/@/resources/manager";
import SeasonManager from "/@/manager/SeasonManager";
import ColorManager from "/@/manager/ColorManager";
import TimeManager from "/@/manager/TimeManager";
import type Renderer from "/@/core/Renderer.ts";

import groundVertexCommonChunk from '/@/shaders/Chunks/ground/ground.vertex_common_chunk.glsl';
import groundVertexBeginChunk from '/@/shaders/Chunks/ground/ground.vertex_begin_chunk.glsl';
import groundFragmentCommonChunk from '/@/shaders/Chunks/ground/ground.fragment_common_chunk.glsl';
import groundFragmentColorChunk from '/@/shaders/Chunks/ground/ground.fragment_color_chunk.glsl';
import waterVertexCommonChunk from '/@/shaders/Chunks/water/water.vertex_common_chunk.glsl';
import waterVertexBeginChunk from '/@/shaders/Chunks/water/water.vertex_begin_chunk.glsl';
import waterFragmentCommonChunk from '/@/shaders/Chunks/water/water.fragment_common_chunk.glsl';
import waterFragmentColorChunk from '/@/shaders/Chunks/water/water.fragment_color_chunk.glsl';


export default class Ground {

    private scene: Three.Scene;
    private renderer: Renderer;
    private groundSize: number;
    private gridCols: number;
    private gridRows: number;
    private gridSpacing: any;
    private gridY: number;
    private group: Three.Group;
    private worldSize: number;

    private gridGeometry: Three.PlaneGeometry;
    private groundMaterial: Three.MeshStandardMaterial;

    private resourceManager: ResourceManager;
    private seasonManager: SeasonManager;
    private colorManager: ColorManager;
    private timeManager: TimeManager;

    private customGroundUniforms: any;

    constructor(scene: Three.Scene, renderer: Renderer, {
        groundSize = 11,
        gridCols = 3,
        gridRows = 3,
        gridSpacing = null,
        gridY = 0.0,
    } = {}) {
        this.scene = scene;
        this.renderer = renderer;
        this.groundSize = groundSize;
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.gridSpacing = gridSpacing ?? this.groundSize;
        this.gridY = gridY;

        this.worldSize = this.gridCols * this.groundSize;

        this.group = new Three.Group();
        this.scene.add(this.group);

        this.resourceManager = ResourceManager.getInstance();
        this.seasonManager = SeasonManager.getInstance();
        this.colorManager = ColorManager.getInstance();
        this.timeManager = TimeManager.getInstance();

        this.setupColorUpdateListener();
        this.addGrid();
    }

    private setupColorUpdateListener(): void {
        this.colorManager.onColorChange((data) => {
            if (data.component === 'ground' && this.customGroundUniforms) {
                this.updateGroundColors(data.config);
            }
        });
    }

    private getGroundColorConfig() {
        const colors = this.colorManager.getGroundColorConfig('smoothstep');
        
        if (!colors) {
            console.warn('[Ground] Ground color config not available yet, using defaults');
            return {
                uGroundColorLight: new Three.Color(0.2784, 0.1372, 0.0235),
                uGroundColorDark: new Three.Color(0.94, 0.58, 0.22),
                uGroundColorBelowGrass: new Three.Color(0.12, 0.15, 0.03),
                uRockColor: new Three.Color(1.0, 0.78, 0.47),
                uWaterShallow: new Three.Color(1.0, 0.4, 0.0),
                uWaterDeep: new Three.Color(0.06, 0.5, 0.51),
            };
        }
        
        return colors;
    }

    private addGrid() {
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
        });

        const biomeTexture = this.resourceManager.getItem("grassPathDensityDataTexture");
        if (!biomeTexture) {
            console.warn('[Ground] grassPathDensityDataTexture not found in ResourceManager');
            return;
        }
        biomeTexture.wrapS = biomeTexture.wrapT = Three.ClampToEdgeWrapping;

        const displacementTexture = this.resourceManager.getItem("displacementMap");
        if (!displacementTexture) {
            console.warn('[Ground] displacementMap not found in ResourceManager');
            return;
        }
        displacementTexture.wrapS = displacementTexture.wrapT = Three.RepeatWrapping;
        
        const perlinNoise = this.resourceManager.getItem("perlinNoise");
        if (!perlinNoise) {
            console.warn('[Ground] perlinNoise not found in ResourceManager');
            return;
        }
        perlinNoise.wrapS = perlinNoise.wrapT = Three.RepeatWrapping;

        const groundRockMap = this.resourceManager.getItem("groundRockMap");
        if (!groundRockMap) {
            console.warn('[Ground] groundRockMap not found in ResourceManager');
            return;
        }
        groundRockMap.wrapS = groundRockMap.wrapT = Three.RepeatWrapping;

        const groundRockAO = this.resourceManager.getItem("groundRockAOMap");
        if (!groundRockAO) {
            console.warn('[Ground] groundRockAOMap not found in ResourceManager');
            return;
        }
        groundRockAO.wrapS = groundRockAO.wrapT = Three.RepeatWrapping;

        const colors = this.getGroundColorConfig();

        console.log('[Ground] Color config:', colors ? 'Loaded' : 'Using defaults');

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

        const configureTexture = (texture, repeat = 1) => {
            texture.wrapS = texture.wrapT = Three.RepeatWrapping;
            texture.repeat.set(repeat, repeat);
            texture.minFilter = Three.LinearMipmapLinearFilter;
            texture.magFilter = Three.LinearFilter;
            texture.anisotropy = this.renderer.getRendererInstance().capabilities.getMaxAnisotropy();
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
            
            console.log('[Ground] Shader compiled successfully');
        };

        const geometries = [];
        const cols = 5;
        const rows = 5;
        const spacing = this.gridSpacing;
        const startX = -((cols - 1) / 2) * spacing;
        const startZ = -((rows - 1) / 2) * spacing;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = startX + i * spacing;
                const z = startZ + j * spacing;

                let geo = this.gridGeometry.clone();
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
        this.group.add(groundMesh);
        
        console.log('[Ground] Ground mesh created and added to scene', {
            position: groundMesh.position,
            rotation: groundMesh.rotation,
            scale: groundMesh.scale,
            visible: groundMesh.visible,
            geometry: mergedGeometry,
            material: this.groundMaterial,
            group: this.group,
            groupPosition: this.group.position,
            sceneChildren: this.scene.children.length
        });
        
        const camera = this.scene.children.find(child => child.isCamera);
        if (camera) {
            console.log('[Ground] Camera info:', {
                position: camera.position,
                far: camera.far,
                near: camera.near,
                fov: camera.fov
            });
        }
    }

    private updateGroundColors(colors: any): void {
        if (!colors || !this.customGroundUniforms) {
            return;
        }

        this.customGroundUniforms.uGroundColorLight.value.copy(colors.uGroundColorLight || new Three.Color(0.2784, 0.1372, 0.0235));
        this.customGroundUniforms.uGroundColorDark.value.copy(colors.uGroundColorDark || new Three.Color(0.94, 0.58, 0.22));
        this.customGroundUniforms.uGroundColorBelowGrass.value.copy(colors.uGroundColorBelowGrass || new Three.Color(0.12, 0.15, 0.03));
        this.customGroundUniforms.uRockColor.value.copy(colors.uRockColor || new Three.Color(1.0, 0.78, 0.47));
        this.customGroundUniforms.uWaterShallow.value.copy(colors.uWaterShallow || new Three.Color(1.0, 0.4, 0.0));
        this.customGroundUniforms.uWaterDeep.value.copy(colors.uWaterDeep || new Three.Color(0.06, 0.5, 0.51));

        this.groundMaterial.needsUpdate = true;
    }

    public update(): void {
    }

    public dispose(): void {
        this.colorManager.offColorChange();
        this.gridGeometry.dispose();
        this.groundMaterial.dispose();
        this.group.clear();
    }

}
