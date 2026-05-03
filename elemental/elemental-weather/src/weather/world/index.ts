import * as Three from "three";
import Ground from "/@/components/ground";
import type Renderer from "/@/core/Renderer.ts";
import Lighting from "/@/components/lighting";
import Skydome from "/@components/skydome";
import Bush from "/@components/bush";
import TreesTrunks from "/@components/tree/trunks.ts";
import FallingLeaves from "/@components/leaves/falling.ts";
import Rain from "/@components/rain";
import Snow from "/@components/snow";
import Fog from "/@/components/fog";


export default class World {
    private scene: Three.Scene;
    private renderer: Renderer;
    private ground: Ground;
    private lighting: Lighting;
    private skydome: Skydome;
    private isDebugMode: boolean;
    private bush: Bush;
    private treeTrunks: TreesTrunks;
    private fallingLeaves: FallingLeaves;
    private rain: Rain;
    private snow: Snow;
    private fog: Fog;

    constructor(scene: Three.Scene, renderer: Renderer, isDebugMode: boolean = false) {
        this.scene = scene;
        this.renderer = renderer;
        this.isDebugMode = isDebugMode;
        this.lighting = new Lighting(this.scene, {
            isDebugMode: this.isDebugMode,
        });
        this.skydome = new Skydome(this.scene, this.isDebugMode);
        this.ground = new Ground(this.scene, renderer);
        this.bush = new Bush(this.scene, this.isDebugMode);
        this.treeTrunks = new TreesTrunks(this.scene, this.isDebugMode);
        this.fallingLeaves = new FallingLeaves(this.scene);
        // 雨
        this.rain = new Rain(this.scene);
        // 雪
        this.snow = new Snow(this.scene);

        this.fog = new Fog(this.scene, this.ground.getWordSize());
    }

    public update(delta: number, elapsedTime: number) {
        this.skydome.update(elapsedTime);
        this.ground.update();
        this.bush.update();
        this.fallingLeaves.update(delta);
        this.rain.update(delta, elapsedTime);
        this.snow.update(delta, elapsedTime);
    }
}
