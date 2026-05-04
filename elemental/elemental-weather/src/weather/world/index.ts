import Ground from "/@/components/ground";
import type {RendererWrapper, SceneWrapper} from "common-three";
import type {ResourceLoader} from "/@/resources";
import Lighting from "/@/components/lighting";
import Skydome from "/@/components/skydome";
import Bush from "/@/components/bush";
import TreesTrunks from "/@/components/tree/trunks";
import FallingLeaves from "/@/components/leaves/falling";
import Rain from "/@/components/rain";
import Snow from "/@/components/snow";
import Fog from "/@/components/fog";


export default class World {
    private scene: SceneWrapper;
    private renderer: RendererWrapper;
    private resources: ResourceLoader;
    private isDebugMode: boolean;
    
    private ground: Ground;
    private lighting: Lighting;
    private skydome: Skydome;
    private bush: Bush;
    private treeTrunks: TreesTrunks;
    private fallingLeaves: FallingLeaves;
    private rain: Rain;
    private snow: Snow;
    private fog: Fog;

    constructor(
        scene: SceneWrapper,
        renderer: RendererWrapper,
        resources: ResourceLoader,
        isDebugMode: boolean = false
    ) {
        this.scene = scene;
        this.renderer = renderer;
        this.resources = resources;
        this.isDebugMode = isDebugMode;

        // ✅ 创建组件（构造函数中只创建实例）
        this.lighting = new Lighting(this.scene, {
            isDebugMode: this.isDebugMode,
        });
        
        this.skydome = new Skydome(this.scene, {isDebugMode: this.isDebugMode});
        
        this.ground = new Ground(this.scene, {isDebugMode: this.isDebugMode});

        this.bush = new Bush(this.scene, {isDebugMode: this.isDebugMode});

        this.treeTrunks = new TreesTrunks(this.scene, {isDebugMode: this.isDebugMode});

        this.fallingLeaves = new FallingLeaves(this.scene, {isDebugMode: this.isDebugMode});

        this.rain = new Rain(this.scene, {isDebugMode: this.isDebugMode});

        this.snow = new Snow(this.scene, {isDebugMode: this.isDebugMode});

        this.fog = new Fog(this.scene, {isDebugMode: this.isDebugMode});

        // ✅ 批量设置阴影
        renderer.setShadowsForComponents(
            [this.ground, this.bush, this.treeTrunks],
            true,   // castShadow
            true    // receiveShadow
        );
    }

    /**
     * ✅ 异步初始化所有组件
     */
    public async initialize(): Promise<void> {
        // ✅ 异步添加组件到场景管理器（会自动初始化和激活）
        await this.scene.addComponent(this.lighting);
        await this.scene.addComponent(this.skydome);
        await this.scene.addComponent(this.ground);
        await this.scene.addComponent(this.bush);
        await this.scene.addComponent(this.treeTrunks);
        await this.scene.addComponent(this.fallingLeaves);
        await this.scene.addComponent(this.rain);
        await this.scene.addComponent(this.snow);
        await this.scene.addComponent(this.fog);
    }

    /**
     * ✅ 更新方法已不需要手动调用
     * 所有组件的 onUpdate 会由 SceneWrapper 自动调用
     */
    public update(delta: number, elapsedTime: number): void {
        // 空实现 - 生命周期由基类自动管理
    }

    /**
     * ✅ 尺寸变化已不需要手动调用
     * 所有组件的 onResize 会由 SceneWrapper 自动调用
     */
    public onResize(width: number, height: number): void {
        // 空实现 - 生命周期由基类自动管理
    }

    /**
     * ✅ 销毁方法已不需要手动调用
     * 所有组件的 dispose 会由 SceneWrapper 自动调用
     */
    public dispose(): void {
        // 空实现 - 生命周期由基类自动管理
    }
}
