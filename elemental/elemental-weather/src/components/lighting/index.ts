import * as Three from 'three';
import TimeManager from "/@/manager/TimeManager.ts";
import SeasonManager from "/@/manager/SeasonManager.ts";
import ResourcesManager from "/@/resources/manager.ts";
import ColorManager from "/@/manager/ColorManager.ts";
import type {ConfigObject} from "/@/utils/color.ts";
import type {SeasonChangedData} from "/@/manager/SeasonManager.ts";
import {LoggerFactory} from "common-shared";


export default class Lighting {

    private logger = LoggerFactory.create("weather-lighting");

    private isDebugMode: boolean;
    private helperEnabled: boolean;

    private scene: Three.Scene;

    private lights: { 
        key: Three.DirectionalLight | null; 
        fill: Three.DirectionalLight | null; 
        ambient: Three.AmbientLight | null; 
        rim: Three.DirectionalLight | null; 
        lamp: Three.PointLight | null 
    };

    private seasonManager: SeasonManager;
    private timeManager: TimeManager;
    private resourcesManager: ResourcesManager;
    private colorManager: ColorManager;

    private environmentMap: {
        day: Three.Texture;
        night: Three.Texture;
        current: Three.Texture | null;
        intensity: number;
    } | null;

    private envMapRotationY: number = 0;
    private envMapRotationX: number = 0;
    private envMapRotationZ: number = 0;

    constructor(scene: Three.Scene, options: { isDebugMode?: boolean } = {}) {
        this.scene = scene;
        this.isDebugMode = options.isDebugMode ?? false;
        this.helperEnabled = this.isDebugMode;

        this.timeManager = TimeManager.getInstance();
        this.seasonManager = SeasonManager.getInstance();
        this.resourcesManager = ResourcesManager.getInstance();
        this.colorManager = ColorManager.getInstance();

        this.lights = {
            key: null,
            fill: null,
            ambient: null,
            rim: null,
            lamp: null,
        };

        this.environmentMap = null;

        this.setupEventListeners();
        this.initializeLighting().then();
    }

    private setupEventListeners(): void {
        this.timeManager.onHourChange(() => {
            this.refreshLightingConfig();
        });

        this.seasonManager.onSeasonChange((data: SeasonChangedData) => {
            this.onSeasonChanged(data.season, data.previousSeason, data);
        });
    }

    private async initializeLighting(): Promise<void> {
        this.logger.info('[Lighting] Waiting for dependencies...');
        await this.waitForDependencies();

        this.logger.info('[Lighting] Creating lights...');
        this.createLights();
        this.configureShadows();
        this.setupEnvironment();

        this.logger.info('[Lighting] Refreshing lighting config...');
        this.refreshLightingConfig();
        
        if (this.helperEnabled) {
            this.addHelpers();
        }
        this.logger.info('[Lighting] Initialization complete');
    }

    private async waitForDependencies(): Promise<void> {
        try {
            await this.seasonManager.waitForInitialization();
        } catch (error) {
            this.logger.error('[Lighting] Failed to wait for SeasonManager initialization:', error);
        }
    }

    private refreshLightingConfig(): void {
        this.logger.info('[Lighting] Getting lighting config from ColorManager...');
        const config = this.colorManager.getLightingConfig('smoothstep');
        
        if (config) {
            this.logger.info('[Lighting] Config received, applying...');
            this.applyLightingConfig(config);
        } else {
            this.logger.warn('[Lighting] Lighting config not available yet');
        }
    }

    onSeasonChanged(newSeason: string, oldSeason: string, data: SeasonChangedData): void {
        this.refreshLightingConfig();
    }

    createLights(): void {
        this.lights.lamp = new Three.PointLight();
        this.scene.add(this.lights.lamp);

        this.lights.key = new Three.DirectionalLight();
        this.lights.key.name = 'keyLight';
        this.scene.add(this.lights.key);

        this.lights.fill = new Three.DirectionalLight();
        this.lights.fill.name = 'fillLight';
        this.scene.add(this.lights.fill);

        this.lights.ambient = new Three.AmbientLight();
        this.lights.ambient.name = 'ambientLight';
        this.scene.add(this.lights.ambient);

        this.lights.rim = new Three.DirectionalLight();
        this.lights.rim.name = 'rimLight';
        this.scene.add(this.lights.rim);
    }

    configureShadows(): void {
        const shadowSize = 2048;
        const frustumSize = 12;

        if (this.lights.key) {
            this.lights.key.castShadow = true;
            this.lights.key.shadow.mapSize.set(shadowSize, shadowSize);
            this.lights.key.shadow.camera.left = -frustumSize;
            this.lights.key.shadow.camera.right = frustumSize;
            this.lights.key.shadow.camera.top = frustumSize;
            this.lights.key.shadow.camera.bottom = -frustumSize;
            this.lights.key.shadow.camera.near = 0.1;
            this.lights.key.shadow.camera.far = 60;
            this.lights.key.shadow.bias = -0.0001;
            this.lights.key.shadow.normalBias = 0.02;
            this.lights.key.shadow.radius = 2;
        }
    }

    setupEnvironment(): void {
        const dayTexture = this.resourcesManager.getItem<Three.Texture>("environmentMapDayTexture");
        const nightTexture = this.resourcesManager.getItem<Three.Texture>("environmentMapNightTexture");

        if (!dayTexture || !nightTexture) {
            this.logger.warn('[Lighting] Environment map textures not found in ResourcesManager');
            return;
        }

        this.environmentMap = {
            day: dayTexture,
            night: nightTexture,
            current: null,
            intensity: 0.3,
        };

        this.environmentMap.day.colorSpace = Three.SRGBColorSpace;
        this.environmentMap.night.colorSpace = Three.SRGBColorSpace;
    }

    applyLightingConfig(config: ConfigObject): void {
        const interpolatedConfig = config as any;

        if (this.lights.lamp && interpolatedConfig.lamp) {
            this.lights.lamp.color.setHex(interpolatedConfig.lamp.color);
            this.lights.lamp.intensity = interpolatedConfig.lamp.intensity;
            this.lights.lamp.position.set(...interpolatedConfig.lamp.position);
            this.lights.lamp.castShadow = interpolatedConfig.lamp.castShadow;
            this.lights.lamp.distance = interpolatedConfig.lamp.distance;
            this.lights.lamp.decay = interpolatedConfig.lamp.decay;
        }

        if (this.lights.key && interpolatedConfig.key) {
            this.lights.key.color.setHex(interpolatedConfig.key.color);
            this.lights.key.intensity = interpolatedConfig.key.intensity;
            this.lights.key.position.set(...interpolatedConfig.key.position);
            this.lights.key.castShadow = interpolatedConfig.key.castShadow;
        }

        if (this.lights.fill && interpolatedConfig.fill) {
            this.lights.fill.color.setHex(interpolatedConfig.fill.color);
            this.lights.fill.intensity = interpolatedConfig.fill.intensity;
            this.lights.fill.position.set(...interpolatedConfig.fill.position);
        }

        if (this.lights.ambient && interpolatedConfig.ambient) {
            this.lights.ambient.color.setHex(interpolatedConfig.ambient.color);
            this.lights.ambient.intensity = interpolatedConfig.ambient.intensity;
        }

        if (this.lights.rim && interpolatedConfig.rim) {
            this.lights.rim.color.setHex(interpolatedConfig.rim.color);
            this.lights.rim.intensity = interpolatedConfig.rim.intensity;
            this.lights.rim.position.set(...interpolatedConfig.rim.position);
        }

        if (interpolatedConfig.environment) {
            this.updateEnvironment(interpolatedConfig.environment);
        }
    }

    updateEnvironment(envSettings: any): void {
        if (!this.environmentMap) {
            return;
        }

        const timeFactor = this.timeManager.getColorInterpolationFactor('smoothstep');
        this.environmentMap.current = this.interpolateEnvironmentMap(timeFactor);
        this.environmentMap.intensity = envSettings.intensity;

        this.scene.environment = this.environmentMap.current;
        this.scene.background = this.environmentMap.current;  // 使用环境贴图作为背景
        this.scene.environmentIntensity = envSettings.intensity;

        this.envMapRotationY = envSettings.rotationY || 0;
        this.envMapRotationX = envSettings.rotationX || 0;
        this.envMapRotationZ = envSettings.rotationZ || 0;

        this.scene.environmentRotation.y = this.envMapRotationY;
        this.scene.environmentRotation.x = this.envMapRotationX;
        this.scene.environmentRotation.z = this.envMapRotationZ;

        this.updateMaterials();
    }

    interpolateEnvironmentMap(timeFactor: number): Three.Texture | null {
        if (!this.environmentMap) {
            return null;
        }

        if (timeFactor <= 0) {
            return this.environmentMap.day;
        } else if (timeFactor >= 1) {
            return this.environmentMap.night;
        } else {
            return this.environmentMap.day;
        }
    }

    updateMaterials(): void {
        if (!this.environmentMap?.current) {
            return;
        }

        this.scene.traverse((child) => {
            if (child instanceof Three.Mesh && child.material) {
                const material = child.material as Three.Material;

                if (
                    material instanceof Three.MeshStandardMaterial ||
                    material instanceof Three.MeshPhysicalMaterial
                ) {
                    material.envMap = this.environmentMap!.current;
                    material.envMapIntensity = this.environmentMap!.intensity;

                    if (material.roughness > 0.6) {
                        material.roughness = 0.75;
                    }

                    material.needsUpdate = true;
                } else if (
                    material instanceof Three.MeshPhongMaterial ||
                    material instanceof Three.MeshBasicMaterial
                ) {
                    material.envMap = this.environmentMap!.current;
                    
                    const timeFactor = this.timeManager.getColorInterpolationFactor('smoothstep');
                    material.reflectivity = 0.5 - timeFactor * 0.2;
                    material.needsUpdate = true;
                }
            }
        });
    }

    addHelpers(): void {
        this.logger.info('[Lighting] Lighting helpers enabled (not implemented yet)');
    }

}
