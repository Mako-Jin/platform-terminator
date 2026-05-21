import * as Three from 'three';
import {LoggerFactory} from 'common-tools';
import {OrbitControls as ThreeOrbitControls} from 'three/addons/controls/OrbitControls.js';
import type {OrbitControlsConfig} from "./types.ts";

export abstract class BaseController {
    protected logger: ReturnType<typeof LoggerFactory.create>;
    protected camera: Three.Camera;
    protected container: HTMLElement;
    protected isEnabled: boolean = true;

    constructor(name: string, camera: Three.Camera, container: HTMLElement) {
        this.logger = LoggerFactory.create(`common-three-controls-${name}`);
        this.camera = camera;
        this.container = container;
    }

    abstract update(delta: number): void;

    abstract dispose(): void;

    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    getEnabled(): boolean {
        return this.isEnabled;
    }
}


export class OrbitControls extends BaseController {

    private controls: ThreeOrbitControls;

    constructor(
        camera: Three.Camera,
        container: HTMLElement,
        config: OrbitControlsConfig = {}
    ) {
        super('orbit', camera, container);

        this.controls = new ThreeOrbitControls(camera, container);

        // 应用配置
        this.controls.enableDamping = config.enableDamping ?? true;
        this.controls.enablePan = config.enablePan ?? false;
        this.controls.enableZoom = config.enableZoom ?? true;
        this.controls.maxPolarAngle = config.maxPolarAngle ?? Math.PI / 2;
        this.controls.minPolarAngle = config.minPolarAngle ?? 0;
        this.controls.maxDistance = config.maxDistance ?? Infinity;
        this.controls.minDistance = config.minDistance ?? 0;
        this.controls.dampingFactor = config.dampingFactor ?? 0.05;

        this.logger.info('OrbitControls created');
    }

    update(delta: number): void {
        if (!this.isEnabled) {
            return;
        }
        this.controls.update(delta);
    }

    dispose(): void {
        this.controls.dispose();
        this.logger.info('OrbitControls disposed');
    }


    getNativeControls(): ThreeOrbitControls {
        return this.controls;
    }
}
