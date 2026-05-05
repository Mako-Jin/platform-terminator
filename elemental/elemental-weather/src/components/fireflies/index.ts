import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    Object3DComponent,
    type ComponentConfig,
    type UpdateParams,
    type TimeChangedData,
    type IObject3DComponent,
    SceneWrapper,
    SizeManager
} from "common-three";
import ResourcesManager from "/@/resources/manager.ts";
import fireFliesVertexShader from '/@/shaders/Materials/fireflies/vertex.glsl';
import fireFliesFragmentShader from '/@/shaders/Materials/fireflies/fragment.glsl';
import * as MATH from '/@/utils/math';


export default class FireFlies extends Object3DComponent {

    private resourcesManager: ResourcesManager;
    private sizeManager: SizeManager;
    private fireFlies: Three.Points | null = null;
    private fireFliesMaterial: Three.ShaderMaterial | null = null;
    private fireFliesGeometry: Three.BufferGeometry | null = null;

    private envTime: string = 'day';
    private fireFliesCount: number = 50;
    private minRadius: number = 9;
    private maxRadius: number = 16;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'FireFlies', options.isDebugMode);

        this.resourcesManager = ResourcesManager.getInstance();
        this.sizeManager = SizeManager.getInstance();
    }

    /**
     * 初始化阶段 - 创建萤火虫粒子系统
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[FireFlies] Initializing...');

        // 创建萤火虫粒子
        await this.createFireFlies();

        // 根据时间设置可见性
        this.updateVisibility();

        this.logger.info('[FireFlies] Initialization complete');
    }

    /**
     * 激活阶段
     */
    protected onActivate(): void {
        this.logger.info('[FireFlies] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        const { elapsedTime } = params;

        if (!this.fireFlies || !this.fireFlies.visible) return;

        if (this.fireFliesMaterial) {
            this.fireFliesMaterial.uniforms.uTime.value = elapsedTime;
        }
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[FireFlies] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[FireFlies] Disposing...');

        // 清理几何体
        if (this.fireFliesGeometry) {
            this.fireFliesGeometry.dispose();
            this.fireFliesGeometry = null;
        }

        // 清理材质
        if (this.fireFliesMaterial) {
            this.fireFliesMaterial.dispose();
            this.fireFliesMaterial = null;
        }

        // 引用已在基类中清理
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用
     */
    public onTimeChanged(data: TimeChangedData): void {
        this.logger.debug(`[FireFlies] Time changed: ${data.currentTime}`);

        // 根据时间段更新环境时间
        const hour = this.getHourFromTime(data.currentTime);
        const newEnvTime = (hour >= 6 && hour < 18) ? 'day' : 'night';

        // 只在时间状态改变时更新可见性
        if (newEnvTime !== this.envTime) {
            this.envTime = newEnvTime;
            this.updateVisibility();
        }
    }

    /**
     * ✅ 配置调试面板（必须实现的抽象方法）
     */
    public configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        // 添加基本信息
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();
        gui.add({ visible: component.isVisible }, 'visible').name('Visible').disable();

        // 添加萤火虫参数
        const params = {
            count: this.fireFliesCount,
            minRadius: this.minRadius,
            maxRadius: this.maxRadius,
        };

        gui.add(params, 'count', 10, 200, 1).name('Count').onChange((value: number) => {
            this.fireFliesCount = value;
            this.recreateFireFlies();
        });

        gui.add(params, 'minRadius', 1, 20, 0.1).name('Min Radius').onChange((value: number) => {
            this.minRadius = value;
            this.recreateFireFlies();
        });

        gui.add(params, 'maxRadius', 1, 30, 0.1).name('Max Radius').onChange((value: number) => {
            this.maxRadius = value;
            this.recreateFireFlies();
        });
    }

    /**
     * 创建萤火虫粒子
     */
    public async createFireFlies(): Promise<void> {
        const particleTexture = this.resourcesManager.getItem("particleTextureNoAlpha");

        // ✅ 使用 SizeManager 获取屏幕尺寸
        const width = this.sizeManager.getWidth();
        const height = this.sizeManager.getHeight();

        this.fireFliesMaterial = new Three.ShaderMaterial({
            vertexShader: fireFliesVertexShader,
            fragmentShader: fireFliesFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uResolution: {
                    value: new Three.Vector2(width, height),
                },
                uTexture: {
                    value: particleTexture?.resource || null,
                },
                uPixelRatio: { value: this.sizeManager.getPixelRatio() },
                uSize: { value: 10.0 },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: Three.AdditiveBlending,
        });

        this.fireFliesGeometry = new Three.BufferGeometry();

        const positions = new Float32Array(this.fireFliesCount * 3);
        const scales = new Float32Array(this.fireFliesCount);

        for (let i = 0; i < this.fireFliesCount; i++) {
            const theta = MATH.random() * Math.PI * 2;

            const rInner2 = this.minRadius * this.minRadius;
            const rOuter2 = this.maxRadius * this.maxRadius;
            const r = Math.sqrt(MATH.random() * (rOuter2 - rInner2) + rInner2);

            const radialJitter = (MATH.random() - 0.5) * 0.6;
            const finalR = r + radialJitter;

            const x = finalR * Math.cos(theta);
            const z = finalR * Math.sin(theta);

            const y = 1.0 + (MATH.random() - 0.5) * 3.0;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            scales[i] = MATH.random() * 1.0 + 0.5;
        }

        this.fireFliesGeometry.setAttribute(
            'position',
            new Three.BufferAttribute(positions, 3)
        );

        this.fireFliesGeometry.setAttribute(
            'aScale',
            new Three.BufferAttribute(scales, 1)
        );

        this.fireFlies = new Three.Points(
            this.fireFliesGeometry,
            this.fireFliesMaterial
        );
        this.fireFlies.renderOrder = -1;

        // ✅ 设置为根节点
        this.setRoot(this.fireFlies);
    }

    /**
     * 重新创建萤火虫（参数改变时调用）
     */
    private recreateFireFlies(): void {
        // 清理旧的几何体和材质
        if (this.fireFliesGeometry) {
            this.fireFliesGeometry.dispose();
        }
        if (this.fireFliesMaterial) {
            this.fireFliesMaterial.dispose();
        }

        // 从场景中移除旧的 Points
        if (this.fireFlies) {
            this.fireFlies.removeFromParent();
        }

        // 重新创建
        this.createFireFlies();
        this.updateVisibility();
    }

    /**
     * 更新可见性
     */
    private updateVisibility(): void {
        const isNight = this.envTime === 'night';
        if (this.fireFlies) {
            this.fireFlies.visible = isNight;
        }
    }

    /**
     * 从时间字符串提取小时
     */
    private getHourFromTime(timeString: string): number {
        const parts = timeString.split(':');
        return parseInt(parts[0], 10);
    }
}
