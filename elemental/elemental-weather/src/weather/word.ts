import {LoggerFactory} from "common-tools";
import {Object3DComponent, SceneWrapper, type UpdateParams} from "common-three";
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

    private worldComponents: Array<{
        name: string;
        component: Object3DComponent;
        needsUpdate: boolean;
    }> = [];

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
    
    // ✅ 添加帧计数器(移到前面避免时序问题)
    private _frameCount: number = 0;

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

        this.worldComponents.length = 0;
        this.worldComponents.push(
            { name: 'lighting', component: this.lighting, needsUpdate: true },
            { name: 'skydome', component: this.skydome, needsUpdate: true },
            { name: 'ground', component: this.ground, needsUpdate: true },
            { name: 'tent', component: this.tent, needsUpdate: false },
            { name: 'bridge', component: this.bridge, needsUpdate: false },
            { name: 'windLines', component: this.windLines, needsUpdate: true },
            { name: 'rocks', component: this.rocks, needsUpdate: false },
            { name: 'bush', component: this.bush, needsUpdate: true },
            { name: 'treeTrunks', component: this.treeTrunks, needsUpdate: false },
            { name: 'fallingLeaves', component: this.fallingLeaves, needsUpdate: true },
            { name: 'camp', component: this.camp, needsUpdate: false },
            { name: 'fire', component: this.fire, needsUpdate: true },
            { name: 'fireflies', component: this.fireflies, needsUpdate: true },
            { name: 'rain', component: this.rain, needsUpdate: true },
            { name: 'snow', component: this.snow, needsUpdate: true },
            { name: 'lightning', component: this.lightning, needsUpdate: true },
            { name: 'fog', component: this.fog, needsUpdate: true }
        );
    }

    public async initialize(onProgress?: (progress: number) => void): Promise<void> {
        this.logger.info('[World] Initializing all components in parallel...');

        const totalComponents = this.worldComponents.length;
        let completedComponents = 0;

        const componentPromises = this.worldComponents.map(async (item, index) => {
            await item.component.initialize();
            completedComponents++;
            
            if (onProgress) {
                const progress = (completedComponents / totalComponents) * 100;
                onProgress(progress);
            }
            
            this.logger.debug(`[World] Component ${index + 1}/${totalComponents} initialized: ${item.name}`);
        });

        await Promise.all(componentPromises);
    }

    public activate(): void {
        this.logger.info('[World] Activating and adding components to scene...');

        this.worldComponents.forEach(item => {
            item.component.activate();
            item.component.addToScene();
        });
    }

    public async update(delta: number, elapsedTime: number): Promise<void> {
        const updateParams: UpdateParams = { delta: Math.min(delta, 0.05), elapsedTime };

        const componentPromises = this.worldComponents.map(async (item) => {
            if (item.needsUpdate) {
                await item.component.update(updateParams);
            }
        });

        await Promise.all(componentPromises);
    }

    public dispose(): void {
        this.logger.info('[World] Disposing all components...');

        this.worldComponents.forEach(item => {
            item.component.dispose();
        });
    }

}
