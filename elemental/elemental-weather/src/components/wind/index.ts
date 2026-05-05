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


class WindLine {
    private available: boolean;
    private material: Three.ShaderMaterial;
    public mesh: Three.Mesh;
    
    constructor() {
        this.available = true;
        
        const geometry = this.createGeometry();
        
        // 默认颜色，会在初始化时更新
        const windColor = new Three.Color(0.8, 0.9, 1.0);
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

    /**
     * 设置风线颜色
     */
    setColor(color: Three.Color): void {
        this.material.uniforms.uColor.value.copy(color);
    }

    /**
     * 创建几何体
     */
    createGeometry(length = 11, handlesCount = 4, amplitude = 1, divisions = 30): Three.BufferGeometry {
        const geometry = new Three.BufferGeometry();

        const halfExtent = length / 2;
        const handleSpan = length / (handlesCount - 1);
        const handles = [];

        for (let i = 0; i < handlesCount; i++) {
            handles.push(
                new Three.Vector3(
                    0,
                    ((i % 2) - 0.5) * amplitude,
                    -halfExtent + i * handleSpan
                )
            );
        }

        const curve = new Three.CatmullRomCurve3(handles);
        const points = curve.getPoints(divisions);

        const vertices = [];
        const indices = [];
        const ratios = [];

        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const ratio = i / (points.length - 1);

            vertices.push(point.x, point.y, point.z);
            vertices.push(point.x, point.y, point.z);

            ratios.push(ratio);
            ratios.push(ratio);

            if (i < points.length - 1) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2);
                indices.push(base + 1, base + 3, base + 2);
            }
        }

        geometry.setAttribute(
            'position',
            new Three.Float32BufferAttribute(vertices, 3)
        );
        geometry.setAttribute('ratio', new Three.Float32BufferAttribute(ratios, 1));
        geometry.setIndex(indices);

        return geometry;
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
        // 这里应该从 ColorManager 获取，暂时使用默认值
        return new Three.Color(0.8, 0.9, 1.0);
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
