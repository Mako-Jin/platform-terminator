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


// ✅ 定义风力线配置接口
interface WindLineConfig {
    length?: number;
    handlesCount?: number;
    amplitude?: number;
    divisions?: number;
    width?: number;
    gap?: number;
}


class WindLine {
    private available: boolean;
    private material: Three.ShaderMaterial;
    public mesh: Three.Mesh;
    private geometry: Three.BufferGeometry;

    // ✅ 预计算常量 - 避免重复创建对象
    private static readonly UP_VECTOR = new Three.Vector3(0, 1, 0);
    private static readonly DEFAULT_NORMAL = new Three.Vector3(1, 0, 0);
    private static readonly TEMP_VECTOR = new Three.Vector3();
    private static readonly TEMP_VECTOR2 = new Three.Vector3();
    private static readonly TEMP_COLOR = new Three.Color();

    constructor(config: WindLineConfig = {}) {
        this.available = true;

        const {
            length = 11,
            handlesCount = 4,
            amplitude = 1,
            divisions = 30,
            width = 0.2,
            gap = 0.3
        } = config;

        // ✅ 创建几何体
        this.geometry = this.createGeometry(length, handlesCount, amplitude, divisions, width, gap);

        // ✅ 获取颜色配置
        const windColor = this.getWindColor();

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

        this.mesh = new Three.Mesh(this.geometry, this.material);
        this.mesh.renderOrder = 1;
        this.mesh.position.y = 3;
        this.mesh.visible = false;
    }

    /**
     * ✅ 获取风力线颜色配置
     */
    private getWindColor(): Three.Color {
        try {
            const settingsManager = SettingsManager.getInstance();
            const config = settingsManager.getComponentConfig('windLines', 'smoothstep');
            return config?.color ?? new Three.Color(0.8, 0.8, 0.8);
        } catch (error) {
            // ✅ 容错处理：如果 SettingsManager 未初始化，使用默认颜色
            return new Three.Color(0.8, 0.8, 0.8);
        }
    }

    /**
     * ✅ 设置颜色 - 复用临时颜色对象
     */
    public setColor(color: Three.Color): void {
        WindLine.TEMP_COLOR.copy(color);
        this.material.uniforms.uColor.value.copy(WindLine.TEMP_COLOR);
    }

    /**
     * ✅ 创建几何体 - 性能优化版本
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

        const actualBandsCount: number = bandsCount ?? Math.floor(Math.random() * 3) + 1;

        const halfExtent: number = length / 2;
        const handleSpan: number = length / (handlesCount - 1);

        // ✅ 创建中心控制点
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

        const offsets: number[] = this.calculateOffsets(actualBandsCount, gap);

        const allVertices: number[] = [];
        const allIndices: number[] = [];
        const allRatios: number[] = [];

        const tangents: Three.Vector3[] = this.calculateTangents(centerPoints);

        // ✅ 预计算宽度的一半
        const halfWidth = width / 2;

        for (let bandIdx = 0; bandIdx < offsets.length; bandIdx++) {
            const offsetX: number = offsets[bandIdx];
            const bandVertices: Three.Vector3[] = [];

            for (let i = 0; i < centerPoints.length; i++) {
                const point: Three.Vector3 = centerPoints[i];
                const tangent: Three.Vector3 = tangents[i];
                const ratio: number = i / (centerPoints.length - 1);

                // ✅ 复用向量对象，减少内存分配
                const translatedPoint = WindLine.TEMP_VECTOR.set(point.x + offsetX, point.y, point.z);

                // ✅ 计算法线 - 复用向量对象
                const normal = WindLine.TEMP_VECTOR2.crossVectors(tangent, WindLine.UP_VECTOR).normalize();

                if (normal.lengthSq() < 0.000001) {
                    normal.copy(WindLine.DEFAULT_NORMAL);
                }

                // ✅ 计算左右顶点 - 避免多次 clone
                const left = new Three.Vector3(
                    translatedPoint.x - normal.x * halfWidth,
                    translatedPoint.y - normal.y * halfWidth,
                    translatedPoint.z - normal.z * halfWidth
                );
                const right = new Three.Vector3(
                    translatedPoint.x + normal.x * halfWidth,
                    translatedPoint.y + normal.y * halfWidth,
                    translatedPoint.z + normal.z * halfWidth
                );

                bandVertices.push(left, right);
                allRatios.push(ratio, ratio);
            }

            const startVertexIndex: number = allVertices.length / 3;
            for (const vertex of bandVertices) {
                allVertices.push(vertex.x, vertex.y, vertex.z);
            }

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

    calculateOffsets(bandsCount: number, gap: number): number[] {
        if (bandsCount === 1) {
            return [0];
        } else if (bandsCount === 2) {
            return [-gap / 2, gap / 2];
        } else {
            return [-gap, 0, gap];
        }
    }

    /**
     * ✅ 计算切线 - 优化向量创建
     */
    calculateTangents(points: Three.Vector3[]): Three.Vector3[] {
        const tangents: Three.Vector3[] = [];
        const tempVec = new Three.Vector3();

        for (let i = 0; i < points.length; i++) {
            if (i === 0) {
                tangents.push(tempVec.subVectors(points[1], points[0]).normalize().clone());
            } else if (i === points.length - 1) {
                tangents.push(tempVec.subVectors(points[points.length - 1], points[points.length - 2]).normalize().clone());
            } else {
                const tangent1 = tempVec.subVectors(points[i], points[i - 1]).normalize();
                const tangent2 = tempVec.subVectors(points[i + 1], points[i]).normalize();
                tangents.push(tangent1.clone().add(tangent2).normalize());
            }
        }

        return tangents;
    }

    get getAvailable(): boolean {
        return this.available;
    }

    set setAvailable(value: boolean) {
        this.available = value;
    }

    getMaterial(): Three.ShaderMaterial {
        return this.material;
    }

    dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
    }
}


export default class WindLines extends Object3DComponent {

    private pool: WindLine[] = [];

    private duration: number = 4;
    private translation: number = 2;
    private thickness: number = 0.1;
    private intervalRange: { min: number; max: number } = { min: 500, max: 2000 };
    private intervalId: number | null = null;

    // ✅ 预计算常量 - 避免每次调用都创建新对象
    private static readonly FOCUS_POINT = new Three.Vector3(0, 0, 0);
    private static readonly OPTIMAL_RADIUS = 15;
    private static readonly TEMP_POSITION = new Three.Vector3();

    private settingsManager: SettingsManager;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-wind-lines', options.isDebugMode);

        this.settingsManager = SettingsManager.getInstance();
    }

    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[WindLines] Initializing...');

        // ✅ 使用 createRootGroup() 创建根节点
        const root = this.createRootGroup();
        root.name = 'WindLinesGroup';

        this.pool = [
            new WindLine(),
            new WindLine(),
            new WindLine(),
        ];

        // ✅ 修复：使用 this.root 而不是 this.windGroup
        this.pool.forEach(windLine => {
            if (this.root) {
                this.root.add(windLine.mesh);
            }
        });

        const windColor = this.getWindColor();
        this.pool.forEach(windLine => {
            windLine.setColor(windColor);
        });

        this.logger.info('[WindLines] Initialization complete');
    }

    public getWindLinesColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.settingsManager.getComponentConfig('windLines', easing);
    }

    protected onActivate(): void {
        this.logger.info('[WindLines] Activating...');

        this.startInterval();
    }

    protected onUpdate(params: UpdateParams): void {
    }

    protected onDeactivate(): void {
        this.logger.info('[WindLines] Deactivated');

        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }
    }

    protected onDispose(): void {
        this.logger.info('[WindLines] Disposing...');

        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }

        this.pool.forEach(windLine => {
            windLine.dispose();
        });
        this.pool = [];
    }

    public onTimeChanged(_data: TimeChangedData): void {
    }

    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[WindLines] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[WindLines] Solar term: ${data.solarTerm}`);
        }
    }

    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[WindLines] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);

        const windColor = this.getWindColor();
        this.pool.forEach(windLine => {
            windLine.setColor(windColor);
        });
    }

    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();
        gui.add({ visible: component.isVisible }, 'visible').name('Visible').disable();

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
     * ✅ 获取风力颜色 - 添加容错处理
     */
    private getWindColor(): Three.Color {
        try {
            const config = this.getWindLinesColorConfig();
            return config?.color ?? new Three.Color(0.8, 0.8, 0.8);
        } catch (error) {
            return new Three.Color(0.8, 0.8, 0.8);
        }
    }

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
     * ✅ 显示风力线 - 性能优化版本
     */
    private display(): void {
        const windLine = this.pool.find((wl) => wl.getAvailable);

        if (!windLine) return;

        const angle = this.getWindAngle();

        windLine.mesh.visible = true;
        windLine.setAvailable = false;

        // ✅ 直接设置 uniform 值，避免不必要的属性访问
        windLine.getMaterial().uniforms.uThickness.value = this.thickness;

        // ✅ 复用静态向量对象
        const focusPoint = WindLines.FOCUS_POINT;
        const radius = WindLines.OPTIMAL_RADIUS;

        WindLines.TEMP_POSITION.set(
            focusPoint.x + (Math.random() - 0.5) * radius,
            3,
            focusPoint.z + (Math.random() - 0.5) * radius
        );

        windLine.mesh.position.copy(WindLines.TEMP_POSITION);
        windLine.mesh.rotation.y = angle;

        // ✅ 预计算 sin/cos 值
        const sinAngle = Math.sin(angle);
        const cosAngle = Math.cos(angle);
        const translationX = sinAngle * this.translation;
        const translationZ = cosAngle * this.translation;

        gsap.to(windLine.mesh.position, {
            x: windLine.mesh.position.x + translationX,
            z: windLine.mesh.position.z + translationZ,
            duration: this.duration,
        });

        gsap.fromTo(
            windLine.getMaterial().uniforms.uProgress,
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

    private getWindAngle(): number {
        return (Math.random() - 0.5) * Math.PI * 0.5;
    }

    private getFocusPoint(): Three.Vector3 {
        return WindLines.FOCUS_POINT;
    }

    private getOptimalRadius(): number {
        return WindLines.OPTIMAL_RADIUS;
    }
}

