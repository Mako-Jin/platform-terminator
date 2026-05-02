import * as Three from "three";
import Ground from "/@/components/ground";
import type Renderer from "/@/core/Renderer.ts";
import Lighting from "/@/components/lighting";
import Skydome from "/@components/skydome";


export default class World {
    private scene: Three.Scene;
    private renderer: Renderer;
    private ground: Ground;
    private lighting: Lighting;
    private skydome: Skydome;
    private isDebugMode: boolean;

    constructor(scene: Three.Scene, renderer: Renderer, isDebugMode: boolean = false) {
        this.scene = scene;
        this.renderer = renderer;
        this.isDebugMode = isDebugMode;
        this.lighting = new Lighting(this.scene, {
            isDebugMode: this.isDebugMode,
        });
        this.skydome = new Skydome(this.scene, this.isDebugMode);
        this.ground = new Ground(this.scene, renderer);
    }

    public update(delta: number, elapsedTime: number) {
        this.ground.update();
    }
}
