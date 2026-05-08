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
    type UpdateParams
} from "common-three";
import SeasonConfigManager from "/@/resources/loader";
import {datetimeManager} from "common-three";


class RainSystem {
    private scene: SceneWrapper;
    private bounds: any;
    private seasonConfigManager: SeasonConfigManager;
    private count: number;
    private visible: boolean;
    private geometry!: Three.BufferGeometry;
    private material!: Three.LineBasicMaterial;
    private mesh!: Three.LineSegments;
    private particles!: Array<{
        pos: Three.Vector3;
        vel: Three.Vector3;
        life: number;
        maxLife: number;
        spawnDelay: number;
    }>;

    constructor(scene: SceneWrapper, bounds: any) {
        this.scene = scene;
        this.bounds = bounds;
        this.seasonConfigManager = SeasonConfigManager.getInstance();

        this.count = 800;
        this.visible = false;

        this.createRainGeometry();
        this.createRainMaterial();
        this.createRainMesh();
        this.initializeParticles();
    }

    createRainGeometry(): void {
        this.geometry = new Three.BufferGeometry();

        const positions = new Float32Array(this.count * 6);
        const colors = new Float32Array(this.count * 6);

        this.geometry.setAttribute(
            'position',
            new Three.BufferAttribute(positions, 3)
        );
        this.geometry.setAttribute('color', new Three.BufferAttribute(colors, 3));
    }

    createRainMaterial(): void {
        this.material = new Three.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: Three.AdditiveBlending,
        });
    }

    createRainMesh(): void {
        this.mesh = new Three.LineSegments(this.geometry, this.material);
        this.mesh.visible = this.visible;
        this.scene.addObject(this.mesh);
    }

    initializeParticles(): void {
        this.particles = [];

        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                pos: new Three.Vector3(),
                vel: new Three.Vector3(),
                life: 1.0,
                maxLife: 1.0,
                spawnDelay: Math.random() * 2.0,
            });
            this.respawnParticle(this.particles[i]);

            this.particles[i].pos.y =
                this.bounds.yMin +
                Math.random() * (this.bounds.yMax - this.bounds.yMin + 10);
        }

        this.updateGeometry();
    }

    respawnParticle(particle: {
        pos: Three.Vector3;
        vel: Three.Vector3;
        life: number;
        maxLife: number;
        spawnDelay: number;
    }): void {
        particle.pos.x =
            this.bounds.originX + (Math.random() - 0.5) * this.bounds.xRange;
        particle.pos.y = this.bounds.yMax + Math.random() * 5.0;
        particle.pos.z =
            this.bounds.originZ + (Math.random() - 0.5) * this.bounds.zRange;

        particle.vel.set(
            (Math.random() - 0.5) * 0.2,
            -6.0 - Math.random() * 6.0,
            (Math.random() - 0.5) * 0.2
        );

        particle.life = particle.maxLife;
        particle.spawnDelay = 0;
    }

    updateGeometry(): void {
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;

        for (let i = 0; i < this.count; i++) {
            const particle = this.particles[i];
            const i6 = i * 6;

            if (particle.spawnDelay > 0) {
                positions[i6] = positions[i6 + 3] = 0;
                positions[i6 + 1] = positions[i6 + 4] = -100;
                positions[i6 + 2] = positions[i6 + 5] = 0;

                colors[i6] = colors[i6 + 1] = colors[i6 + 2] = 0;
                colors[i6 + 3] = colors[i6 + 4] = colors[i6 + 5] = 0;
                continue;
            }

            const dropLength = Math.min(particle.vel.length() * 0.08, 0.4);
            const direction = particle.vel.clone().normalize();

            positions[i6] = particle.pos.x;
            positions[i6 + 1] = particle.pos.y;
            positions[i6 + 2] = particle.pos.z;

            positions[i6 + 3] = particle.pos.x - direction.x * dropLength;
            positions[i6 + 4] = particle.pos.y - direction.y * dropLength;
            positions[i6 + 5] = particle.pos.z - direction.z * dropLength;

            const rainColor = this.getRainColor();
            const baseAlpha = 0.8;
            const fadeAlpha = 0.3;

            colors[i6] = rainColor.r * baseAlpha;
            colors[i6 + 1] = rainColor.g * baseAlpha;
            colors[i6 + 2] = rainColor.b * baseAlpha;

            colors[i6 + 3] = rainColor.r * fadeAlpha;
            colors[i6 + 4] = rainColor.g * fadeAlpha;
            colors[i6 + 5] = rainColor.b * fadeAlpha;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }

    getRainColor(): Three.Color {
        const season = datetimeManager.getCurrentSeason();

        switch (season) {
            case 'rainy':
                return new Three.Color(0.7, 0.8, 0.9);
            case 'winter':
                return new Three.Color(0.9, 0.9, 1.0);
            case 'autumn':
                return new Three.Color(0.8, 0.8, 0.9);
            default:
                return new Three.Color(0.7, 0.8, 0.9);
        }
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }

    update(delta: number, elapsedTime: number): void {
        if (!this.visible) return;

        const cappedDt = Math.min(delta, 0.2);

        for (let i = 0; i < this.count; i++) {
            const particle = this.particles[i];

            if (particle.spawnDelay > 0) {
                particle.spawnDelay -= cappedDt;
                continue;
            }

            particle.pos.add(particle.vel.clone().multiplyScalar(cappedDt));

            const windStrength = 0.02;
            particle.pos.x +=
                Math.sin(elapsedTime * 1.5 + particle.pos.z * 0.05) *
                windStrength *
                cappedDt;
            particle.pos.z +=
                Math.cos(elapsedTime * 1.2 + particle.pos.x * 0.03) *
                windStrength *
                cappedDt;

            if (particle.pos.y < -2.0) {
                this.respawnParticle(particle);

                particle.spawnDelay = Math.random() * 0.1;
            }
        }

        this.updateGeometry();
    }

    dispose(): void {
        if (this.mesh) {
            this.scene.removeObject(this.mesh);
            this.geometry.dispose();
            this.material.dispose();
        }
    }
}


export default class Rain extends Object3DComponent {

    private seasonConfigManager: SeasonConfigManager;
    private rainSystem: RainSystem | null = null;
    private rainGroup: Three.Group | null = null;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'Rain', options.isDebugMode);

        this.seasonConfigManager = SeasonConfigManager.getInstance();
    }

    /**
     * 初始化阶段 - 创建雨系统
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Rain] Initializing...');

        // 创建组作为根节点
        this.rainGroup = new Three.Group();
        this.rainGroup.name = 'RainGroup';
        this.setRoot(this.rainGroup);

        const rainBounds = {
            yMin: 15.0,
            yMax: 20.0,
            xRange: 40.0,
            zRange: 40.0,
            originX: 0.0,
            originZ: 0.0,
        };

        this.rainSystem = new RainSystem(this.scene, rainBounds);

        // 更新可见性
        this.updateVisibility();

        this.logger.info('[Rain] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Rain] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        if (this.rainSystem) {
            this.rainSystem.update(params.delta, params.elapsedTime);
        }
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Rain] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Rain] Disposing...');

        // 清理雨系统
        if (this.rainSystem) {
            this.rainSystem.dispose();
            this.rainSystem = null;
        }

        this.rainGroup = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用（可选）
     */
    public onTimeChanged(_data: TimeChangedData): void {
        // Rain 不需要响应时间变化
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Rain] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Rain] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Rain] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
        this.updateVisibility();
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

        // 可以添加更多雨相关的调试选项
        // 例如：粒子数量、雨滴速度等
    }

    /**
     * 更新可见性
     */
    private updateVisibility(): void {
        if (!this.rainSystem) return;

        const isRainySeason = datetimeManager.getCurrentSeason() === 'rainy';
        this.rainSystem.setVisible(isRainySeason);
        // this.rainSystem.setVisible(true); // 测试用
    }
}
