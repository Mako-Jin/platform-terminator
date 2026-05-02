import {LoggerFactory} from "common-shared";
import * as Three from 'three';
import TimeManager, {type HourChangedData} from "/@/manager/TimeManager.ts";
import SeasonManager, {type SeasonChangedData} from "/@/manager/SeasonManager.ts";
import ColorManager, {type ColorChangedData} from "/@/manager/ColorManager.ts";
import {type ConfigObject} from "/@/utils/color";

import skydomeVertexShader from '/@/shaders/Materials/skydome/vertex.glsl';
import skydomeFragmentShader from '/@/shaders/Materials/skydome/fragment.glsl';


export default class Skydome {

    private logger = LoggerFactory.create("weather-skydome");
    private scene: Three.Scene;
    private timeManager: TimeManager;
    private seasonManager: SeasonManager;
    private colorManager: ColorManager;
    private readonly isDebugMode: boolean;
    private skydome: Three.Mesh | null;
    private skydomeMaterial: Three.ShaderMaterial | null;

    constructor(scene: Three.Scene, isDebugMode: boolean = false) {
        this.scene = scene;
        this.timeManager = TimeManager.getInstance();
        this.seasonManager = SeasonManager.getInstance();
        this.colorManager = ColorManager.getInstance();

        this.isDebugMode = isDebugMode;

        this.skydome = null;
        this.skydomeMaterial = null;

        this.initialize();

        this.timeManager.onHourChange((newHour: number, oldHour: number, data: HourChangedData) => {
            this.onEnvTimeChanged(newHour, oldHour, data);
        });

        this.seasonManager.onSeasonChange((data: SeasonChangedData) => {
            this.onSeasonChanged(data);
        });
        
        this.colorManager.onColorChange((data: ColorChangedData) => {
            if (data.component === 'skydome') {
                this.updateSkyColors();
            }
        });
    }


    private initialize(): void {
        this.createSkydome();

        setTimeout(() => {
            this.updateSkyColors();
        }, 0);
    }

    private createSkydome(): void {
        const geometry = new Three.SphereGeometry(150, 32, 16);

        this.skydomeMaterial = new Three.ShaderMaterial({
            uniforms: {
                uZenithColor: { value: new Three.Color(0.2, 0.5, 0.9) },
                uHorizonColor: { value: new Three.Color(0.7, 0.85, 0.95) },
                uGroundColor: { value: new Three.Color(0.95, 0.9, 0.85) },

                uSunPosition: { value: new Three.Vector3(-0.846, -0.085, -1.0) },
                uSunColor: { value: new Three.Color(1.0, 0.95, 0.8) },
                uSunGlowColor: { value: new Three.Color(1.0, 0.7, 0.3) },
                uSunSize: { value: 0.005 },
                uSunGlowSize: { value: 0.03386 },
                uSunRayCount: { value: 12.0 },
                uSunRayLength: { value: 0.0352 },
                uSunRaySharpness: { value: 8.0 },

                uMoonPosition: { value: new Three.Vector3(-0.5, -0.085, -1.0) },
                uMoonColor: { value: new Three.Color(0.95, 0.95, 1.0) },
                uMoonGlowColor: { value: new Three.Color(0.7, 0.8, 1.0) },
                uMoonSize: { value: 0.0268665 },
                uMoonGlowSize: { value: 0.0266345 },

                uStarColor: { value: new Three.Color(1.0, 1.0, 1.0) },
                uStarDensity: { value: 10.0 },
                uStarBrightness: { value: 2.5 },

                uTime: { value: 0 },
                uIsNight: { value: 0.0 },
                uSeason: { value: 0.0 },
                uAtmosphereIntensity: { value: 0.0 },
            },
            vertexShader: skydomeVertexShader,
            fragmentShader: skydomeFragmentShader,
            side: Three.BackSide,
        });

        this.skydome = new Three.Mesh(geometry, this.skydomeMaterial);
        this.scene.add(this.skydome);

        if (this.isDebugMode) {
            this.initGUI();
        }
    }

    private onEnvTimeChanged(newHour: number, oldHour: number, data: HourChangedData): void {
        this.logger.debug(`Hour changed: ${oldHour} -> ${newHour}`);
        this.updateSkyColors();
    }

    private onSeasonChanged(data: SeasonChangedData): void {
        this.logger.debug(`Season changed: ${data.previousSeason} -> ${data.season}`);
        this.updateSkyColors();
    }

    private updateSkyColors(): void {
        const colors = this.colorManager.getSkydomeColorConfig('smoothstep');

        if (!colors) {
            this.logger.warn('No skydome color config available');
            return;
        }

        if (!this.skydomeMaterial || !this.skydomeMaterial.uniforms) {
            this.logger.warn('Skydome material not initialized');
            return;
        }

        this.updateColorUniform(colors);
        this.updateDayNightUniform();
        this.updateSeasonUniform();
    }

    private updateColorUniform(colors: ConfigObject): void {
        if (!this.skydomeMaterial) return;

        const uniforms = this.skydomeMaterial.uniforms;

        if (colors.zenithColor && uniforms.uZenithColor) {
            uniforms.uZenithColor.value.copy(colors.zenithColor as Three.Color);
        }
        if (colors.horizonColor && uniforms.uHorizonColor) {
            uniforms.uHorizonColor.value.copy(colors.horizonColor as Three.Color);
        }
        if (colors.groundColor && uniforms.uGroundColor) {
            uniforms.uGroundColor.value.copy(colors.groundColor as Three.Color);
        }
    }

    private updateDayNightUniform(): void {
        if (!this.skydomeMaterial) return;

        const currentHour = this.timeManager.getHour();
        const isNight = currentHour < 6 || currentHour >= 18 ? 1.0 : 0.0;
        
        if (this.skydomeMaterial.uniforms.uIsNight) {
            this.skydomeMaterial.uniforms.uIsNight.value = isNight;
        }

        const colors = this.colorManager.getSkydomeColorConfig('smoothstep');
        if (!colors) return;

        const uniforms = this.skydomeMaterial.uniforms;

        if (isNight === 0.0) {
            if (colors.sunColor && uniforms.uSunColor) {
                uniforms.uSunColor.value.copy(colors.sunColor as Three.Color);
            }
            if (colors.sunGlowColor && uniforms.uSunGlowColor) {
                uniforms.uSunGlowColor.value.copy(colors.sunGlowColor as Three.Color);
            }
        } else {
            if (colors.moonColor && uniforms.uMoonColor) {
                uniforms.uMoonColor.value.copy(colors.moonColor as Three.Color);
            }
            if (colors.moonGlowColor && uniforms.uMoonGlowColor) {
                uniforms.uMoonGlowColor.value.copy(colors.moonGlowColor as Three.Color);
            }
            if (colors.starColor && uniforms.uStarColor) {
                uniforms.uStarColor.value.copy(colors.starColor as Three.Color);
            }
        }
    }

    private updateSeasonUniform(): void {
        if (!this.skydomeMaterial) return;

        const seasonMap: Record<string, number> = { 
            spring: 0, 
            winter: 1, 
            autumn: 2, 
            rainy: 3 
        };
        
        const currentSeason = this.seasonManager.season;
        const seasonValue = seasonMap[currentSeason] ?? 0;
        
        if (this.skydomeMaterial.uniforms.uSeason) {
            this.skydomeMaterial.uniforms.uSeason.value = seasonValue;
        }
    }

    public update(elapsedTime: number): void {
        if (this.skydomeMaterial && this.skydomeMaterial.uniforms) {
            this.skydomeMaterial.uniforms.uTime.value = elapsedTime;
        }
    }

    public dispose(): void {
        this.timeManager.offHourChange();
        this.seasonManager.offSeasonChange();
        this.colorManager.offColorChange();

        if (this.skydome) {
            this.scene.remove(this.skydome);
            this.skydome.geometry.dispose();
            
            if (this.skydome.material instanceof Three.Material) {
                this.skydome.material.dispose();
            }
        }

        this.skydome = null;
        this.skydomeMaterial = null;
        
        this.logger.debug('Skydome disposed');
    }

    private initGUI(): void {
        // TODO: Implement GUI controls for debug mode
        this.logger.info('GUI initialization placeholder');
    }

}
