import {LoggerFactory} from "common-tools";
import {RendererWrapper, SceneWrapper} from "common-three";
import {
    Ground,
    Lighting, Skydome, Tent, Bridge, WindLines, Rocks, Bush,
    TreesTrunks, FallingLeaves,
    Camp, Fire, Fireflies, Rain, Snow, Lightning, Fog
} from "/@/weather/components";


export default class World {

    private logger = LoggerFactory.create("elemental-weather-world");

    private scene: SceneWrapper;
    private renderer: RendererWrapper;
    private isDebugMode: boolean;

    private lighting: Lighting;
    private skydome: Skydome;

    private ground: Ground;

    private tent: Tent;
    private bridge: Bridge;
    private windLines: WindLines;
    private rocks: Rocks;
    private bush: Bush;
    private treeTrunks: TreesTrunks;
    private fallingLeaves: FallingLeaves;
    private camp: Camp;
    private fire: Fire;
    private fireflies: Fireflies;

    private rain: Rain;
    private snow: Snow;

    private lightning: Lightning;

    private fog: Fog;

    constructor(
        scene: SceneWrapper,
        renderer: RendererWrapper,
        isDebugMode: boolean = false
    ) {

        this.scene = scene;
        this.renderer = renderer;
        this.isDebugMode = isDebugMode;

        this.lighting = new Lighting(this.scene, {
            isDebugMode: this.isDebugMode,
        });

        this.skydome = new Skydome(this.scene, {isDebugMode: this.isDebugMode});
        this.ground = new Ground(this.scene, {isDebugMode: this.isDebugMode});
        this.tent = new Tent(this.scene, {isDebugMode: this.isDebugMode});
        this.bridge = new Bridge(this.scene, {isDebugMode: this.isDebugMode});
        this.windLines = new WindLines(this.scene, {isDebugMode: this.isDebugMode});
        this.rocks = new Rocks(this.scene, {isDebugMode: this.isDebugMode});
        this.bush = new Bush(this.scene, {isDebugMode: this.isDebugMode});
        this.treeTrunks = new TreesTrunks(this.scene, {isDebugMode: this.isDebugMode});
        this.fallingLeaves = new FallingLeaves(this.scene, {isDebugMode: this.isDebugMode});
        this.camp = new Camp(this.scene, {isDebugMode: this.isDebugMode});
        this.fire = new Fire(this.scene, {isDebugMode: this.isDebugMode});
        this.fireflies = new Fireflies(this.scene, {isDebugMode: this.isDebugMode});
        this.rain = new Rain(this.scene, {isDebugMode: this.isDebugMode});
        this.snow = new Snow(this.scene, {isDebugMode: this.isDebugMode});
        this.lightning = new Lightning(this.scene, {isDebugMode: this.isDebugMode});
        this.fog = new Fog(this.scene, {isDebugMode: this.isDebugMode});
    }

    /**
     * ✅ 异步初始化所有组件 - 优化版（并行初始化重型组件）
     */
    public async initialize(): Promise<void> {
        const startTime = performance.now();

        // ✅ 第1组：轻量级组件，先初始化
        await this.scene.addComponent(this.lighting);
        await this.scene.addComponent(this.skydome);

        // ✅ 第2组：重型组件，并行初始化
        const heavyComponents = [
            this.ground,
            this.tent,
            this.bridge,
            this.windLines,
            this.rocks,
            this.bush,
            this.treeTrunks,
            this.fallingLeaves,
            this.camp,
            this.fire,
            this.fireflies,
            this.rain,
            this.snow,
            this.lightning,
            this.fog,
        ];

        this.logger.info('[World] Starting parallel initialization of heavy components...');

        // ✅ 并行初始化所有重型组件
        await Promise.all(
            heavyComponents.map(component => this.scene.addComponent(component))
        );
    }

    /**
     * ✅ 更新方法已不需要手动调用
     * 所有组件的 onUpdate 会由 SceneWrapper 自动调用
     */
    public update(delta: number, elapsedTime: number): void {
        const updateParams = {delta, elapsedTime}
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

    /**
     * ✅ 销毁方法已不需要手动调用
     * 所有组件的 dispose 会由 SceneWrapper 自动调用
     */
    public dispose(): void {
        // 空实现 - 生命周期由基类自动管理
        this.lighting.dispose();
        this.skydome.dispose();
        this.ground.dispose();
        this.tent.dispose();
        this.bridge.dispose();
        this.windLines.dispose();
        this.rocks.dispose();
        this.bush.dispose();
        this.treeTrunks.dispose();
        this.fallingLeaves.dispose();
        this.camp.dispose();
        this.fire.dispose();
        this.fireflies.dispose();
        this.rain.dispose();
        this.snow.dispose();
        this.fog.dispose();
    }


}
