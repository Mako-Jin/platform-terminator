import Weather from "/@/weather/weather.ts";
import Lighting from "/@/component/Lighting.ts";
import Skydome from "/@/component/Skydome.ts";
import Ground from "/@/component/Ground.ts";
import Tent from "/@/component/Tent.ts";
import Bridge from "/@/component/Bridge.ts";
import WindLines from "/@/component/WindLine.ts";
import Rocks from "/@/component/Rocks.ts";
import Bush from "/@/component/Bush.ts";
import Trees from "/@/component/Trees.ts";
import FallingLeaves from "/@/component/FallingLeaves.ts";
import Camp from "/@/component/Camp.ts";
import Fire from "/@/component/Fire.ts";
import FireFlies from "/@/component/FireFlies.ts";
import {ParticleSystem} from "/@/utils/ParticleSystem.ts";
import Rain from "/@/component/Rain.ts";
import SnowFall from "/@/component/SnowFall.ts";
import Fog from "/@/component/Fog.ts";
import Lightning from "/@/utils/Lightning.ts";


export default class World {
    constructor() {
        this.weather = Weather.getInstance();
        this.scene = this.weather.scene;
        this.lighting = new Lighting({
            helperEnabled: false,
        });
        this.skydome = new Skydome();
        this.debugGUI = this.weather.debug;
        this.ground = new Ground();
        this.tent = new Tent();
        this.bridge = new Bridge();
        this.windLines = new WindLines();
        this.rocks = new Rocks();
        this.bush = new Bush();
        this.trees = new Trees();
        this.fallingLeaves = new FallingLeaves();
        this.camp = new Camp();
        this.fire = new Fire();
        this.fireFlies = new FireFlies();
        this.rain = new Rain();
        this.snowFall = new SnowFall();

        this.particleSystem = new ParticleSystem();

        const worldSize = this.ground.WORLD_SIZE;
        const halfSize = worldSize / 2 - 3;

        const groundBounds = {
            minX: -halfSize,
            maxX: halfSize,
            minZ: -halfSize,
            maxZ: halfSize,
        };

        this.lightning = new Lightning(this.particleSystem, groundBounds);

        this.fog = new Fog(worldSize);

        if (this.debugGUI) {
            this.setupDebugUI();
        }
    }

    setupDebugUI() {
        const lightningControls = {
            strikeNow: () => this.lightning.manualStrike(),
        };

        this.debugGUI.add(
            lightningControls,
            'strikeNow',
            { label: 'Strike Lightning' },
            'Lightning'
        );
    }

    update(delta, elapsedTime) {
        this.ground.update();
        this.bush.update();
        this.skydome.update(delta, elapsedTime);
        this.fire.update(delta, elapsedTime);
        this.fallingLeaves.update(delta);
        this.fireFlies.update(elapsedTime);
        this.rain.update(delta, elapsedTime);
        this.snowFall.update(delta, elapsedTime);

        this.particleSystem.update(delta, elapsedTime);
        this.lightning.update(delta);
    }
}
