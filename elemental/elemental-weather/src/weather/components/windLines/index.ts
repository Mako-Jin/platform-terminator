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

        const config = this.getWindLinesColorConfig();
        const windColor = config?.color ?? new Three.Color(0.8, 0.8, 0.8);

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

    public setColor(color: Three.Color): void {
        this.material.uniforms.uColor.value.copy(color);
    }

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

        for (let bandIdx = 0; bandIdx < offsets.length; bandIdx++) {
            const offsetX: number = offsets[bandIdx];
            const bandVertices: Three.Vector3[] = [];

            for (let i = 0; i < centerPoints.length; i++) {
                const point: Three.Vector3 = centerPoints[i];
                const tangent: Three.Vector3 = tangents[i];
                const ratio: number = i / (centerPoints.length - 1);

                const translatedPoint: Three.Vector3 = point.clone();
                translatedPoint.x += offsetX;

                const up: Three.Vector3 = new Three.Vector3(0, 1, 0);
                let normal: Three.Vector3 = new Three.Vector3().crossVectors(tangent, up).normalize();

                if (Math.abs(normal.length()) < 0.001) {
                    normal = new Three.Vector3(1, 0, 0);
                }

                const adjustedWidth: number = width;

                const left: Three.Vector3 = translatedPoint.clone().sub(normal.clone().multiplyScalar(adjustedWidth / 2));
                const right: Three.Vector3 = translatedPoint.clone().add(normal.clone().multiplyScalar(adjustedWidth / 2));

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

    calculateTangents(points: Three.Vector3[]): Three.Vector3[] {
        const tangents: Three.Vector3[] = [];

        for (let i = 0; i < points.length; i++) {
            if (i === 0) {
                tangents.push(new Three.Vector3().subVectors(points[1], points[0]).normalize());
            } else if (i === points.length - 1) {
                tangents.push(new Three.Vector3().subVectors(points[points.length - 1], points[points.length - 2]).normalize());
            } else {
                const tangent1: Three.Vector3 = new Three.Vector3().subVectors(points[i], points[i - 1]).normalize();
                const tangent2: Three.Vector3 = new Three.Vector3().subVectors(points[i + 1], points[i]).normalize();
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

    private windGroup: Three.Group | null = null;
    private pool: WindLine[] = [];

    private duration: number = 4;
    private translation: number = 2;
    private thickness: number = 0.1;
    private intervalRange: { min: number; max: number } = { min: 500, max: 2000 };
    private intervalId: number | null = null;

    private settingsManager: SettingsManager;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'weather-wind-lines', options.isDebugMode);

        this.settingsManager = SettingsManager.getInstance();
    }

    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[WindLines] Initializing...');

        this.windGroup = new Three.Group();
        this.windGroup.name = 'WindLinesGroup';
        this.setRoot(this.windGroup);

        this.pool = [
            new WindLine(),
            new WindLine(),
            new WindLine(),
        ];

        this.pool.forEach(windLine => {
            this.windGroup!.add(windLine.mesh);
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

        this.windGroup = null;
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

    private getWindColor(): Three.Color {
        const config = this.getWindLinesColorConfig();
        return config?.color ?? new Three.Color(0.8, 0.8, 0.8);
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
        return new Three.Vector3(0, 0, 0);
    }

    private getOptimalRadius(): number {
        return 15;
    }
}
