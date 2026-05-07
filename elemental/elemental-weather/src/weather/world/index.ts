import type {RendererWrapper, SceneWrapper} from "common-three";
import {Ground} from "/@/components";
import {Lighting} from "/@/components";
import {Skydome} from "/@/components";
import {Bush} from "/@/components";
import {TreesTrunks} from "/@/components";
import {FallingLeaves} from "/@/components";
import {Rain} from "/@/components";
import {Snow} from "/@/components";
import {Fog} from "/@/components";
import {Tent} from "/@/components";
import {Bridge} from "/@/components";
import {WindLines} from "/@components";
import {Rocks} from "/@components";
import {Camp} from "/@components";
import {Fire} from "/@components";
import {Fireflies} from "/@components";
import {ParticleSystem} from "/@/systems/particle.ts";
import Lightning from "/@/systems/lightning.ts";


export default class World {
    private scene: SceneWrapper;
    private renderer: RendererWrapper;
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
    private tent: Tent;
    private bridge: Bridge;
    private windLines: WindLines;
    private rocks: Rocks;
    private camp: Camp;
    private fire: Fire;
    private fireFlies: FireFlies;
    private particleSystem: ParticleSystem;
    private lightning: Lightning;

    constructor(
        scene: SceneWrapper,
        renderer: RendererWrapper,
        isDebugMode: boolean = false
    ) {
        this.scene = scene;
        this.renderer = renderer;
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

        this.tent = new Tent(this.scene, {isDebugMode: this.isDebugMode});

        this.bridge = new Bridge(this.scene, {isDebugMode: this.isDebugMode});

        this.windLines = new WindLines(this.scene, {isDebugMode: this.isDebugMode});

        this.rocks = new Rocks(this.scene, {isDebugMode: this.isDebugMode});

        this.camp = new Camp(this.scene, {isDebugMode: this.isDebugMode});

        this.fire = new Fire(this.scene, {isDebugMode: this.isDebugMode});

        this.fireFlies = new Fireflies(this.scene, {isDebugMode: this.isDebugMode});

        this.particleSystem = new ParticleSystem();

        this.lightning = new Lightning(this.scene, {isDebugMode: this.isDebugMode});

        // ✅ 批量设置阴影
        this.renderer.setShadowsForComponents(
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
        await this.scene.addComponent(this.tent);
        await this.scene.addComponent(this.bridge);
        await this.scene.addComponent(this.windLines);
        await this.scene.addComponent(this.rocks);
        await this.scene.addComponent(this.camp);
        await this.scene.addComponent(this.fire);
        await this.scene.addComponent(this.fireFlies);
        await this.scene.addComponent(this.lightning);
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
