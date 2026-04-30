import * as Three from "three";
import Ground from "/@/components/ground";


export default class World {
    private scene: Three.Scene;
    private ground: Ground;

    constructor(scene: Three.Scene) {
        this.scene = scene;
        this.ground = new Ground(this.scene);
    }

    public update(delta: number, elapsedTime: number) {
        this.ground.update();
    }
}
