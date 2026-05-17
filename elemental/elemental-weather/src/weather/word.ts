import {LoggerFactory} from "common-tools";
import {SceneWrapper} from "common-three";
import {
    Ground,
    Lighting, Skydome, Tent, Bridge, WindLines, Rocks, Bush,
    TreesTrunks, FallingLeaves,
    Camp, Fire, Fireflies, Rain, Snow, Lightning, Fog
} from "/@/weather/components";


export default class World {

    private logger = LoggerFactory.create("elemental-weather-world");

    private scene: SceneWrapper;
    private isDebugMode: boolean;

    private lighting!: Lighting;
    private skydome!: Skydome;
    private ground!: Ground;
    private tent!: Tent;
    private bridge!: Bridge;
    private windLines!: WindLines;
    private rocks!: Rocks;
    private bush!: Bush;
    private treeTrunks!: TreesTrunks;
    private fallingLeaves!: FallingLeaves;
    private camp!: Camp;
    private fire!: Fire;
    private fireflies!: Fireflies;
    private rain!: Rain;
    private snow!: Snow;
    private lightning!: Lightning;
    private fog!: Fog;

    constructor(scene: SceneWrapper, isDebugMode: boolean = false) {
        this.scene = scene;
        this.isDebugMode = isDebugMode;

        this.initializeComponents();
    }

    private initializeComponents(): void {
        this.logger.info('[World] Creating components...');

        this.lighting = new Lighting(this.scene, { isDebugMode: this.isDebugMode });
        this.skydome = new Skydome(this.scene, { isDebugMode: this.isDebugMode });
        
        this.ground = new Ground(this.scene, {
            isDebugMode: this.isDebugMode,
            config: { groundSize: 11, gridCols: 3, gridRows: 3 }
        });

        this.tent = new Tent(this.scene, { isDebugMode: this.isDebugMode });
        this.bridge = new Bridge(this.scene, { isDebugMode: this.isDebugMode });
        this.windLines = new WindLines(this.scene, { isDebugMode: this.isDebugMode });
        this.rocks = new Rocks(this.scene, { isDebugMode: this.isDebugMode });
        this.bush = new Bush(this.scene, { isDebugMode: this.isDebugMode });
        this.treeTrunks = new TreesTrunks(this.scene, { isDebugMode: this.isDebugMode });
        this.fallingLeaves = new FallingLeaves(this.scene, { isDebugMode: this.isDebugMode });
        this.camp = new Camp(this.scene, { isDebugMode: this.isDebugMode });
        this.fire = new Fire(this.scene, { isDebugMode: this.isDebugMode });
        this.fireflies = new Fireflies(this.scene, { isDebugMode: this.isDebugMode });

        this.rain = new Rain(this.scene, { isDebugMode: this.isDebugMode });
        this.snow = new Snow(this.scene, { isDebugMode: this.isDebugMode });
        this.lightning = new Lightning(this.scene, { isDebugMode: this.isDebugMode });
        this.fog = new Fog(this.scene, { isDebugMode: this.isDebugMode });
    }

    public async initialize(onProgress?: (progress: number) => void): Promise<void> {
        const startTime = performance.now();
        this.logger.info('[World] Initializing all components in parallel...');

        const components = [
            this.lighting, this.skydome,
            this.ground, this.tent, this.bridge,
            this.windLines, this.rocks, this.bush, this.treeTrunks,
            this.fallingLeaves, this.camp, this.fire, this.fireflies,
            this.rain, this.snow, this.lightning, this.fog
        ];

        const totalComponents = components.length;
        let completedComponents = 0;

        const componentPromises = components.map(async (comp, index) => {
            await comp.initialize();
            completedComponents++;
            
            if (onProgress) {
                const progress = (completedComponents / totalComponents) * 100;
                onProgress(progress);
            }
            
            this.logger.debug(`[World] Component ${index + 1}/${totalComponents} initialized`);
        });

        await Promise.all(componentPromises);

        const elapsed = performance.now() - startTime;
        this.logger.info(`[World] All components initialized in ${elapsed.toFixed(2)}ms`);
    }

    public activate(): void {
        this.logger.info('[World] Activating and adding components to scene...');

        const components = [
            this.lighting, this.skydome,
            this.ground, this.tent, this.bridge,
            this.windLines, this.rocks, this.bush, this.treeTrunks,
            this.fallingLeaves, this.camp, this.fire, this.fireflies,
            this.rain, this.snow, this.lightning, this.fog
        ];

        components.forEach(comp => {
            comp.activate();
            comp.addToScene();
        });
    }

    public update(delta: number, elapsedTime: number): void {
        const updateParams = { delta, elapsedTime };
        this.lighting.update(updateParams);
        this.skydome.update(updateParams);
        this.ground.update(updateParams);
        this.tent.update(updateParams);
        this.bridge.update(updateParams);
        this.windLines.update(updateParams);
        this.rocks.update(updateParams);
        this.bush.update(updateParams);
        this.treeTrunks.update(updateParams);
        this.fallingLeaves.update(updateParams);
        this.camp.update(updateParams);
        this.fire.update(updateParams);
        this.fireflies.update(updateParams);
        this.rain.update(updateParams);
        this.snow.update(updateParams);
        this.lightning.update(updateParams);
        this.fog.update(updateParams);
    }

    public dispose(): void {
        this.logger.info('[World] Disposing all components...');
        
        const components = [
            this.lighting, this.skydome,
            this.ground, this.tent, this.bridge,
            this.windLines, this.rocks, this.bush, this.treeTrunks,
            this.fallingLeaves, this.camp, this.fire, this.fireflies,
            this.rain, this.snow, this.lightning, this.fog
        ];

        components.forEach(comp => comp.dispose());
    }

}
