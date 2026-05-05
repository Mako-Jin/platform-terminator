import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    Object3DComponent,
    type ComponentConfig,
    type UpdateParams,
    type SeasonChangedData,
    type IObject3DComponent,
    SceneWrapper,
    SizeManager
} from "common-three";
import ResourcesManager from "/@/resources/manager.ts";
import {
    Emitter,
    EmitterParams,
    ParticleRenderer,
    ParticleRendererParams,
    PointShape,
    ParticleSystem
} from '/@/systems/particle';
import * as MATH from '/@/utils/math';
import particleExplosionVertexShader from '/@/shaders/Materials/fire/vertex.glsl';
import particleExplosionFragmentShader from '/@/shaders/Materials/fire/fragment.glsl';
import lightningArcVertexShader from '/@/shaders/Materials/lightning/vertex.glsl';
import lightningArcFragmentShader from '/@/shaders/Materials/lightning/fragment.glsl';
// ✅ 导入环境音效管理器
import AmbientSoundManager from "/@/manager/AmbientSoundManager";
// ✅ 导入闪电按钮 UI
import LightningButtonUI from "/@/ui/lightning";
import {cameraManager} from "common-three";

interface ColorStop {
    time: number;
    value: Three.Color;
}

interface FloatStop {
    time: number;
    value: number;
}

interface GroundBounds {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

interface ExplosionParticlesConfig {
    count: number;
    duration: number;
    maxLife: number;
    velocityMagnitude: number;
    velocityMagnitudeVariance: number;
    rotationAngularVariance: number;
    gravity: boolean;
    gravityStrength: number;
    dragCoefficient: number;
    positionRadiusVariance: number;
}


export default class Lightning extends Object3DComponent {

    private resourcesManager: ResourcesManager;
    private sizeManager: SizeManager;
    
    // ✅ 内部管理粒子系统
    private particleSystem: ParticleSystem | null = null;
    
    // ✅ 环境音效管理器
    private ambientSoundManager: AmbientSoundManager | null = null;
    
    // ✅ 闪电按钮 UI
    private lightningButtonUI: LightningButtonUI | null = null;

    private explosionMaterial: Three.ShaderMaterial | null = null;
    private activeLightningArcs: Three.Mesh[] = [];

    private baseGroundBounds: GroundBounds;
    private groundBounds: GroundBounds;

    private nextLightningTime: number = 0;
    private elapsedTime: number = 0;

    // 相机震动参数
    private cameraShakeDuration: number = 0.65;
    private cameraShakeIntensity: number = 0.85;
    private cameraShakeFrequency: number = 25;
    private cameraShakeDecay: number = 2.5;

    // 颜色配置
    private colorA: Three.Color;
    private colorB: Three.Color;
    private intensity: number = 3;
    private colorLightningA: Three.Color;
    private colorLightningB: Three.Color;

    // 爆炸粒子配置
    private explosionParticles: ExplosionParticlesConfig;

    // 插值器
    private sizeOverLife: MATH.FloatInterpolant | null = null;
    private alphaOverLife: MATH.FloatInterpolant | null = null;
    private colorOverLife: MATH.ColorInterpolant | null = null;
    private twinkleOverLife: MATH.FloatInterpolant | null = null;

    // 插值点
    private sizeStops: FloatStop[] = [];
    private alphaStops: FloatStop[] = [];
    private colorStops: ColorStop[] = [];
    private twinkleStops: FloatStop[] = [];

    // 闪电弧配置
    private arc: {
        duration: number;
        meshes: Three.Mesh[];
    };

    private currentSeason: string = 'spring';
    
    // ✅ 相机震动状态
    private isShaking: boolean = false;
    private shakeStart: number = 0;
    private originalCameraPosition: Three.Vector3 | null = null;
    private shakeDirection: Three.Vector3 = new Three.Vector3(0, 0, 1);

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'Lightning', options.isDebugMode);

        this.resourcesManager = ResourcesManager.getInstance();
        this.sizeManager = SizeManager.getInstance();

        // 初始化地面边界
        this.baseGroundBounds = {
            minX: -5.5,
            maxX: 5.5,
            minZ: -5.5,
            maxZ: 5.5,
        };
        this.groundBounds = { ...this.baseGroundBounds };

        // 初始化颜色
        this.colorA = new Three.Color(0xff8117);
        this.colorB = new Three.Color(0xffd500);
        this.colorLightningA = new Three.Color(0x0000ff);
        this.colorLightningB = new Three.Color(0x00ffff);

        // 初始化爆炸粒子配置
        this.explosionParticles = {
            count: 100,
            duration: 1,
            maxLife: 1.3,
            velocityMagnitude: 5.6,
            velocityMagnitudeVariance: 0.5,
            rotationAngularVariance: Math.PI * 2,
            gravity: true,
            gravityStrength: -1.5,
            dragCoefficient: -2.5,
            positionRadiusVariance: 0,
        };

        // 初始化闪电弧
        this.arc = {
            duration: 3,
            meshes: [],
        };

        // 创建默认插值点
        this._createParticleStops();

        // 更新边界以适应宽高比
        this.updateBoundsForAspectRatio();
    }

    /**
     * 初始化阶段
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Lightning] Initializing...');

        // ✅ 创建粒子系统
        this.particleSystem = new ParticleSystem();
        
        // ✅ 获取环境音效管理器实例
        try {
            this.ambientSoundManager = AmbientSoundManager.getInstance();
        } catch (error) {
            this.logger.warn('[Lightning] AmbientSoundManager not available');
        }

        // 创建材质
        await this.createExplosionMaterial();

        // 设置随机闪电时间
        this.nextLightningTime = this.getRandomDelay();

        this.logger.info('[Lightning] Initialization complete');
    }

    /**
     * 激活阶段
     */
    protected onActivate(): void {
        this.logger.info('[Lightning] Activating...');

        // 监听窗口 resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // ✅ 创建闪电按钮 UI
        this.lightningButtonUI = new LightningButtonUI(() => {
            this.manualStrike();
        });
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        const { delta } = params;

        this.elapsedTime += delta;

        const currentTime = performance.now() / 1000;

        // ✅ 更新粒子系统
        if (this.particleSystem) {
            this.particleSystem.update(delta, currentTime);
        }

        // 更新爆炸材质时间
        if (this.explosionMaterial) {
            this.explosionMaterial.uniforms.uTime.value = currentTime;
        }

        // 更新闪电弧时间
        for (const arc of this.activeLightningArcs) {
            const material = arc.material as Three.ShaderMaterial;
            if (material?.uniforms?.uTime) {
                material.uniforms.uTime.value = currentTime;
            }
        }

        // ✅ 更新相机震动
        if (this.isShaking) {
            this.updateCameraShake();
        }

        // 雨季时触发随机闪电
        if (this.currentSeason === 'rainy' && this.elapsedTime >= this.nextLightningTime) {
            this.strikeRandom();
            this.elapsedTime = 0;
            this.nextLightningTime = this.getRandomDelay();
        }
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Lightning] Deactivated');

        // 移除 resize 监听
        window.removeEventListener('resize', this.handleResize.bind(this));
        
        // ✅ 销毁闪电按钮 UI
        if (this.lightningButtonUI) {
            this.lightningButtonUI.destroy();
            this.lightningButtonUI = null;
        }
        
        // 停止相机震动
        this.stopCameraShake();
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Lightning] Disposing...');

        // ✅ 清理粒子系统
        if (this.particleSystem) {
            this.particleSystem.dispose();
            this.particleSystem = null;
        }

        // 清理材质
        if (this.explosionMaterial) {
            this.explosionMaterial.dispose();
            this.explosionMaterial = null;
        }

        // 清理所有闪电弧
        for (const arc of this.activeLightningArcs) {
            this.scene.getScene().remove(arc);
            arc.geometry.dispose();
            (arc.material as Three.Material).dispose();
        }
        this.activeLightningArcs = [];
        
        // ✅ 确保 UI 已销毁
        if (this.lightningButtonUI) {
            this.lightningButtonUI.destroy();
            this.lightningButtonUI = null;
        }
        
        // 停止相机震动
        this.stopCameraShake();
    }

    /**
     * ✅ 季节变化监听器
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Lightning] Season changed: ${data.previousSeason} -> ${data.currentSeason}`);
        this.currentSeason = data.currentSeason;
    }

    /**
     * ✅ 配置调试面板
     */
    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        // 添加基本信息
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();

        // 爆炸粒子参数
        const explosionFolder = gui.addFolder('Explosion Particles');

        const params = {
            count: this.explosionParticles.count,
            maxLife: this.explosionParticles.maxLife,
            velocityMagnitude: this.explosionParticles.velocityMagnitude,
            velocityMagnitudeVariance: this.explosionParticles.velocityMagnitudeVariance,
            rotationAngularVariance: this.explosionParticles.rotationAngularVariance,
            gravity: this.explosionParticles.gravity,
            gravityStrength: this.explosionParticles.gravityStrength,
            dragCoefficient: this.explosionParticles.dragCoefficient,
            positionRadiusVariance: this.explosionParticles.positionRadiusVariance,
        };

        explosionFolder.add(params, 'count', 1, 500, 1).name('Particle Count').onChange((value: number) => {
            this.explosionParticles.count = value;
        });

        explosionFolder.add(params, 'maxLife', 0.1, 10, 0.1).name('Max Life').onChange((value: number) => {
            this.explosionParticles.maxLife = value;
        });

        explosionFolder.add(params, 'velocityMagnitude', 0, 50, 0.5).name('Velocity Magnitude').onChange((value: number) => {
            this.explosionParticles.velocityMagnitude = value;
        });

        explosionFolder.add(params, 'velocityMagnitudeVariance', 0, 30, 0.5).name('Velocity Variance').onChange((value: number) => {
            this.explosionParticles.velocityMagnitudeVariance = value;
        });

        explosionFolder.add(params, 'rotationAngularVariance', 0, Math.PI * 2, 0.1).name('Rotation Variance').onChange((value: number) => {
            this.explosionParticles.rotationAngularVariance = value;
        });

        explosionFolder.add(params, 'gravity').name('Gravity Enabled').onChange((value: boolean) => {
            this.explosionParticles.gravity = value;
        });

        explosionFolder.add(params, 'gravityStrength', -5, 5, 0.1).name('Gravity Strength').onChange((value: number) => {
            this.explosionParticles.gravityStrength = value;
        });

        explosionFolder.add(params, 'dragCoefficient', -5, 0, 0.1).name('Drag Coefficient').onChange((value: number) => {
            this.explosionParticles.dragCoefficient = value;
        });

        explosionFolder.add(params, 'positionRadiusVariance', 0, 5, 0.1).name('Position Radius Variance').onChange((value: number) => {
            this.explosionParticles.positionRadiusVariance = value;
        });

        // 相机震动参数
        const shakeFolder = gui.addFolder('Camera Shake');

        const shakeParams = {
            duration: this.cameraShakeDuration,
            intensity: this.cameraShakeIntensity,
            frequency: this.cameraShakeFrequency,
            decay: this.cameraShakeDecay,
        };

        shakeFolder.add(shakeParams, 'duration', 0.1, 2, 0.05).name('Duration').onChange((value: number) => {
            this.cameraShakeDuration = value;
        });

        shakeFolder.add(shakeParams, 'intensity', 0, 2, 0.05).name('Intensity').onChange((value: number) => {
            this.cameraShakeIntensity = value;
        });

        shakeFolder.add(shakeParams, 'frequency', 5, 50, 1).name('Frequency (Hz)').onChange((value: number) => {
            this.cameraShakeFrequency = value;
        });

        shakeFolder.add(shakeParams, 'decay', 0.5, 5, 0.1).name('Decay Curve').onChange((value: number) => {
            this.cameraShakeDecay = value;
        });

        // 手动触发闪电
        gui.add({ strike: () => this.manualStrike() }, 'strike').name('⚡ Trigger Lightning');
    }

    /**
     * 处理窗口 resize
     */
    private handleResize(): void {
        this.updateBoundsForAspectRatio();
    }

    /**
     * 创建粒子插值点
     */
    private _createParticleStops(): void {
        this.sizeStops = [
            { time: 0.0, value: 0.1 },
            { time: 0.1, value: 0.68 },
            { time: 1.0, value: 0.0 },
        ];

        this.alphaStops = [
            { time: 0.0, value: 1.0 },
            { time: 0.5, value: 0.8 },
            { time: 1.0, value: 0.0 },
        ];

        this.colorStops = [
            { time: 0.0, value: this.colorA.clone() },
            {
                time: 0.5,
                value: new Three.Color().lerpColors(this.colorA, this.colorB, 0.5),
            },
            { time: 1.0, value: this.colorB.clone() },
        ];

        this.twinkleStops = [
            { time: 0.0, value: 0.8 },
            { time: 0.5, value: 0.5 },
            { time: 1.0, value: 0.2 },
        ];
    }

    /**
     * 构建插值器和纹理
     */
    private _buildInterpolantsAndTextures(): void {
        this.sizeOverLife = new MATH.FloatInterpolant(
            this.sizeStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.alphaOverLife = new MATH.FloatInterpolant(
            this.alphaStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.colorOverLife = new MATH.ColorInterpolant(
            this.colorStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.twinkleOverLife = new MATH.FloatInterpolant(
            this.twinkleStops.map((s) => ({ time: s.time, value: s.value }))
        );

        const sizeTex = this.sizeOverLife.toTexture();
        const colorTex = this.colorOverLife.toTexture(this.alphaOverLife);
        const twinkleTex = this.twinkleOverLife.toTexture();

        if (this.explosionMaterial) {
            this.explosionMaterial.uniforms.uSizeOverLife.value = sizeTex;
            this.explosionMaterial.uniforms.uColorOverLife.value = colorTex;
            this.explosionMaterial.uniforms.uTwinkleOverLife.value = twinkleTex;

            sizeTex.needsUpdate = true;
            colorTex.needsUpdate = true;
            twinkleTex.needsUpdate = true;
        }
    }

    /**
     * 创建爆炸材质
     */
    private async createExplosionMaterial(): Promise<void> {
        const particleTexture = this.resourcesManager.getItem("particleTexture");
        if (particleTexture) {
            particleTexture.flipY = false;
            particleTexture.needsUpdate = true;
        }

        this._buildInterpolantsAndTextures();

        this.explosionMaterial = new Three.ShaderMaterial({
            vertexShader: particleExplosionVertexShader,
            fragmentShader: particleExplosionFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uParticleTexture: { value: particleTexture?.resource || null },
                uSizeOverLife: { value: this.sizeOverLife!.toTexture() },
                uColorOverLife: {
                    value: this.colorOverLife!.toTexture(this.alphaOverLife!),
                },
                uTwinkleOverLife: { value: this.twinkleOverLife!.toTexture() },
                uSizeMultiplier: { value: 1.0 },
                uColorTint: { value: new Three.Vector3(1.0, 1.0, 1.0) },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: Three.AdditiveBlending,
        });

        this.explosionMaterial.uniforms.uSizeOverLife.value.needsUpdate = true;
        this.explosionMaterial.uniforms.uColorOverLife.value.needsUpdate = true;
        this.explosionMaterial.uniforms.uTwinkleOverLife.value.needsUpdate = true;
    }

    /**
     * 获取随机延迟时间
     */
    private getRandomDelay(): number {
        return 10 + Math.random() * 10;
    }

    /**
     * 创建闪电弧网格
     */
    private createArcMesh(position: Three.Vector3): Three.Mesh {
        const points: Three.Vector3[] = [];
        const pointsCount = 15;
        const height = 15;
        const interY = height / (pointsCount - 1);

        for (let i = 0; i < pointsCount; i++) {
            const point = new Three.Vector3(
                (Math.random() - 0.5),
                i * interY,
                (Math.random() - 0.5)
            );
            points.push(point);
        }

        const curve = new Three.CatmullRomCurve3(points);
        const geometry = new Three.TubeGeometry(curve, 18, 0.07, 8, false);

        const startTime = performance.now() / 1000;

        const material = new Three.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: Three.AdditiveBlending,
            side: Three.DoubleSide,
            uniforms: {
                uTime: { value: startTime },
                uStartTime: { value: startTime },
                uDuration: { value: this.arc.duration },
                uColorA: { value: this.colorLightningA },
                uColorB: { value: this.colorLightningB },
                uIntensity: { value: this.intensity },
            },
            vertexShader: lightningArcVertexShader,
            fragmentShader: lightningArcFragmentShader,
        });

        const mesh = new Three.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.frustumCulled = false;

        this.scene.getScene().add(mesh);
        this.activeLightningArcs.push(mesh);

        return mesh;
    }

    /**
     * 创建爆炸粒子
     */
    private createExplosionParticles(position: Three.Vector3): void {
        if (!this.particleSystem || !this.explosionMaterial) return;

        const params = new EmitterParams();
        params.maxLife = this.explosionParticles.maxLife;
        params.maxParticles = this.explosionParticles.count;
        params.maxEmission = this.explosionParticles.count;
        params.emissionRate = this.explosionParticles.count;
        params.velocityMagnitude = this.explosionParticles.velocityMagnitude;
        params.velocityMagnitudeVariance = this.explosionParticles.velocityMagnitudeVariance;
        params.rotationAngularVariance = this.explosionParticles.rotationAngularVariance;
        params.gravity = this.explosionParticles.gravity;
        params.gravityStrength = this.explosionParticles.gravityStrength;
        params.dragCoefficient = this.explosionParticles.dragCoefficient;

        const rendererParams = new ParticleRendererParams();
        rendererParams.maxParticles = this.explosionParticles.count;
        rendererParams.group = new Three.Group();

        params.renderer = new ParticleRenderer();
        params.renderer.initialize(this.explosionMaterial, rendererParams);

        const shape = new PointShape();
        shape.position.copy(position);
        shape.positionRadiusVariance = this.explosionParticles.positionRadiusVariance;
        params.shape = shape;

        const emitter = new Emitter(params);
        
        // ✅ 添加到内部粒子系统
        this.particleSystem.addEmitter(emitter);
        
        // 添加到场景
        this.scene.getScene().add(rendererParams.group);
    }

    /**
     * ✅ 触发相机震动
     */
    private triggerCameraShake(strikePosition: Three.Vector3 | null = null): void {
        // 从 CameraManager 获取当前激活的相机
        const camera = cameraManager.getThreeCamera();
        
        if (!camera) {
            this.logger.warn('[Lightning] No camera found for shake effect');
            return;
        }

        // 保存原始位置
        this.originalCameraPosition = camera.position.clone();
        this.shakeStart = performance.now();
        this.isShaking = true;

        // 计算震动方向
        if (strikePosition) {
            this.shakeDirection = new Three.Vector3()
                .subVectors(strikePosition, camera.position)
                .normalize();
        } else {
            this.shakeDirection.set(0, 0, 1);
        }
    }

    /**
     * ✅ 更新相机震动
     */
    private updateCameraShake(): void {
        const cameraManager = CameraManager.getInstance();
        const camera = cameraManager.getThreeCamera();

        if (!camera || !this.originalCameraPosition) return;

        const elapsed = (performance.now() - this.shakeStart) / 1000;
        const progress = Math.min(elapsed / this.cameraShakeDuration, 1);

        if (progress < 1) {
            // 缓入效果
            const easeIn = progress < 0.1 ? Math.pow(progress / 0.1, 2) : 1;
            // 衰减因子
            const decayFactor = Math.pow(1 - progress, this.cameraShakeDecay);
            // 当前强度
            const currentIntensity = this.cameraShakeIntensity * decayFactor * easeIn;

            // 噪声计算
            const time = elapsed * this.cameraShakeFrequency;
            const noise1 = Math.sin(time) * 0.6;
            const noise2 = Math.sin(time * 2.3) * 0.3;
            const noise3 = Math.sin(time * 4.7) * 0.1;
            const combinedNoise = noise1 + noise2 + noise3;

            // 随机偏移
            const randomX = (Math.random() - 0.5) * 2;
            const randomY = (Math.random() - 0.5) * 2;
            const randomZ = (Math.random() - 0.5) * 2;

            // 应用震动
            camera.position.x =
                this.originalCameraPosition.x +
                (randomX + this.shakeDirection.x * combinedNoise * 0.5) * currentIntensity;
            camera.position.y =
                this.originalCameraPosition.y +
                (randomY + this.shakeDirection.y * combinedNoise * 0.5) * currentIntensity;
            camera.position.z =
                this.originalCameraPosition.z +
                (randomZ + this.shakeDirection.z * combinedNoise * 0.5) * currentIntensity;
        } else {
            // 震动结束，恢复原位
            this.stopCameraShake();
            if (this.originalCameraPosition) {
                camera.position.copy(this.originalCameraPosition);
            }
        }
    }

    /**
     * ✅ 查找场景中的相机（已废弃，使用 CameraManager）
     * @deprecated 使用 CameraManager.getInstance().getThreeCamera() 代替
     */
    private findCamera(): Three.Camera | undefined {
        const cameraManager = CameraManager.getInstance();
        return cameraManager.getThreeCamera() || undefined;
    }

    /**
     * ✅ 停止相机震动
     */
    private stopCameraShake(): void {
        this.isShaking = false;
        this.originalCameraPosition = null;
    }

    /**
     * 触发闪电
     */
    private strike(position: Three.Vector3): void {
        const arcMesh = this.createArcMesh(position);
        this.createExplosionParticles(position);
        this.triggerCameraShake(position);

        // ✅ 播放雷声音效
        if (this.ambientSoundManager) {
            this.ambientSoundManager.playThunderStrike();
        }

        // 延迟清理闪电弧
        setTimeout(() => {
            this.scene.getScene().remove(arcMesh);
            arcMesh.geometry.dispose();
            (arcMesh.material as Three.Material).dispose();

            const index = this.activeLightningArcs.indexOf(arcMesh);
            if (index > -1) {
                this.activeLightningArcs.splice(index, 1);
            }
        }, this.arc.duration * 1000);
    }

    /**
     * 随机位置闪电
     */
    private strikeRandom(): void {
        const x =
            this.groundBounds.minX +
            Math.random() * (this.groundBounds.maxX - this.groundBounds.minX);
        const z =
            this.groundBounds.minZ +
            Math.random() * (this.groundBounds.maxZ - this.groundBounds.minZ);

        const position = new Three.Vector3(x, 0, z);
        this.strike(position);
    }

    /**
     * 手动触发电闪
     */
    public manualStrike(): void {
        this.strikeRandom();
    }

    /**
     * 设置地面边界
     */
    public setGroundBounds(bounds: GroundBounds): void {
        this.baseGroundBounds = { ...bounds };
        this.updateBoundsForAspectRatio();
    }

    /**
     * 根据宽高比更新边界
     */
    private updateBoundsForAspectRatio(): void {
        const width = this.sizeManager.getWidth();
        const height = this.sizeManager.getHeight();
        const aspectRatio = width / height;
        const idealRatio = 16 / 9;

        this.groundBounds = { ...this.baseGroundBounds };

        if (aspectRatio < idealRatio) {
            const shrinkFactor = aspectRatio / idealRatio;

            const centerX =
                (this.baseGroundBounds.minX + this.baseGroundBounds.maxX) / 2;
            const halfWidthX =
                (this.baseGroundBounds.maxX - this.baseGroundBounds.minX) / 2;

            this.groundBounds.minX = centerX - halfWidthX * shrinkFactor;
            this.groundBounds.maxX = centerX + halfWidthX * shrinkFactor;

            if (aspectRatio < 1) {
                const centerZ =
                    (this.baseGroundBounds.minZ + this.baseGroundBounds.maxZ) / 2;
                const halfWidthZ =
                    (this.baseGroundBounds.maxZ - this.baseGroundBounds.minZ) / 2;
                const zShrink = 0.7 + aspectRatio * 0.3;

                this.groundBounds.minZ = centerZ - halfWidthZ * zShrink;
                this.groundBounds.maxZ = centerZ + halfWidthZ * zShrink;
            }
        }
    }
}