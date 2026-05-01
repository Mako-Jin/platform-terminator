import * as Three from "three";
import Ground from "/@/components/ground";
import type Renderer from "/@/core/Renderer.ts";


export default class World {
    private scene: Three.Scene;
    private renderer: Renderer;
    private ground: Ground;

    constructor(scene: Three.Scene, renderer: Renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.ground = new Ground(this.scene, renderer);
    }

    public update(delta: number, elapsedTime: number) {
        this.ground.update();
    }
}
