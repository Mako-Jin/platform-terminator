import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    type ComponentConfig,
    type DateChangedData,
    datetimeManager,
    type IObject3DComponent,
    Object3DComponent,
    SceneWrapper,
    type SeasonChangedData,
    type TimeChangedData,
    type UpdateParams
} from "common-three";


class SnowSystem {
    private scene: SceneWrapper;
    private bounds: any;
    private count: number;
    private visible: boolean;
    private geometry!: Three.BufferGeometry;
    private material!: Three.PointsMaterial;
    private mesh!: Three.Points;
    private particles!: Array<{
        pos: Three.Vector3;
        vel: Three.Vector3;
        life: number;
        maxLife: number;
        size: number;
        rotationSpeed: number;
        spawnDelay: number;
    }>;

    constructor(scene: SceneWrapper, bounds: any) {
        this.scene = scene;
        this.bounds = bounds;

        this.count = 600;
        this.visible = false;

        this.createSnowGeometry();
        this.createSnowMaterial();
        this.createSnowMesh();
        this.initializeParticles();
    }

    createSnowGeometry(): void {
        this.geometry = new Three.BufferGeometry();

        const positions = new Float32Array(this.count * 3);
        const colors = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);

        this.geometry.setAttribute(
            'position',
            new Three.BufferAttribute(positions, 3)
        );
        this.geometry.setAttribute('color', new Three.BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new Three.BufferAttribute(sizes, 1));
    }

    createSnowMaterial(): void {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const context = canvas.getContext('2d')!;

        const gradient = context.createRadialGradient(2, 2, 0, 2, 2, 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, 4, 4);

        const texture = new Three.CanvasTexture(canvas);

        this.material = new Three.PointsMaterial({
            map: texture,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: Three.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false,
        });
    }

    createSnowMesh(): void {
        this.mesh = new Three.Points(this.geometry, this.material);
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
                size: 0.1 + Math.random() * 0.2,
                rotationSpeed: (Math.random() - 0.5) * 2.0,
                spawnDelay: Math.random() * 0.1,
            });
            this.respawnParticle(this.particles[i]);

            this.particles[i].pos.y =
                this.bounds.yMin +
                Math.random() * (this.bounds.yMax - this.bounds.yMin + 15);
        }

        this.updateGeometry();
    }

    respawnParticle(particle: {
        pos: Three.Vector3;
        vel: Three.Vector3;
        life: number;
        maxLife: number;
        size: number;
        rotationSpeed: number;
        spawnDelay: number;
    }): void {
        particle.pos.x =
            this.bounds.originX + (Math.random() - 0.5) * this.bounds.xRange;
        particle.pos.y = this.bounds.yMax + Math.random() * 8.0;
        particle.pos.z =
            this.bounds.originZ + (Math.random() - 0.5) * this.bounds.zRange;

        particle.vel.set(
            (Math.random() - 0.5) * 0.5,
            -0.8 - Math.random() * 1.2,
            (Math.random() - 0.5) * 0.5
        );

        particle.life = particle.maxLife;
        particle.spawnDelay = 0;
    }

    updateGeometry(): void {
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const sizes = this.geometry.attributes.size.array;

        for (let i = 0; i < this.count; i++) {
            const particle = this.particles[i];
            const i3 = i * 3;

            if (particle.spawnDelay > 0) {
                positions[i3] = 0;
                positions[i3 + 1] = -100;
                positions[i3 + 2] = 0;

                colors[i3] = colors[i3 + 1] = colors[i3 + 2] = 0;
                sizes[i] = 0;
                continue;
            }

            positions[i3] = particle.pos.x;
            positions[i3 + 1] = particle.pos.y;
            positions[i3 + 2] = particle.pos.z;

            const brightness = 0.9 + Math.random() * 0.1;
            colors[i3] = brightness;
            colors[i3 + 1] = brightness;
            colors[i3 + 2] = 1.0;

            sizes[i] = particle.size;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }

    update(delta: number, elapsedTime: number): void {
        if (!this.visible) {
            return;
        }

        const cappedDt = Math.min(delta, 0.2);

        for (let i = 0; i < this.count; i++) {
            const particle = this.particles[i];

            if (particle.spawnDelay > 0) {
                particle.spawnDelay -= cappedDt;
                continue;
            }

            particle.pos.add(particle.vel.clone().multiplyScalar(cappedDt));

            const swayStrength = 0.3;
            const timeOffset = particle.pos.z * 0.1 + particle.pos.x * 0.05;
            particle.pos.x +=
                Math.sin(elapsedTime * 0.8 + timeOffset) * swayStrength * cappedDt;
            particle.pos.z +=
                Math.cos(elapsedTime * 0.6 + timeOffset) * swayStrength * cappedDt;

            particle.pos.y +=
                Math.sin(elapsedTime * 2.0 + particle.pos.x * 0.1) * 0.05 * cappedDt;

            if (particle.pos.y < -2.0) {
                this.respawnParticle(particle);

                particle.spawnDelay = Math.random() * 0.2;
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


export default class Snow extends Object3DComponent {

    private snowSystem: SnowSystem | null = null;
    private snowGroup: Three.Group | null = null;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-snow', options.isDebugMode);
    }

    /**
     * 初始化阶段 - 创建雪系统
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Snow] Initializing...');

        // 创建组作为根节点
        this.snowGroup = new Three.Group();
        this.snowGroup.name = 'SnowGroup';
        this.setRoot(this.snowGroup);

        const snowBounds = {
            yMin: 15.0,
            yMax: 20.0,
            xRange: 40.0,
            zRange: 30.0,
            originX: 0.0,
            originZ: 0.0,
        };

        this.snowSystem = new SnowSystem(this.scene, snowBounds);

        // 更新可见性
        this.updateVisibility();

        this.logger.info('[Snow] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Snow] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        if (this.snowSystem) {
            this.snowSystem.update(params.delta, params.elapsedTime);
        }
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Snow] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Snow] Disposing...');

        // 清理雪系统
        if (this.snowSystem) {
            this.snowSystem.dispose();
            this.snowSystem = null;
        }

        this.snowGroup = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用（可选）
     */
    public onTimeChanged(_data: TimeChangedData): void {
        // Snow 不需要响应时间变化
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Snow] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Snow] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Snow] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
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

        // 可以添加更多雪相关的调试选项
        // 例如：粒子数量、雪花大小等
    }

    /**
     * 更新可见性
     */
    private updateVisibility(): void {
        if (!this.snowSystem) {
            return;
        }

        const isWinterSeason = datetimeManager.getCurrentSeason() === 'winter';
        this.snowSystem.setVisible(isWinterSeason);
    }
}


