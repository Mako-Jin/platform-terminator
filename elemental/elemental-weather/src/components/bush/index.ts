import * as Three from 'three';
import ResourcesManager from "/@/resources/manager.ts";
import SeasonManager from "/@/manager/SeasonManager.ts";
import ColorManager from "/@/manager/ColorManager.ts";
import TimeManager from "/@/manager/TimeManager.ts";

import BushFragmentShader from '/@/shaders/Materials/bush/fragment.glsl';
import BushVertexShader from '/@/shaders/Materials/bush/vertex.glsl';
import {LoggerFactory} from "common-shared";
import BushManager from "/@/manager/BushManager.ts";
import {loadBushDefinitions, type BushDefinition} from "/@components/bush/loader.ts";


export default class Bush {

    private logger = LoggerFactory.create("weather-bush");

    private scene: Three.Scene;
    private isDebugMode: boolean;
    private keyLight: Three.Object3D | undefined;

    private resourcesManager: ResourcesManager;
    private seasonManager: SeasonManager;
    private colorManager: ColorManager;
    private timeManager: TimeManager;
    private samplerMesh!: Three.Mesh;
    private bushManager!: BushManager;
    private material!: Three.ShaderMaterial;
    private bushDefinitions: BushDefinition[];
    private debugGUI: any;

    constructor(scene: Three.Scene, isDebugMode: boolean = false) {
        this.scene = scene;
        this.isDebugMode = isDebugMode;

        this.keyLight = this.scene.getObjectByName('keyLight');

        this.resourcesManager = ResourcesManager.getInstance();
        this.seasonManager = SeasonManager.getInstance();
        this.colorManager = ColorManager.getInstance();
        this.timeManager = TimeManager.getInstance();

        this.init().then();

        this.colorManager.onColorChange(() => {
            this.updateColors();
        });

        this.timeManager.onHourChange(() => {
            this.onEnvTimeChanged();
        });

        this.seasonManager.onSeasonChange(() => {
            this.onSeasonChanged();
        });
    }

    v3(arr: number[]): Three.Vector3 {
        return new Three.Vector3(arr[0], arr[1], arr[2]);
    }
    
    col(arr: number[]): Three.Color {
        return new Three.Color(arr[0], arr[1], arr[2]);
    }

    getColorMultiplierForType(bushType: string): number[] {
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

    getColorsForBushType(bushType: string) {
        const preset = this.colorManager.getBushColorConfig("smoothstep");

        const defaultColors = {
            shadowColor: [0.01, 0.12, 0.01],
            midColor: [0.0, 0.25, 0.015],
            highlightColor: [0.25, 0.5, 0.007],
        };

        let colorArray;

        if (!preset) {
            this.logger.warn('No color preset available, using defaults');
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

        const result = {
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

        return result;
    }

    getDefaults() {
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

    async init() {
        this.logger.info('Loading bush definitions...');
        this.createMaterial();
        this.bushDefinitions = await loadBushDefinitions();

        if (this.bushDefinitions.length === 0) {
            this.logger.warn('No bush definitions loaded');
            return;
        }

        this.logger.info(`Loaded ${this.bushDefinitions.length} bush definitions`);

        this.samplerMesh = this.prepareSamplerMesh();
        this.bushManager = new BushManager(this.scene, {
            material: this.material,
            samplerMesh: this.samplerMesh,
            maxLeaves: 1755,
        });

        this.spawnFromDefinitions();
        if (this.isDebugMode) {
            this.initGUI();
        }
        this.logger.info('Bush initialization complete');
    }

    createMaterial() {
        const leavesAlphaMap = this.resourcesManager.getItem("leavesAlphaMap");
        
        if (!leavesAlphaMap) {
            this.logger.error('leavesAlphaMap not found! This will cause rendering issues.');
        } else {
            this.logger.info('leavesAlphaMap loaded successfully');
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
            this.logger.debug('Using keyLight direction:', lightDirection.toArray());
        } else {
            this.logger.warn('keyLight not found, using default light direction');
        }

        this.logger.info('Creating bush material with colors:', {
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

        this.logger.info('Bush material created successfully');
    }

    prepareSamplerMesh() {
        const model = this.resourcesManager.getItem("BushEmitterModel");
        if (!model) {
            this.logger.warn('BushEmitterModel not found in resources');
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

    spawnFromDefinitions() {
        const d = this.getDefaults();

        this.logger.info(`Spawning ${this.bushDefinitions.length} bushes`);

        let bushCount = 0;
        this.bushDefinitions.forEach((def: BushDefinition, index) => {
            const bushType = def.bushType || 'default';
            const colors = this.getColorsForBushType(bushType);

            const colorMultiplier = this.getColorMultiplierForType(bushType);

            if (index === 0) {
                this.logger.info('First bush configuration:', {
                    bushType,
                    position: def.position,
                    shadowColor: colors.shadowColor.toArray(),
                    midColor: colors.midColor.toArray(),
                    highlightColor: colors.highlightColor.toArray(),
                    colorMultiplier: colorMultiplier
                });
                
                const preset = this.colorManager.getBushColorConfig("smoothstep");
                this.logger.info('Current preset shadowColor:', preset?.shadowColor);
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

            const result = this.bushManager.addBush(cfg);
            if (result) {
                bushCount++;
            }
        });

        const totalLeaves = this.bushManager.getTotalLeafCount();
        this.logger.info(`Successfully created ${bushCount} bushes with ${totalLeaves} total leaves`);
    }

    onEnvTimeChanged() {
        this.updateColors();
    }

    onSeasonChanged() {
        this.updateColors();
    }

    updateColors() {
        const preset = this.colorManager.getBushColorConfig("smoothstep");

        if (!preset) {
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

    rebuildBushes() {
        if (!this.bushManager) {
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

    initGUI() {
        if (!this.debugGUI) return;

        const controls = [
            { uniform: 'uShadowColor', label: 'Bush Color Shadow', type: 'color' },
            { uniform: 'uMidColor', label: 'Bush Color Mid', type: 'color' },
            { uniform: 'uHighlightColor', label: 'Bush Color Light', type: 'color' },

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
            const uniformObj = this.material.uniforms[c.uniform];
            if (!uniformObj) return;

            const guiArgs =
                c.type === 'color'
                    ? [uniformObj, 'value', { type: 'color', label: c.label }, 'Bush']
                    : [uniformObj, 'value', { ...c.options, label: c.label }, 'Bush'];

            this.debugGUI.add(...guiArgs);
        });
    }

    update() {
        this.material.uniforms.uTime.value += 0.001;
        if (this.bushManager && typeof this.bushManager.update === 'function') {
            this.bushManager.update();
        }
    }

    dispose() {
        this.timeManager.offHourChange();
        this.seasonManager.offSeasonChange();

        if (this.bushManager && typeof this.bushManager.dispose === 'function') {
            this.bushManager.dispose();
        }

        if (this.material) {
            this.material.dispose();
        }
    }
}
