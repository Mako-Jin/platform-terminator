import * as Three from 'three';
import type GUI from 'lil-gui';
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
import ResourcesManager from "/@/resources/manager.ts";
import particleVertexShader from '/@/shaders/Materials/fire/vertex.glsl';
import particleFragmentShader from '/@/shaders/Materials/fire/fragment.glsl';
import * as MATH from '/@/utils/math';
import * as PARTICLES from '/@/systems/particle';
import {LoggerFactory} from "common-tools";


interface ColorStop {
    time: number;
    value: Three.Color;
}

interface FloatStop {
    time: number;
    value: number;
}


export default class Fire extends Object3DComponent {

    private logger = LoggerFactory.create("weather-fire");

    private resourcesManager: ResourcesManager;
    private particleSystem: any = null;
    private fireMaterial: Three.ShaderMaterial | null = null;
    private smokeMaterial: Three.ShaderMaterial | null = null;
    private amberMaterial: Three.ShaderMaterial | null = null;

    private fireGroup: Three.Group | null = null;
    private smokeGroup: Three.Group | null = null;
    private amberGroup: Three.Group | null = null;
    private lightGroup: Three.Group | null = null;

    private envTime: string = 'day';
    private currentSeason: string = 'spring';

    // 闪烁参数
    private flickerTime: number = 0;
    private flickerSpeed: number = 10.0;
    private flickerAmount: number = 0.4;
    private noiseOffset1: number = 0;
    private noiseOffset2: number = 0;

    // 发射器参数
    private fireEmitterParams: any = null;
    private smokeEmitterParams: any = null;
    private amberEmitterParams: any = null;

    // 灯光
    private fireLight: Three.PointLight | null = null;
    private fireLight2: Three.PointLight | null = null;
    private firelight1OriginalIntensity: number = 4;
    private firelight2OriginalIntensity: number = 2;
    private fireLightPresent: boolean = false;

    // 插值器
    private fireSizeOverLife: any = null;
    private fireAlphaOverLife: any = null;
    private fireColorOverLife: any = null;
    private fireTwinkleOverLife: any = null;
    private smokeSizeOverLife: any = null;
    private smokeAlphaOverLife: any = null;
    private smokeColorOverLife: any = null;
    private smokeTwinkleOverLife: any = null;
    private amberSizeOverLife: any = null;
    private amberAlphaOverLife: any = null;
    private amberColorOverLife: any = null;
    private amberTwinkleOverLife: any = null;

    // 插值点
    private fireSizeStops: FloatStop[] = [];
    private fireAlphaStops: FloatStop[] = [];
    private fireColorStops: ColorStop[] = [];
    private fireTwinkleStops: FloatStop[] = [];
    private smokeSizeStops: FloatStop[] = [];
    private smokeAlphaStops: FloatStop[] = [];
    private smokeColorStops: ColorStop[] = [];
    private smokeTwinkleStops: FloatStop[] = [];
    private amberSizeStops: FloatStop[] = [];
    private amberAlphaStops: FloatStop[] = [];
    private amberColorStops: ColorStop[] = [];
    private amberTwinkleStops: FloatStop[] = [];

    // 原始配置
    private originalFireEmissionRate: number = 500;
    private originalAmberEmissionRate: number = 30;
    private originalSmokeEmissionRate: number = 50;
    private originalSmokePosition: { x: number; y: number; z: number } = { x: -5.4, y: 1.9, z: -6.9 };
    private rainySmokePosition: { x: number; y: number; z: number } = { x: -5.4, y: 0.6, z: -6.9 };
    private rainySmokeEmissionRate: number = 8;
    private originalSmokeColorStops: ColorStop[] = [];
    private rainySmokeColorStops: ColorStop[] = [];
    private smokeAlphaConfig: any = {};

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'Fire', options.isDebugMode);

        this.resourcesManager = ResourcesManager.getInstance();

        // 初始化随机偏移
        this.noiseOffset1 = MATH.random() * 100;
        this.noiseOffset2 = MATH.random() * 100;

        // 获取初始粒子设置
        const particleSettings = this.getInitialParticleSettings();
        this.originalFireEmissionRate = particleSettings.fireEmissionRate;
        this.originalAmberEmissionRate = particleSettings.amberEmissionRate;
        this.originalSmokeEmissionRate = particleSettings.smokeEmissionRate;

        // 创建默认插值点
        this._createDefaultStops();
    }

    /**
     * 初始化阶段 - 创建火焰粒子系统
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Fire] Initializing...');

        // 创建组作为根节点
        this.fireGroup = new Three.Group();
        this.fireGroup.name = 'FireGroup';
        this.setRoot(this.fireGroup);

        // 创建烟雾和火星组
        this.smokeGroup = new Three.Group();
        this.smokeGroup.name = 'SmokeGroup';
        this.amberGroup = new Three.Group();
        this.amberGroup.name = 'AmberGroup';
        this.lightGroup = new Three.Group();
        this.lightGroup.name = 'FireLightGroup';

        // 添加到根节点
        this.fireGroup.add(this.smokeGroup);
        this.fireGroup.add(this.amberGroup);
        this.fireGroup.add(this.lightGroup);

        // 创建材质
        await this.createParticleMaterials();

        // 创建粒子系统
        this.createParticleSystem();

        // 添加火焰灯光
        this.addFireLighting();

        // 更新季节效果
        this.updateFireEffectsForSeason();

        this.logger.info('[Fire] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Fire] Activating...');

        // 更新烟雾透明度
        this.updateSmokeAlpha();
    }

    /**
     * 更新阶段 - 每帧调用
     */
    protected onUpdate(params: UpdateParams): void {
        const { delta, elapsedTime } = params;

        // 更新粒子系统
        if (this.particleSystem) {
            this.particleSystem.update(delta, elapsedTime);
        }

        // 更新闪烁灯光
        this.updateFlickerLight(delta);

        // 更新材质时间
        if (this.fireMaterial) {
            this.fireMaterial.uniforms.uTime.value = elapsedTime;
        }
        if (this.smokeMaterial) {
            this.smokeMaterial.uniforms.uTime.value = elapsedTime;
        }
        if (this.amberMaterial) {
            this.amberMaterial.uniforms.uTime.value = elapsedTime;
        }
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Fire] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Fire] Disposing...');

        // 清理粒子系统
        if (this.particleSystem) {
            this.particleSystem.dispose();
            this.particleSystem = null;
        }

        // 清理材质
        if (this.fireMaterial) {
            this.fireMaterial.dispose();
            this.fireMaterial = null;
        }
        if (this.smokeMaterial) {
            this.smokeMaterial.dispose();
            this.smokeMaterial = null;
        }
        if (this.amberMaterial) {
            this.amberMaterial.dispose();
            this.amberMaterial = null;
        }

        // 清理灯光
        if (this.fireLight) {
            this.fireLight.dispose();
            this.fireLight = null;
        }
        if (this.fireLight2) {
            this.fireLight2.dispose();
            this.fireLight2 = null;
        }

        // 清理引用
        this.fireEmitterParams = null;
        this.smokeEmitterParams = null;
        this.amberEmitterParams = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用
     */
    public onTimeChanged(data: TimeChangedData): void {
        this.logger.debug(`[Fire] Time changed: ${data.currentTime}`);

        // 根据时间段更新环境时间
        const hour = this.getHourFromTime(data.currentTime);
        this.envTime = (hour >= 6 && hour < 18) ? 'day' : 'night';

        // 更新烟雾透明度
        this.updateSmokeAlpha();
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Fire] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Fire] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Fire] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);

        this.currentSeason = data.currentSeason;

        // 更新季节配置
        this.smokeAlphaConfig = this.getColorConfig();

        // 更新烟雾透明度
        this.updateSmokeAlpha();

        // 更新火焰效果
        this.updateFireEffectsForSeason();
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

        // 可以添加更多火焰相关的调试选项
        // 由于调试面板非常复杂，这里只保留基本信息
        // 完整的调试功能可以通过专门的调试模式启用
    }

    /**
     * 获取初始粒子设置
     */
    private getInitialParticleSettings(): { fireEmissionRate: number; smokeEmissionRate: number; amberEmissionRate: number } {
        const defaults = {
            fireEmissionRate: 500,
            smokeEmissionRate: 50,
            amberEmissionRate: 30,
        };

        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (!savedSettings) return defaults;

            const settings = JSON.parse(savedSettings);
            const quality = settings.graphicsQuality || 'medium';

            if (quality === 'custom') {
                const customParticles = settings.customParticles || 500;
                return {
                    fireEmissionRate: customParticles,
                    smokeEmissionRate: Math.round(customParticles * 0.1),
                    amberEmissionRate: Math.round(customParticles * 0.06),
                };
            }

            const presetSettings: any = {
                low: {
                    fireEmissionRate: 350,
                    smokeEmissionRate: 35,
                    amberEmissionRate: 20,
                },
                medium: {
                    fireEmissionRate: 500,
                    smokeEmissionRate: 50,
                    amberEmissionRate: 30,
                },
                high: {
                    fireEmissionRate: 650,
                    smokeEmissionRate: 65,
                    amberEmissionRate: 40,
                },
                ultra: {
                    fireEmissionRate: 800,
                    smokeEmissionRate: 80,
                    amberEmissionRate: 50,
                },
            };

            return presetSettings[quality] || defaults;
        } catch (error) {
            this.logger.warn('Failed to load particle settings from localStorage:', error);
            return defaults;
        }
    }

    /**
     * 创建默认插值点
     */
    private _createDefaultStops(): void {
        this.fireSizeStops = [
            { time: 0.0, value: 15 },
            { time: 0.5, value: 60 },
            { time: 1.0, value: 5 },
        ];
        this.fireAlphaStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.2, value: 1.0 },
            { time: 0.8, value: 0.8 },
            { time: 1.0, value: 0.0 },
        ];
        this.fireColorStops = [
            { time: 0.0, value: new Three.Color(0x946110) },
            { time: 0.3, value: new Three.Color(0x9f710f) },
            { time: 0.7, value: new Three.Color(0xfd4700) },
            { time: 1.0, value: new Three.Color(0xfc0000) },
        ];
        this.fireTwinkleStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.3, value: 0.8 },
            { time: 1.0, value: 1.0 },
        ];

        this.smokeSizeStops = [
            { time: 0.0, value: 15 },
            { time: 0.5, value: 60 },
            { time: 1.0, value: 20 },
        ];
        this.smokeAlphaStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.1, value: 0.5 },
            { time: 0.55, value: 0.04 },
            { time: 1.0, value: 0.01 },
        ];
        this.smokeColorStops = [
            { time: 0.0, value: new Three.Color(0xfff1cc) },
            { time: 0.3, value: new Three.Color(0xfffbf0) },
            { time: 1.0, value: new Three.Color(0xffffff) },
        ];
        this.smokeTwinkleStops = [
            { time: 0.0, value: 0.0 },
            { time: 1.0, value: 0.0 },
        ];

        this.amberSizeStops = [
            { time: 0.0, value: 0 },
            { time: 0.5, value: 0.75 },
            { time: 1.0, value: 0 },
        ];
        this.amberAlphaStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.1, value: 0.9 },
            { time: 0.7, value: 0.4 },
            { time: 1.0, value: 0.0 },
        ];
        this.amberColorStops = [
            { time: 0.0, value: new Three.Color(0xff0000) },
            { time: 0.4, value: new Three.Color(0xff2424) },
            { time: 0.8, value: new Three.Color(0xffd438) },
            { time: 1.0, value: new Three.Color(0xff961f) },
        ];
        this.amberTwinkleStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.5, value: 0.5 },
            { time: 1.0, value: 0.3 },
        ];

        this.originalSmokeColorStops = [
            { time: 0.0, value: new Three.Color(0xfff1cc) },
            { time: 0.3, value: new Three.Color(0xfffbf0) },
            { time: 1.0, value: new Three.Color(0xffffff) },
        ];
        this.rainySmokeColorStops = [
            { time: 0.0, value: new Three.Color(0x666666) },
            { time: 0.3, value: new Three.Color(0x888888) },
            { time: 1.0, value: new Three.Color(0xaaaaaa) },
        ];
    }

    /**
     * 创建粒子材质
     */
    private async createParticleMaterials(): Promise<void> {
        await this.createFireMaterial();
        await this.createSmokeMaterial();
        await this.createAmberMaterial();
    }

    /**
     * 构建火焰插值器和纹理
     */
    private _buildFireInterpolantsAndTextures(): void {
        this.fireSizeOverLife = new MATH.FloatInterpolant(
            this.fireSizeStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.fireAlphaOverLife = new MATH.FloatInterpolant(
            this.fireAlphaStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.fireColorOverLife = new MATH.ColorInterpolant(
            this.fireColorStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.fireTwinkleOverLife = new MATH.FloatInterpolant(
            this.fireTwinkleStops.map((s) => ({ time: s.time, value: s.value }))
        );

        const sizeTex = this.fireSizeOverLife.toTexture();
        const colorTex = this.fireColorOverLife.toTexture(this.fireAlphaOverLife);
        const twinkleTex = this.fireTwinkleOverLife.toTexture();

        if (this.fireMaterial) {
            this.fireMaterial.uniforms.uSizeOverLife.value = sizeTex;
            this.fireMaterial.uniforms.uColorOverLife.value = colorTex;
            this.fireMaterial.uniforms.uTwinkleOverLife.value = twinkleTex;

            sizeTex.needsUpdate = true;
            colorTex.needsUpdate = true;
            twinkleTex.needsUpdate = true;
        }
    }

    /**
     * 构建烟雾插值器和纹理
     */
    private _buildSmokeInterpolantsAndTextures(): void {
        this.smokeSizeOverLife = new MATH.FloatInterpolant(
            this.smokeSizeStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.smokeAlphaOverLife = new MATH.FloatInterpolant(
            this.smokeAlphaStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.smokeColorOverLife = new MATH.ColorInterpolant(
            this.smokeColorStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.smokeTwinkleOverLife = new MATH.FloatInterpolant(
            this.smokeTwinkleStops.map((s) => ({ time: s.time, value: s.value }))
        );

        const sizeTex = this.smokeSizeOverLife.toTexture();
        const colorTex = this.smokeColorOverLife.toTexture(this.smokeAlphaOverLife);
        const twinkleTex = this.smokeTwinkleOverLife.toTexture();

        if (this.smokeMaterial) {
            this.smokeMaterial.uniforms.uSizeOverLife.value = sizeTex;
            this.smokeMaterial.uniforms.uColorOverLife.value = colorTex;
            this.smokeMaterial.uniforms.uTwinkleOverLife.value = twinkleTex;
            sizeTex.needsUpdate = true;
            colorTex.needsUpdate = true;
            twinkleTex.needsUpdate = true;
        }
    }

    /**
     * 构建火星插值器和纹理
     */
    private _buildAmberInterpolantsAndTextures(): void {
        this.amberSizeOverLife = new MATH.FloatInterpolant(
            this.amberSizeStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.amberAlphaOverLife = new MATH.FloatInterpolant(
            this.amberAlphaStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.amberColorOverLife = new MATH.ColorInterpolant(
            this.amberColorStops.map((s) => ({ time: s.time, value: s.value }))
        );
        this.amberTwinkleOverLife = new MATH.FloatInterpolant(
            this.amberTwinkleStops.map((s) => ({ time: s.time, value: s.value }))
        );

        const sizeTex = this.amberSizeOverLife.toTexture();
        const colorTex = this.amberColorOverLife.toTexture(this.amberAlphaOverLife);
        const twinkleTex = this.amberTwinkleOverLife.toTexture();

        if (this.amberMaterial) {
            this.amberMaterial.uniforms.uSizeOverLife.value = sizeTex;
            this.amberMaterial.uniforms.uColorOverLife.value = colorTex;
            this.amberMaterial.uniforms.uTwinkleOverLife.value = twinkleTex;
            sizeTex.needsUpdate = true;
            colorTex.needsUpdate = true;
            twinkleTex.needsUpdate = true;
        }
    }

    /**
     * 创建火焰材质
     */
    private async createFireMaterial(): Promise<void> {
        const fireTexture = this.resourcesManager.getItem("fireTexture");
        if (fireTexture) {
            fireTexture.flipY = false;
            fireTexture.needsUpdate = true;
        }

        this._buildFireInterpolantsAndTextures();

        this.fireMaterial = new Three.ShaderMaterial({
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uParticleTexture: { value: fireTexture?.resource || null },
                uSizeOverLife: { value: this.fireSizeOverLife.toTexture() },
                uColorOverLife: {
                    value: this.fireColorOverLife.toTexture(this.fireAlphaOverLife),
                },
                uTwinkleOverLife: { value: this.fireTwinkleOverLife.toTexture() },
                uSizeMultiplier: { value: 1.0 },
                uColorTint: { value: new Three.Vector3(1.0, 1.0, 1.0) },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: Three.AdditiveBlending,
        });

        this.fireMaterial.uniforms.uSizeOverLife.value.needsUpdate = true;
        this.fireMaterial.uniforms.uColorOverLife.value.needsUpdate = true;
        this.fireMaterial.uniforms.uTwinkleOverLife.value.needsUpdate = true;
    }

    /**
     * 创建烟雾材质
     */
    private async createSmokeMaterial(): Promise<void> {
        const smokeTexture = this.resourcesManager.getItem("smokeTexture");
        if (smokeTexture) {
            smokeTexture.flipY = false;
            smokeTexture.needsUpdate = true;
        }

        this._buildSmokeInterpolantsAndTextures();

        this.smokeMaterial = new Three.ShaderMaterial({
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uParticleTexture: { value: smokeTexture?.resource || null },
                uSizeOverLife: { value: this.smokeSizeOverLife.toTexture() },
                uColorOverLife: {
                    value: this.smokeColorOverLife.toTexture(this.smokeAlphaOverLife),
                },
                uTwinkleOverLife: { value: this.smokeTwinkleOverLife.toTexture() },
                uSizeMultiplier: { value: 1.0 },
                uColorTint: { value: new Three.Vector3(1.0, 1.0, 1.0) },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: Three.NormalBlending,
        });

        this.smokeMaterial.uniforms.uSizeOverLife.value.needsUpdate = true;
        this.smokeMaterial.uniforms.uColorOverLife.value.needsUpdate = true;
        this.smokeMaterial.uniforms.uTwinkleOverLife.value.needsUpdate = true;
    }

    /**
     * 创建火星材质
     */
    private async createAmberMaterial(): Promise<void> {
        const amberTexture = this.resourcesManager.getItem("particleTexture");
        if (amberTexture) {
            amberTexture.flipY = false;
            amberTexture.needsUpdate = true;
        }

        this._buildAmberInterpolantsAndTextures();

        this.amberMaterial = new Three.ShaderMaterial({
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uParticleTexture: { value: amberTexture?.resource || null },
                uSizeOverLife: { value: this.amberSizeOverLife.toTexture() },
                uColorOverLife: {
                    value: this.amberColorOverLife.toTexture(this.amberAlphaOverLife),
                },
                uTwinkleOverLife: { value: this.amberTwinkleOverLife.toTexture() },
                uSizeMultiplier: { value: 1.0 },
                uColorTint: { value: new Three.Vector3(1.0, 1.0, 1.0) },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: Three.AdditiveBlending,
        });

        this.amberMaterial.uniforms.uSizeOverLife.value.needsUpdate = true;
        this.amberMaterial.uniforms.uColorOverLife.value.needsUpdate = true;
        this.amberMaterial.uniforms.uTwinkleOverLife.value.needsUpdate = true;
    }

    /**
     * 创建粒子系统
     */
    private createParticleSystem(): void {
        this.particleSystem = new PARTICLES.ParticleSystem();

        this.createFireEmitter();
        this.createSmokeEmitter();
        this.createAmberEmitter();
    }

    /**
     * 创建火焰发射器
     */
    private createFireEmitter(): void {
        const fireEmitterParams = new PARTICLES.EmitterParams();
        fireEmitterParams.shape = new PARTICLES.PointShape();
        const fireShape = fireEmitterParams.shape as PARTICLES.PointShape;
        fireShape.position.set(-5.4, 1.0, -6.9);
        fireShape.positionRadiusVariance = 0.3;
        fireEmitterParams.emissionRate = this.originalFireEmissionRate;
        fireEmitterParams.maxParticles = 500;
        fireEmitterParams.maxEmission = Infinity;
        fireEmitterParams.maxLife = 1;
        fireEmitterParams.gravity = false;
        fireEmitterParams.dragCoefficient = 0.5;
        fireEmitterParams.velocityMagnitude = 0.5;
        fireEmitterParams.velocityMagnitudeVariance = 0;
        fireEmitterParams.rotation = new Three.Quaternion();
        fireEmitterParams.rotation.setFromAxisAngle(
            new Three.Vector3(1, 0, 0),
            -Math.PI / 32
        );
        fireEmitterParams.rotationAngularVariance = Math.PI / 16;

        const fireRendererParams = new PARTICLES.ParticleRendererParams();
        fireRendererParams.maxParticles = fireEmitterParams.maxParticles;
        fireRendererParams.group = new Three.Group();

        fireEmitterParams.renderer = new PARTICLES.ParticleRenderer();
        fireEmitterParams.renderer.initialize(
            this.fireMaterial!,
            fireRendererParams
        );

        const fireEmitter = new PARTICLES.Emitter(fireEmitterParams);

        this.fireEmitterParams = fireEmitterParams;

        this.particleSystem.addEmitter(fireEmitter);
        this.fireGroup!.add(fireRendererParams.group);
    }

    /**
     * 创建烟雾发射器
     */
    private createSmokeEmitter(): void {
        const smokeEmitterParams = new PARTICLES.EmitterParams();
        smokeEmitterParams.shape = new PARTICLES.PointShape();
        const smokeShape = smokeEmitterParams.shape as PARTICLES.PointShape;
        smokeShape.position.set(
            this.originalSmokePosition.x,
            this.originalSmokePosition.y,
            this.originalSmokePosition.z
        );
        smokeShape.positionRadiusVariance = 0.4;
        smokeEmitterParams.emissionRate = this.originalSmokeEmissionRate;
        smokeEmitterParams.maxParticles = 150;
        smokeEmitterParams.maxEmission = Infinity;
        smokeEmitterParams.maxLife = 3;
        smokeEmitterParams.gravity = false;
        smokeEmitterParams.gravityStrength = -0.3;
        smokeEmitterParams.dragCoefficient = 0.0;
        smokeEmitterParams.velocityMagnitude = 0.8;
        smokeEmitterParams.velocityMagnitudeVariance = 1.0;
        smokeEmitterParams.rotation = new Three.Quaternion();
        smokeEmitterParams.rotation.setFromAxisAngle(
            new Three.Vector3(1, 0, 0),
            -Math.PI / 8
        );
        smokeEmitterParams.rotationAngularVariance = Math.PI / 8;
        smokeEmitterParams.swirlX = 0.02;
        smokeEmitterParams.swirlZ = 0.01;

        smokeEmitterParams.onUpdate = (particle: any) => {
            const swirl = Math.sin(particle.life * 2 + particle.id * Math.PI) * 0.5;
            particle.velocity.x += swirl * (smokeEmitterParams.swirlX ?? 0.02);
            particle.velocity.z +=
                Math.cos(particle.life * 2 + particle.id * Math.PI) *
                (smokeEmitterParams.swirlZ ?? 0.01);
        };

        const smokeRendererParams = new PARTICLES.ParticleRendererParams();
        smokeRendererParams.maxParticles = smokeEmitterParams.maxParticles;
        smokeRendererParams.group = new Three.Group();

        smokeEmitterParams.renderer = new PARTICLES.ParticleRenderer();
        smokeEmitterParams.renderer.initialize(
            this.smokeMaterial!,
            smokeRendererParams
        );

        const smokeEmitter = new PARTICLES.Emitter(smokeEmitterParams);

        this.smokeEmitterParams = smokeEmitterParams;

        this.particleSystem.addEmitter(smokeEmitter);
        this.smokeGroup!.add(smokeRendererParams.group);
    }

    /**
     * 创建火星发射器
     */
    private createAmberEmitter(): void {
        const amberEmitterParams = new PARTICLES.EmitterParams();
        amberEmitterParams.shape = new PARTICLES.PointShape();
        const amberShape = amberEmitterParams.shape as PARTICLES.PointShape;
        amberShape.position.set(-5.4, 1.0, -6.9);
        amberShape.positionRadiusVariance = 0.35;
        amberEmitterParams.emissionRate = this.originalAmberEmissionRate;
        amberEmitterParams.maxParticles = 120;
        amberEmitterParams.maxEmission = Infinity;
        amberEmitterParams.maxLife = 3;
        amberEmitterParams.gravity = true;
        amberEmitterParams.gravityStrength = -0.2;
        amberEmitterParams.dragCoefficient = 2.8;
        amberEmitterParams.velocityMagnitude = 0.12;
        amberEmitterParams.velocityMagnitudeVariance = 0.6;
        amberEmitterParams.rotation = new Three.Quaternion();
        amberEmitterParams.rotation.setFromAxisAngle(
            new Three.Vector3(1, 0, 0),
            -Math.PI / 12
        );
        amberEmitterParams.rotationAngularVariance = Math.PI / 6;

        amberEmitterParams.onUpdate = (particle: any) => {
            const drift = Math.sin(particle.life * 3 + particle.id * 0.5) * 0.3;
            particle.velocity.x += drift * 0.01;
            particle.velocity.z +=
                Math.cos(particle.life * 3 + particle.id * 0.5) * 0.005;
        };

        const amberRendererParams = new PARTICLES.ParticleRendererParams();
        amberRendererParams.maxParticles = amberEmitterParams.maxParticles;
        amberRendererParams.group = new Three.Group();

        amberEmitterParams.renderer = new PARTICLES.ParticleRenderer();
        amberEmitterParams.renderer.initialize(
            this.amberMaterial!,
            amberRendererParams
        );

        const amberEmitter = new PARTICLES.Emitter(amberEmitterParams);

        this.amberEmitterParams = amberEmitterParams;

        this.particleSystem.addEmitter(amberEmitter);
        this.amberGroup!.add(amberRendererParams.group);
    }

    /**
     * 添加火焰灯光
     */
    private addFireLighting(): void {
        this.fireLightPresent = true;

        this.fireLight = new Three.PointLight(
            new Three.Color(0.97, 0.42, 0.106),
            this.firelight1OriginalIntensity,
            4,
            2
        );
        this.fireLight.position.set(-5.5, 1.0, -7.0);
        this.lightGroup!.add(this.fireLight);

        this.fireLight2 = new Three.PointLight(
            new Three.Color(0.97, 0.5, 0.18),
            this.firelight2OriginalIntensity,
            1.0,
            2.0
        );
        this.fireLight2.position.set(-5.5, 0.5, -7.0);
        this.lightGroup!.add(this.fireLight2);
    }

    /**
     * 平滑噪声
     */
    private smoothNoise(x: number): number {
        const primary = Math.sin(x);
        const secondary = Math.sin(x * 2.3) * 0.5;
        const tertiary = Math.sin(x * 4.7) * 0.25;
        return (primary + secondary + tertiary) / 1.5;
    }

    /**
     * 获取颜色配置
     */
    private getColorConfig(): any {
        // 这里应该从 ColorManager 获取，暂时使用默认值
        return {
            day: { smokeAlphaSecondStop: 0.5 },
            night: { smokeAlphaSecondStop: 0.3 },
        };
    }

    /**
     * 更新火焰效果的季節性
     */
    private updateFireEffectsForSeason(): void {
        const isRainySeason = this.currentSeason === 'rainy';

        if (this.fireEmitterParams) {
            this.fireEmitterParams.emissionRate = isRainySeason
                ? 0
                : this.originalFireEmissionRate;
        }

        if (this.amberEmitterParams) {
            this.amberEmitterParams.emissionRate = isRainySeason
                ? 0
                : this.originalAmberEmissionRate;
        }

        if (this.smokeEmitterParams) {
            this.smokeEmitterParams.emissionRate = isRainySeason
                ? this.rainySmokeEmissionRate
                : this.originalSmokeEmissionRate;

            const smokePos = isRainySeason
                ? this.rainySmokePosition
                : this.originalSmokePosition;
            this.smokeEmitterParams.shape.position.set(
                smokePos.x,
                smokePos.y,
                smokePos.z
            );
        }

        this.updateSmokeColorForSeason(isRainySeason);

        if (this.fireGroup) {
            this.fireGroup.visible = !isRainySeason;
        }

        if (this.amberGroup) {
            this.amberGroup.visible = !isRainySeason;
        }

        if (this.fireLight) {
            this.fireLight.visible = !isRainySeason;
        }

        if (this.fireLight2) {
            this.fireLight2.visible = !isRainySeason;
        }
    }

    /**
     * 更新烟雾颜色的季節性
     */
    private updateSmokeColorForSeason(isRainySeason: boolean): void {
        const colorStops = isRainySeason
            ? this.rainySmokeColorStops
            : this.originalSmokeColorStops;

        this.smokeColorStops.forEach((stop, index) => {
            if (colorStops[index]) {
                stop.value.copy(colorStops[index].value);
            }
        });

        this._buildSmokeInterpolantsAndTextures();
    }

    /**
     * 更新烟雾透明度
     */
    private updateSmokeAlpha(): void {
        if (!this.smokeAlphaStops || !this.smokeAlphaConfig[this.envTime]) return;

        const config = this.smokeAlphaConfig[this.envTime];
        this.smokeAlphaStops[1].value = config.smokeAlphaSecondStop;

        this._buildSmokeInterpolantsAndTextures();
    }

    /**
     * 更新闪烁灯光
     */
    private updateFlickerLight(delta: number): void {
        if (!this.fireLightPresent || !this.fireLight || !this.fireLight2) return;

        this.flickerTime += delta;
        if (this.flickerTime > 628) {
            this.flickerTime -= 628;
        }
        const flicker1 = this.smoothNoise(
            this.flickerTime * this.flickerSpeed + this.noiseOffset1
        );
        const flicker2 = this.smoothNoise(
            this.flickerTime * this.flickerSpeed * 1.3 + this.noiseOffset2
        );
        const combinedFlicker = (flicker1 + flicker2 * 0.5) / 1.5;
        const intensityVariation =
            this.firelight1OriginalIntensity * this.flickerAmount;
        this.fireLight.intensity =
            this.firelight1OriginalIntensity + combinedFlicker * intensityVariation;
        const positionOffset = Math.sin(this.flickerTime * 2.0) * 0.1;
        this.fireLight.position.y = 1.0 + positionOffset;
        const flicker2Noise = this.smoothNoise(
            this.flickerTime * this.flickerSpeed * 0.8 + this.noiseOffset2 + 50
        );
        this.fireLight2.intensity =
            this.firelight2OriginalIntensity + flicker2Noise * this.flickerAmount * 2;
    }

    /**
     * 从时间字符串提取小时
     */
    private getHourFromTime(timeString: string): number {
        const parts = timeString.split(':');
        return parseInt(parts[0], 10);
    }
}
