

import * as Three from 'three';
import TimeManager from "/@/manager/TimeManager.ts";
import SeasonManager from "/@/manager/SeasonManager.ts";


export default class Fog {
    private scene: Three.Scene;
    private timeManager: any;
    private seasonManager: any;
    private worldSize: number;
    private fogNear: number;
    private fogFar: number;
    private fogColors: any;
    private currentSeason: string;
    private envTime: string;
    private game: any;
    private debugGUI: any;

    constructor(scene: Three.Scene, worldSize: number) {
        this.scene = scene;
        this.timeManager = TimeManager.getInstance();
        this.seasonManager = SeasonManager.getInstance();

        this.worldSize = worldSize;
        this.fogNear = 47;
        this.fogFar = 57;

        this.fogColors = this.createFogColorPresets();
        this.currentSeason = this.seasonManager.currentSeason || 'spring';
        this.envTime = this.timeManager.hourType || 'day';

        this.initialize();

        this.timeManager.onHourChange((newValue: string) => {
            this.onEnvTimeChanged(newValue);
        });

        this.seasonManager.onSeasonChange((newSeason: string) => {
            this.onSeasonChanged(newSeason);
        });
    }

    createFogColorPresets() {
        return {
            spring: {
                day: new Three.Color(
                    0.19607843137254902,
                    0.5098039215686274,
                    0.803921568627451
                ),
                night: new Three.Color(0.0, 0.011, 0.039),
            },
            winter: {
                day: new Three.Color(0.6, 0.702, 0.898),
                night: new Three.Color(0, 0.007, 0.039),
            },
            autumn: {
                day: new Three.Color(
                    0.09019607843137255,
                    0.39215686274509803,
                    0.45098039215686275
                ),
                night: new Three.Color(
                    0.0196078431372549,
                    0.00784313725490196,
                    0.011764705882352941
                ),
            },
            rainy: {
                day: new Three.Color(0.133, 0.223, 0.305),
                night: new Three.Color(
                    0.00392156862745098,
                    0.011764705882352941,
                    0.0196078431372549
                ),
            },
        };
    }

    initialize() {
        const color = this.fogColors[this.currentSeason][this.envTime];
        this.scene.fog = new Three.Fog(color, this.fogNear, this.fogFar);

        if (this.game && this.game.isDebugMode) {
            this.initGUI();
        }
    }

    onEnvTimeChanged(newValue: string) {
        this.envTime = newValue;
        this.updateFogColor();
    }

    onSeasonChanged(newSeason: string) {
        this.currentSeason = newSeason;
        this.updateFogColor();
    }

    updateFogColor() {
        if (!this.scene.fog) return;

        const targetColor = this.fogColors[this.currentSeason][this.envTime];
        this.scene.fog.color.copy(targetColor);
    }

    initGUI() {
        if (!this.debugGUI || !this.scene.fog) return;

        this.debugGUI.add(
            this.scene.fog,
            'near',
            { min: 0, max: 100, step: 0.5, label: 'Fog Near' },
            'Fog'
        );
        this.debugGUI.add(
            this.scene.fog,
            'far',
            { min: 0, max: 100, step: 0.5, label: 'Fog Far' },
            'Fog'
        );
        this.debugGUI.add(
            this.scene.fog,
            'color',
            { type: 'color', label: 'Fog Color' },
            'Fog'
        );
    }

    dispose() {
        this.timeManager.offChange();
        this.seasonManager.offChange();
        this.scene.fog = null;
    }
}
