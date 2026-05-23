import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    Object3DComponent,
    type ComponentConfig,
    type UpdateParams,
    type TimeChangedData,
    type DateChangedData,
    type SeasonChangedData,
    type IObject3DComponent,
    SceneWrapper,
    SizeManager,
    resourcesManager,
    sizeManager,
    datetimeManager
} from "common-three";
import fireFliesVertexShader from '/@/shaders/Materials/fireflies/vertex.glsl';
import fireFliesFragmentShader from '/@/shaders/Materials/fireflies/fragment.glsl';
import * as MATH from '/@/utils/math';


export default class Fireflies extends Object3DComponent {

    private fireFlies: Three.Points | null = null;
    private fireFliesMaterial: Three.ShaderMaterial | null = null;
    private fireFliesGeometry: Three.BufferGeometry | null = null;

    private fireFliesCount: number = 50;
    private minRadius: number = 9;
    private maxRadius: number = 16;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-fireflies', options.isDebugMode);
    }

    /**
     * 初始化阶段 - 创建萤火虫粒子系统
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.debug('[FireFlies] Initializing...');

        // ✅ 创建组作为根节点
        const firefliesGroup = new Three.Group();
        firefliesGroup.name = 'FirefliesGroup';
        this.setRoot(firefliesGroup);

        // 创建萤火虫粒子
        await this.createFireFlies(firefliesGroup);

        // 根据时间设置可见性
        this.updateVisibility();

        this.logger.debug('[FireFlies] Initialization complete');
    }

    /**
     * 激活阶段
     */
    protected onActivate(): void {
        this.logger.debug('[FireFlies] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        const { elapsedTime } = params;

        if (!this.fireFlies || !this.fireFlies.visible) {
            return;
        }

        if (this.fireFliesMaterial) {
            this.fireFliesMaterial.uniforms.uTime.value = elapsedTime;
        }
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.debug('[FireFlies] Deactivated');
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

        this.updateVisibility();
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[FireFlies] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[FireFlies] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用（可选）
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[FireFlies] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
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
    private async createFireFlies(parent: Three.Group): Promise<void> {
        const particleTexture = resourcesManager.getItemById("particleTextureNoAlpha");

        this.fireFliesMaterial = new Three.ShaderMaterial({
            vertexShader: fireFliesVertexShader,
            fragmentShader: fireFliesFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uResolution: {
                    value: new Three.Vector2(sizeManager.getWidth(), sizeManager.getWidth()),
                },
                uTexture: {
                    value: particleTexture?.resource || null,
                },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
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

        // ✅ 添加到父节点
        parent.add(this.fireFlies);
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
            this.fireFlies = null;
        }

        // ✅ 获取根节点作为父对象
        const root = this.getRoot();
        if (root) {
            // 重新创建
            this.createFireFlies(root as Three.Group);
            this.updateVisibility();
        }
    }

    /**
     * 更新可见性
     */
    private updateVisibility(): void {
        if (this.fireFlies) {
            this.fireFlies.visible = datetimeManager.isNighttime();
        }
    }
}
