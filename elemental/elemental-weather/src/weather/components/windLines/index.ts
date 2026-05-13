import * as Three from 'three';
import type GUI from 'lil-gui';
import gsap from 'gsap';
import {
    Object3DComponent,
    type ComponentConfig,
    type UpdateParams,
    type DateChangedData,
    type TimeChangedData,
    type SeasonChangedData,
    type IObject3DComponent,
    SceneWrapper
} from "common-three";
import windLinesVertexShader from '/@/shaders/Materials/windLines/vertex.glsl';
import windLinesFragmentShader from '/@/shaders/Materials/windLines/fragment.glsl';
import {SettingsManager, type EasingType, type ConfigObject} from "/@/settings";


class WindLine {
    private available: boolean;
    private material: Three.ShaderMaterial;
    public mesh: Three.Mesh;

    private settingsManager: SettingsManager;

    constructor() {
        this.available = true;

        this.settingsManager = SettingsManager.getInstance();

        const geometry = this.createGeometry();

        const windColor = this.getWindLinesColorConfig().color;

        // 默认颜色，会在初始化时更新
        this.material = new Three.ShaderMaterial({
            transparent: true,
            side: Three.DoubleSide,
            depthWrite: false,
            uniforms: {
                uThickness: { value: 0.1 },
                uProgress: { value: 0.0 },
                uColor: { value: windColor.clone() },
                uTangent: { value: new Three.Vector3(0, 1, -1).normalize() },
            },
            vertexShader: windLinesVertexShader,
            fragmentShader: windLinesFragmentShader,
        });

        this.mesh = new Three.Mesh(geometry, this.material);
        this.mesh.renderOrder = 1;
        this.mesh.position.y = 3;
        this.mesh.visible = false;
    }

    public getWindLinesColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('windLines', easing);
    }

    /**
     * 设置风线颜色
     */
    setColor(color: Three.Color): void {
        this.material.uniforms.uColor.value.copy(color);
    }

    /**
     * 创建几何体
     */
    createGeometry(
        length: number = 11,
        handlesCount: number = 4,
        amplitude: number = 1,
        divisions: number = 30,
        width: number = 0.2,
        gap: number = 0.3,
        bandsCount?: number
    ): Three.BufferGeometry {
        const geometry = new Three.BufferGeometry();

        // 随机生成 1-3 条带
        const actualBandsCount: number = bandsCount ?? Math.floor(Math.random() * 3) + 1;

        const halfExtent: number = length / 2;
        const handleSpan: number = length / (handlesCount - 1);

        // 生成基础控制点（位于中心）
        const centerHandles: Three.Vector3[] = [];
        for (let i = 0; i < handlesCount; i++) {
            centerHandles.push(
                new Three.Vector3(
                    0,
                    ((i % 2) - 0.5) * amplitude,
                    -halfExtent + i * handleSpan
                )
            );
        }

        const centerCurve: Three.CatmullRomCurve3 = new Three.CatmullRomCurve3(centerHandles);
        const centerPoints: Three.Vector3[] = centerCurve.getPoints(divisions);

        // 根据条带数量计算偏移量
        const offsets: number[] = this.calculateOffsets(actualBandsCount, gap);

        const allVertices: number[] = [];
        const allIndices: number[] = [];
        const allRatios: number[] = [];

        // 计算中心曲线的切线
        const tangents: Three.Vector3[] = this.calculateTangents(centerPoints);

        // 为每条带生成顶点和索引
        for (let bandIdx = 0; bandIdx < offsets.length; bandIdx++) {
            const offsetX: number = offsets[bandIdx];
            const bandVertices: Three.Vector3[] = [];

            for (let i = 0; i < centerPoints.length; i++) {
                const point: Three.Vector3 = centerPoints[i];
                const tangent: Three.Vector3 = tangents[i];
                const ratio: number = i / (centerPoints.length - 1);

                // 平移当前点到对应 X 位置
                const translatedPoint: Three.Vector3 = point.clone();
                translatedPoint.x += offsetX;

                // 计算垂直于切线的法线（用于生成宽度）
                const up: Three.Vector3 = new Three.Vector3(0, 1, 0);
                let normal: Three.Vector3 = new Three.Vector3().crossVectors(tangent, up).normalize();

                // 如果向量长度接近 0，说明切线和 up 平行，使用默认法线
                if (Math.abs(normal.length()) < 0.001) {
                    normal = new Three.Vector3(1, 0, 0);
                }

                // 可以根据需要为不同条带添加随机颜色属性，这里保持宽度一致
                const adjustedWidth: number = width;

                // 生成左右两个顶点
                const left: Three.Vector3 = translatedPoint.clone().sub(normal.clone().multiplyScalar(adjustedWidth / 2));
                const right: Three.Vector3 = translatedPoint.clone().add(normal.clone().multiplyScalar(adjustedWidth / 2));

                bandVertices.push(left, right);
                allRatios.push(ratio, ratio);
            }

            // 将当前带的顶点添加到总顶点数组
            const startVertexIndex: number = allVertices.length / 3;
            for (const vertex of bandVertices) {
                allVertices.push(vertex.x, vertex.y, vertex.z);
            }

            // 为当前带生成三角形索引
            for (let i = 0; i < centerPoints.length - 1; i++) {
                const base: number = startVertexIndex + i * 2;
                allIndices.push(base, base + 2, base + 1);
                allIndices.push(base + 1, base + 2, base + 3);
            }
        }

        geometry.setAttribute(
            'position',
            new Three.BufferAttribute(new Float32Array(allVertices), 3)
        );
        geometry.setAttribute('ratio', new Three.BufferAttribute(new Float32Array(allRatios), 1));
        geometry.setIndex(allIndices);

        return geometry;
    }

    // 计算偏移量函数
    calculateOffsets(bandsCount: number, gap: number): number[] {
        if (bandsCount === 1) {
            return [0];
        } else if (bandsCount === 2) {
            return [-gap / 2, gap / 2];
        } else { // bandsCount === 3
            return [-gap, 0, gap];
        }
    }

    // 计算切线函数
    calculateTangents(points: Three.Vector3[]): Three.Vector3[] {
        const tangents: Three.Vector3[] = [];

        for (let i = 0; i < points.length; i++) {
            if (i === 0) {
                // 第一个点，用下一个点计算切线
                tangents.push(new Three.Vector3().subVectors(points[1], points[0]).normalize());
            } else if (i === points.length - 1) {
                // 最后一个点，用上一个点计算切线
                tangents.push(new Three.Vector3().subVectors(points[points.length - 1], points[points.length - 2]).normalize());
            } else {
                // 中间点，用前后点的平均方向
                const tangent1: Three.Vector3 = new Three.Vector3().subVectors(points[i], points[i - 1]).normalize();
                const tangent2: Three.Vector3 = new Three.Vector3().subVectors(points[i + 1], points[i]).normalize();
                tangents.push(tangent1.clone().add(tangent2).normalize());
            }
        }

        return tangents;
    }

    get thickness(): number {
        return this.material.uniforms.uThickness.value;
    }

    set thickness(value: number) {
        this.material.uniforms.uThickness.value = value;
    }

    get progress(): number {
        return this.material.uniforms.uProgress.value;
    }

    set progress(value: number) {
        this.material.uniforms.uProgress.value = value;
    }

    get getAvailable(): boolean {
        return this.available;
    }

    set setAvailable(value: boolean) {
        this.available = value;
    }

    get getMaterial(): Three.ShaderMaterial {
        return this.material;
    }

    set setMaterial(value: Three.ShaderMaterial) {
        this.material = value;
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}


export default class WindLines extends Object3DComponent {

    private pool: WindLine[] = [];
    private intervalRange: { min: number; max: number };
    private duration: number;
    private translation: number;
    private thickness: number;
    private intervalId: number | null = null;
    private windGroup: Three.Group | null = null;
    private settingsManager: SettingsManager;

    constructor(scene: SceneWrapper, options: {
        isDebugMode?: boolean;
        intervalMin?: number;
        intervalMax?: number;
        duration?: number;
        translation?: number;
        thickness?: number;
    } = {}) {
        super(scene, 'WindLines', options.isDebugMode);

        this.intervalRange = {
            min: options.intervalMin ?? 300,
            max: options.intervalMax ?? 2000,
        };
        this.duration = options.duration ?? 4;
        this.translation = options.translation ?? 1;
        this.thickness = options.thickness ?? 0.25;
        this.settingsManager = SettingsManager.getInstance();
    }

    /**
     * 初始化阶段 - 创建风线系统
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[WindLines] Initializing...');

        // 创建组作为根节点
        this.windGroup = new Three.Group();
        this.windGroup.name = 'WindLinesGroup';
        this.setRoot(this.windGroup);

        // 创建风线池
        this.pool = [
            new WindLine(),
            new WindLine(),
            new WindLine(),
        ];

        // 将风线添加到组中
        this.pool.forEach(windLine => {
            this.windGroup!.add(windLine.mesh);
        });

        // 设置初始颜色
        const windColor = this.getWindColor();
        this.pool.forEach(windLine => {
            windLine.setColor(windColor);
        });

        this.logger.info('[WindLines] Initialization complete');
    }

    public getWindLinesColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('windLines', easing);
    }

    /**
     * 激活阶段 - 启动风线动画
     */
    protected onActivate(): void {
        this.logger.info('[WindLines] Activating...');

        // 启动间隔显示
        this.startInterval();
    }

    /**
     * 更新阶段 - 每帧调用（目前不需要）
     */
    protected onUpdate(params: UpdateParams): void {
        // WindLines 使用 GSAP 动画，不需要每帧更新
    }

    /**
     * 失活阶段 - 停止动画
     */
    protected onDeactivate(): void {
        this.logger.info('[WindLines] Deactivated');

        // 停止间隔
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[WindLines] Disposing...');

        // 停止间隔
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }

        // 清理风线池
        this.pool.forEach(windLine => {
            windLine.dispose();
        });
        this.pool = [];

        this.windGroup = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用（可选）
     */
    public onTimeChanged(_data: TimeChangedData): void {
        // WindLines 不需要响应时间变化
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[WindLines] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[WindLines] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[WindLines] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);

        // 更新风线颜色
        const windColor = this.getWindColor();
        this.pool.forEach(windLine => {
            windLine.setColor(windColor);
        });
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

        // 风线参数调试 - 使用对象包装避免类型错误
        const params = {
            duration: this.duration,
            translation: this.translation,
            thickness: this.thickness,
            intervalMin: this.intervalRange.min,
            intervalMax: this.intervalRange.max,
        };

        gui.add(params, 'duration', 1, 10, 0.1).name('Duration');
        gui.add(params, 'translation', 0, 5, 0.1).name('Translation');
        gui.add(params, 'thickness', 0.01, 1, 0.01).name('Thickness');
        gui.add(params, 'intervalMin', 100, 1000, 10).name('Interval Min');
        gui.add(params, 'intervalMax', 1000, 5000, 100).name('Interval Max');
    }

    /**
     * 获取风线颜色
     */
    private getWindColor(): Three.Color {
        return this.getWindLinesColorConfig().color;
    }

    /**
     * 启动间隔显示
     */
    private startInterval(): void {
        const displayInterval = () => {
            this.display();

            const delay =
                this.intervalRange.min +
                Math.random() * (this.intervalRange.max - this.intervalRange.min);

            this.intervalId = setTimeout(() => displayInterval(), delay);
        };

        displayInterval();
    }

    /**
     * 显示风线
     */
    private display(): void {
        const windLine = this.pool.find((wl) => wl.getAvailable);

        if (!windLine) return;

        const angle = this.getWindAngle();

        windLine.mesh.visible = true;
        windLine.setAvailable = false;
        windLine.thickness = this.thickness;

        const focusPoint = this.getFocusPoint();
        const radius = this.getOptimalRadius();

        windLine.mesh.position.x = focusPoint.x + (Math.random() - 0.5) * radius;
        windLine.mesh.position.z = focusPoint.z + (Math.random() - 0.5) * radius;
        windLine.mesh.rotation.y = angle;

        gsap.to(windLine.mesh.position, {
            x: windLine.mesh.position.x + Math.sin(angle) * this.translation,
            z: windLine.mesh.position.z + Math.cos(angle) * this.translation,
            duration: this.duration,
        });

        gsap.fromTo(
            windLine.getMaterial.uniforms.uProgress,
            { value: 0 },
            {
                value: 1,
                duration: this.duration,
                onComplete: () => {
                    windLine.mesh.visible = false;
                    windLine.setAvailable = true;
                },
            }
        );
    }

    /**
     * 获取风向角度
     */
    private getWindAngle(): number {
        return Math.PI;
    }

    /**
     * 获取焦点位置
     */
    private getFocusPoint(): Three.Vector3 {
        return new Three.Vector3(0, 0, 0);
    }

    /**
     * 获取最优半径
     */
    private getOptimalRadius(): number {
        return 25;
    }
}
