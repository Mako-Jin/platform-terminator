import {LoggerFactory} from "common-tools";
import {Object3DComponent, SceneWrapper, type UpdateParams} from "common-three";
import type {QiankunConfig} from "/@/settings";
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
    private qiankunConfig: QiankunConfig;

    private worldComponents: Array<{
        name: string;
        component: Object3DComponent;
        needsUpdate: boolean;
    }> = [];

    // 天气相关组件
    private lighting!: Lighting;
    private skydome!: Skydome;
    private ground!: Ground;
    private windLines!: WindLines;
    private rain!: Rain;
    private snow!: Snow;
    private lightning!: Lightning;
    private fog!: Fog;
    
    // 场景装饰组件
    private tent?: Tent;
    private bridge?: Bridge;
    private rocks?: Rocks;
    private bush?: Bush;
    private treeTrunks?: TreesTrunks;
    private fallingLeaves?: FallingLeaves;
    private camp?: Camp;
    private fire?: Fire;
    private fireflies?: Fireflies;
    
    // ✅ 添加帧计数器(移到前面避免时序问题)
    private _frameCount: number = 0;

    constructor(scene: SceneWrapper, isDebugMode: boolean = false, qiankunConfig?: QiankunConfig) {
        this.scene = scene;
        this.isDebugMode = isDebugMode;
        this.qiankunConfig = qiankunConfig || {
            enabled: false,
            componentWhitelist: [
                'lighting', 'skydome', 'ground', 'windLines', 'rain', 'snow', 'lightning', 'fog',
                'tent', 'bridge', 'rocks', 'bush', 'treeTrunks', 'fallingLeaves', 'camp', 'fire', 'fireflies'
            ],
            assetWhitelist: [],
            showUI: true
        };
        
        this.logger.info(`[World] Running with qiankun mode: ${this.qiankunConfig.enabled}`);
        this.logger.info(`[World] Component whitelist: ${this.qiankunConfig.componentWhitelist.join(', ')}`);

        this.initializeComponents();
    }
    
    /**
     * 检查组件是否在白名单中
     */
    private isComponentEnabled(name: string): boolean {
        return this.qiankunConfig.componentWhitelist.includes(name);
    }

    private initializeComponents(): void {
        this.logger.info('[World] Creating components based on qiankun config...');

        // ✅ 根据配置白名单创建组件
        // 天气核心组件
        if (this.isComponentEnabled('lighting')) {
            this.lighting = new Lighting(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('skydome')) {
            this.skydome = new Skydome(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('ground')) {
            this.ground = new Ground(this.scene, {
                isDebugMode: this.isDebugMode,
                config: { groundSize: 11, gridCols: 3, gridRows: 3 }
            });
        }
        if (this.isComponentEnabled('windLines')) {
            this.windLines = new WindLines(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('rain')) {
            this.rain = new Rain(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('snow')) {
            this.snow = new Snow(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('lightning')) {
            this.lightning = new Lightning(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('fog')) {
            this.fog = new Fog(this.scene, { isDebugMode: this.isDebugMode });
        }

        // 场景装饰组件
        if (this.isComponentEnabled('tent')) {
            this.tent = new Tent(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('bridge')) {
            this.bridge = new Bridge(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('rocks')) {
            this.rocks = new Rocks(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('bush')) {
            this.bush = new Bush(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('treeTrunks')) {
            this.treeTrunks = new TreesTrunks(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('fallingLeaves')) {
            this.fallingLeaves = new FallingLeaves(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('camp')) {
            this.camp = new Camp(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('fire')) {
            this.fire = new Fire(this.scene, { isDebugMode: this.isDebugMode });
        }
        if (this.isComponentEnabled('fireflies')) {
            this.fireflies = new Fireflies(this.scene, { isDebugMode: this.isDebugMode });
        }

        this.worldComponents.length = 0;
        
        // 根据配置添加组件到列表
        const addComponent = (name: string, component: Object3DComponent | undefined, needsUpdate: boolean) => {
            if (component && this.isComponentEnabled(name)) {
                this.worldComponents.push({ name, component, needsUpdate });
            }
        };
        
        addComponent('lighting', this.lighting, true);
        addComponent('skydome', this.skydome, true);
        addComponent('ground', this.ground, true);
        addComponent('windLines', this.windLines, true);
        addComponent('rain', this.rain, true);
        addComponent('snow', this.snow, true);
        addComponent('lightning', this.lightning, true);
        addComponent('fog', this.fog, true);
        addComponent('tent', this.tent, false);
        addComponent('bridge', this.bridge, false);
        addComponent('rocks', this.rocks, false);
        addComponent('bush', this.bush, true);
        addComponent('treeTrunks', this.treeTrunks, false);
        addComponent('fallingLeaves', this.fallingLeaves, true);
        addComponent('camp', this.camp, false);
        addComponent('fire', this.fire, true);
        addComponent('fireflies', this.fireflies, true);
        
        this.logger.info(`[World] Created ${this.worldComponents.length} components based on config`);
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