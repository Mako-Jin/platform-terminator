import {LoggerFactory} from "common-tools";
import {RendererWrapper, SceneWrapper} from "common-three";
import {
    Ground,
    Lighting, Skydome, Tent, Bridge, WindLines, Rocks, Bush
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
        //     this.treeTrunks,
        //     this.fallingLeaves,
        //     this.rain,
        //     this.snow,
        //     this.fog,
        //     this.camp,
        //     this.fire,
        //     this.fireFlies,
        //     this.lightning,
        ];

        this.logger.info('[World] Starting parallel initialization of heavy components...');
        const parallelStart = performance.now();

        // ✅ 并行初始化所有重型组件
        await Promise.all(
            heavyComponents.map(component => this.scene.addComponent(component))
        );

        const parallelEnd = performance.now();
        const parallelDuration = ((parallelEnd - parallelStart) / 1000).toFixed(2);

        const endTime = performance.now();
        const totalDuration = ((endTime - startTime) / 1000).toFixed(2);

        this.logger.info(`[World] Parallel initialization took ${parallelDuration}s`);
        this.logger.info(`[World] Total initialization took ${totalDuration}s`);
    }

    /**
     * ✅ 更新方法已不需要手动调用
     * 所有组件的 onUpdate 会由 SceneWrapper 自动调用
     */
    public update(delta: number, elapsedTime: number): void {
        const updateParams = {delta, elapsedTime}
        this.lighting.update(updateParams);
        // this.skydome.update(updateParams);
        this.ground.update(updateParams);
        this.tent.update(updateParams);
        this.bridge.update(updateParams);
        this.windLines.update(updateParams);
        this.rocks.update(updateParams);
        this.bush.update(updateParams);
    }

    /**
     * ✅ 销毁方法已不需要手动调用
     * 所有组件的 dispose 会由 SceneWrapper 自动调用
     */
    public dispose(): void {
        // 空实现 - 生命周期由基类自动管理
    }


}
