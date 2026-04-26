import * as THREE from 'three';
import Weather from "/@/weather/weather.ts";
import EnvironmentTimeManager from "/@/utils/EnvironmentTimeManager.ts";
import SeasonManager from "/@/utils/SeasonManager.ts";

export default class Tent {
    constructor() {
        this.weather = Weather.getInstance();
        this.scene = this.weather.scene;
        this.resources = this.weather.resources;
        this.envManager = EnvironmentTimeManager.getInstance();
        this.seasonManager = SeasonManager.getInstance();
        this.currentSeason = this.seasonManager.currentSeason;

        this.lampMeshes = [];

        this.lampConfigs = {
            day: {
                transparent: true,
                opacity: 0.55,
                emissiveIntensity: 0.1,
                castShadow: true,
            },
            night: {
                transparent: false,
                opacity: 1.0,
                emissiveIntensity: 1.0,
                castShadow: false,
            },
        };

        this.init();
    }

    init() {
        this.addTent();

        this.applyLampConfig(this.envManager.envTime);

        this.envManager.onChange((newValue, oldValue) => {
            this.applyLampConfig(newValue);
        });

        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
    }

    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        const lampColor = this.seasonManager.getColorConfig('tent').lampColor;

        this.lampMeshes.forEach((mesh) => {
            mesh.material.emissive.copy(lampColor);
        });
    }

    addTent() {
        this.tentModel = this.resources.items.tentModel.scene;
        this.tentModel.scale.set(1.1, 1.1, 1.1);
        this.tentModel.position.set(2.5, 0.6, -9);
        this.tentModel.rotation.y = -Math.PI / 60;
        this.scene.add(this.tentModel);

        const { woodColorTexture, woodNormalTexture, woodAOTexture } =
            this.resources.items;
        woodColorTexture.colorSpace = THREE.SRGBColorSpace;

        this.tentModel.traverse((child) => {
            if (!child.isMesh) return;

            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material.name === 'wood') {
                Object.assign(child.material, {
                    map: woodColorTexture,
                    normalMap: woodNormalTexture,
                    aoMap: woodAOTexture,
                    aoMapIntensity: 0.55,
                    roughness: 1.0,
                    color: null,
                });
            }

            if (child.material.name === 'Lamp glass.001') {
                const lampColor = this.seasonManager.getColorConfig('tent').lampColor;
                child.material = new THREE.MeshStandardMaterial({
                    emissive: lampColor.clone(),
                });
                this.lampMeshes.push(child);
            }
        });
    }

    applyLampConfig(timeKey) {
        const config = this.lampConfigs[timeKey] || this.lampConfigs.day;

        this.lampMeshes.forEach((mesh) => {
            const mat = mesh.material;

            mesh.castShadow = config.castShadow;
            if (mat.transparent !== config.transparent) {
                mat.transparent = config.transparent;
                mat.needsUpdate = true;
            }

            mat.opacity = config.opacity;
            mat.emissiveIntensity = config.emissiveIntensity;
        });
    }
}
