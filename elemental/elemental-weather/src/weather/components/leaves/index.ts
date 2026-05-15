import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    type ComponentConfig,
    type DateChangedData,
    type IObject3DComponent,
    Object3DComponent,
    SceneWrapper,
    type SeasonChangedData,
    type TimeChangedData,
    type UpdateParams,
    resourcesManager
} from "common-three";
import {datetimeManager} from "common-three";
import {SettingsManager, type EasingType, type ConfigObject} from "/@/settings";


class FallingLeavesSystem {
    private count: number;
    private scene: SceneWrapper;
    private bounds: any;
    private material: Three.MeshStandardMaterial;
    private settingsManager: SettingsManager;
    private mesh: Three.InstancedMesh;
    private dummy: Three.Object3D;
    private particles: Array<{
        pos: Three.Vector3;
        vel: Three.Vector3;
        rot: Three.Euler;
        rotSpeed: Three.Vector3;
        scale: number;
    }>;

    constructor(scene: SceneWrapper, geometry: Three.BufferGeometry, bounds: any) {
        this.count = 35;
        this.scene = scene;
        this.bounds = bounds;
        this.settingsManager = SettingsManager.getInstance();

        const leafColor = this.getFallingLeavesColor();

        this.material = new Three.MeshStandardMaterial({
            color: leafColor,
        });

        this.mesh = new Three.InstancedMesh(geometry, this.material, this.count);
        this.mesh.castShadow = true;
        this.scene.addObject(this.mesh);

        this.dummy = new Three.Object3D();
        this.particles = [];

        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                pos: new Three.Vector3(),
                vel: new Three.Vector3(),
                rot: new Three.Euler(),
                rotSpeed: new Three.Vector3(),
                scale: 1,
            });
            this.respawn(this.particles[i]);
            this.particles[i].pos.y =
                Math.random() * (bounds.yMax - bounds.yMin) + bounds.yMin;
        }

        datetimeManager.onSeasonChanged((data) => {
            this.onSeasonChanged(data.season, data.previousSeason);
        });
    }

    public getFallingLeavesColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('fallingLeaves', easing);
    }

    private getFallingLeavesColor(): Three.Color {
        return this.getFallingLeavesColorConfig().color;
    }

    onSeasonChanged(newSeason: string, oldSeason: string): void {
        const leafColor = this.getFallingLeavesColor();
        this.material.color.copy(leafColor);
    }

    respawn(p: {
        pos: Three.Vector3;
        vel: Three.Vector3;
        rot: Three.Euler;
        rotSpeed: Three.Vector3;
        scale: number;
    }): void {
        p.pos.x = this.bounds.originX + (Math.random() - 0.5) * this.bounds.xRange;
        p.pos.y = this.bounds.yMax - Math.random();
        p.pos.z = this.bounds.originZ + (Math.random() - 0.5) * this.bounds.zRange;

        p.vel.set(
            (Math.random() - 0.2) * 0.05,
            -(Math.random() * 0.01 + 0.02),
            (Math.random() - 0.7) * 0.05
        );

        p.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        p.rotSpeed.set(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );

        p.scale = 0.0;
    }

    update(dt: number): void {
        const cappedDt = Math.min(dt, 0.1);
        for (let i = 0; i < this.count; i++) {
            const p = this.particles[i];

            p.pos.add(p.vel);
            p.rot.x += p.rotSpeed.x;
            p.rot.y += p.rotSpeed.y;
            p.rot.z += p.rotSpeed.z;

            if (p.scale < 0.8) {
                p.scale = Three.MathUtils.lerp(
                    p.scale,
                    0.8,
                    Math.min(cappedDt * 2.0, 1.0)
                );
            }

            p.pos.z -= Math.sin(p.pos.y) * 0.001;

            this.dummy.position.copy(p.pos);
            this.dummy.rotation.copy(p.rot);
            const s = p.scale;
            this.dummy.scale.set(s, s, s);
            this.dummy.updateMatrix();

            this.mesh.setMatrixAt(i, this.dummy.matrix);

            if (p.pos.y < 0.0) {
                this.respawn(p);
            }
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    dispose(): void {
        this.scene.removeObject(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}


export default class FallingLeaves extends Object3DComponent {

    private fallingLeavesSystemOne: FallingLeavesSystem | null = null;
    private fallingLeavesSystemTwo: FallingLeavesSystem | null = null;
    private leafGroup: Three.Group | null = null;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-fallingleaves', options.isDebugMode);
    }

    /**
     * 初始化阶段 - 创建落叶系统
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[FallingLeaves] Initializing...');

        const leafModelData = resourcesManager.getItemById("leafModel");
        if (!leafModelData) {
            this.logger.error('[FallingLeaves] leafModel not found in ResourcesManager');
            return;
        }

        const leafGeometry = leafModelData.scene.children[0].geometry;

        // 创建组作为根节点
        this.leafGroup = new Three.Group();
        this.leafGroup.name = 'FallingLeavesGroup';
        this.setRoot(this.leafGroup);

        const treeOneBounds = {
            yMin: 1.0,
            yMax: 7.5,
            xRange: 6.0,
            zRange: -2.0,
            originX: -4.0,
            originZ: 10,
        };
        const treeTwoBounds = {
            yMin: 1.0,
            yMax: 7.5,
            xRange: 6.0,
            zRange: -1.0,
            originX: 4.0,
            originZ: -10,
        };

        this.fallingLeavesSystemOne = new FallingLeavesSystem(
            this.scene,
            leafGeometry.clone(),
            treeOneBounds
        );
        this.fallingLeavesSystemTwo = new FallingLeavesSystem(
            this.scene,
            leafGeometry.clone(),
            treeTwoBounds
        );

        this.logger.info('[FallingLeaves] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[FallingLeaves] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        if (this.fallingLeavesSystemOne) {
            this.fallingLeavesSystemOne.update(params.delta);
        }
        if (this.fallingLeavesSystemTwo) {
            this.fallingLeavesSystemTwo.update(params.delta);
        }
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[FallingLeaves] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[FallingLeaves] Disposing...');

        // 清理落叶系统
        if (this.fallingLeavesSystemOne) {
            this.fallingLeavesSystemOne.dispose();
            this.fallingLeavesSystemOne = null;
        }
        if (this.fallingLeavesSystemTwo) {
            this.fallingLeavesSystemTwo.dispose();
            this.fallingLeavesSystemTwo = null;
        }

        this.leafGroup = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用（可选）
     */
    public onTimeChanged(_data: TimeChangedData): void {
        // FallingLeaves 不需要响应时间变化
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[FallingLeaves] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[FallingLeaves] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用（可选）
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[FallingLeaves] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
    }

    /**
     * ✅ 配置调试面板（必须实现的抽象方法）
     */
    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        // 添加基本信息
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();
        gui.add({ visible: component.isVisible }, 'visible').name('Visible').disable();

        // 可以添加更多落叶相关的调试选项
        // 例如：粒子数量、风速等
    }
}
