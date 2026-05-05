import * as THREE from 'three';
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
import rocksVertexCommonChunk from '/@/shaders/Chunks/rocks/rocks.vertex_common_chunk.glsl';
import rocksVertexBeginChunk from '/@/shaders/Chunks/rocks/rocks.vertex_begin_chunk.glsl';
import rocksFragmentCommonChunk from '/@/shaders/Chunks/rocks/rocks.fragment_common_chunk.glsl';
import rocksFragmentColorChunk from '/@/shaders/Chunks/rocks/rocks.fragment_color_chunk.glsl';


export default class Rocks extends Object3DComponent {
    
    private resourcesManager: ResourcesManager;
    private rocksModel: THREE.Group | null = null;
    private rocksMaterial: THREE.MeshStandardMaterial | null = null;
    private customRockUniforms: any = null;

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        super(scene, 'Rocks', options.isDebugMode);
        
        this.resourcesManager = ResourcesManager.getInstance();
    }

    /**
     * 初始化阶段 - 加载岩石模型
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Rocks] Initializing...');

        const rocksResource = this.resourcesManager.getItem("rocksModel");
        if (!rocksResource || !rocksResource.scene) {
            this.logger.error('[Rocks] rocksModel resource not found or invalid');
            return;
        }
        
        this.rocksModel = rocksResource.scene;
        this.rocksModel!.name = 'RocksModel';
        
        // ✅ 设置为根节点
        this.setRoot(this.rocksModel!);

        // 创建材质
        this.createMaterial();

        // 配置模型
        await this.configureModel();

        this.logger.info('[Rocks] Initialization complete');
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Rocks] Activating...');
        
        // 立即更新颜色
        this.updateColors();
    }

    /**
     * 更新阶段 - 每帧调用（目前不需要）
     */
    protected onUpdate(params: UpdateParams): void {
        // Rocks 不需要每帧更新
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Rocks] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Rocks] Disposing...');
        
        // 清理材质
        if (this.rocksMaterial) {
            this.rocksMaterial.dispose();
            this.rocksMaterial = null;
        }

        // 清理 uniforms
        this.customRockUniforms = null;
        
        this.rocksModel = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用
     */
    public onTimeChanged(data: TimeChangedData): void {
        this.logger.debug(`[Rocks] Time changed: ${data.currentTime}`);

        // 更新颜色
        this.updateColors();
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Rocks] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Rocks] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Rocks] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
        
        // 更新颜色
        this.updateColors();
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
        
        // 岩石材质参数调试
        if (!this.customRockUniforms) return;

        // 岩石颜色
        const rockColor1Controller = gui.addColor(
            { rockColor1: this.customRockUniforms.uRockColor1.value.getHex() },
            'rockColor1'
        ).name('Rock Color Light');
        rockColor1Controller.onChange((hex: number) => {
            this.customRockUniforms.uRockColor1.value.setHex(hex);
        });

        const rockColor2Controller = gui.addColor(
            { rockColor2: this.customRockUniforms.uRockColor2.value.getHex() },
            'rockColor2'
        ).name('Rock Color Dark');
        rockColor2Controller.onChange((hex: number) => {
            this.customRockUniforms.uRockColor2.value.setHex(hex);
        });

        const rockColor3Controller = gui.addColor(
            { rockColor3: this.customRockUniforms.uRockColor3.value.getHex() },
            'rockColor3'
        ).name('Rock Color Dark Crevices');
        rockColor3Controller.onChange((hex: number) => {
            this.customRockUniforms.uRockColor3.value.setHex(hex);
        });

        // 苔藓颜色
        const mossColor1Controller = gui.addColor(
            { mossColor1: this.customRockUniforms.uMossColor1.value.getHex() },
            'mossColor1'
        ).name('Rock Moss Color');
        mossColor1Controller.onChange((hex: number) => {
            this.customRockUniforms.uMossColor1.value.setHex(hex);
        });

        const mossColor2Controller = gui.addColor(
            { mossColor2: this.customRockUniforms.uMossColor2.value.getHex() },
            'mossColor2'
        ).name('Rock Moss Color2');
        mossColor2Controller.onChange((hex: number) => {
            this.customRockUniforms.uMossColor2.value.setHex(hex);
        });

        const mossColor3Controller = gui.addColor(
            { mossColor3: this.customRockUniforms.uMossColor3.value.getHex() },
            'mossColor3'
        ).name('Rock Moss Color3');
        mossColor3Controller.onChange((hex: number) => {
            this.customRockUniforms.uMossColor3.value.setHex(hex);
        });

        // 苔藓参数
        gui.add(this.customRockUniforms.uMossNoiseFactor, 'value', 0.1, 100.0, 0.01)
            .name('Rock Moss Noise Factor');
        gui.add(this.customRockUniforms.uMossVisibility, 'value', 0.0, 5.0, 0.01)
            .name('Rock Moss Visibility');
    }

    /**
     * 创建材质
     */
    private createMaterial(): void {
        this.rocksMaterial = new THREE.MeshStandardMaterial({
            roughness: 1.0,
            metalness: 0,
        });

        // 加载纹理资源
        const displacementTexture = this.resourcesManager.getItem("displacementMapBlur");
        const perlinNoise = this.resourcesManager.getItem("perlinNoise");

        if (displacementTexture) {
            displacementTexture.wrapS = displacementTexture.wrapT = THREE.RepeatWrapping;
        }
        if (perlinNoise) {
            perlinNoise.wrapS = perlinNoise.wrapT = THREE.RepeatWrapping;
        }

        // 获取初始颜色配置
        const colors = this.getColorConfig();

        this.customRockUniforms = {
            uDisplacementMap: { value: displacementTexture?.resource || null },
            uPerlinNoise: { value: perlinNoise?.resource || null },
            uRockColor1: { value: colors.uRockColor1.clone() },
            uRockColor2: { value: colors.uRockColor2.clone() },
            uRockColor3: { value: colors.uRockColor3.clone() },
            uMossColor1: { value: colors.uMossColor1.clone() },
            uMossColor2: { value: colors.uMossColor2.clone() },
            uMossColor3: { value: colors.uMossColor3.clone() },
            uMossNoiseFactor: { value: 1.2 },
            uMossVisibility: { value: 3.0 },
        };

        // 注入自定义 shader
        this.rocksMaterial.onBeforeCompile = (shader) => {
            shader.uniforms = { ...shader.uniforms, ...this.customRockUniforms };

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                rocksVertexCommonChunk
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                rocksVertexBeginChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                rocksFragmentCommonChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                rocksFragmentColorChunk
            );
        };
    }

    /**
     * 配置模型
     */
    private async configureModel(): Promise<void> {
        if (!this.rocksModel || !this.rocksMaterial) return;

        this.rocksModel.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;

            child.material = this.rocksMaterial!;
            child.castShadow = true;
            child.receiveShadow = true;
        });
    }

    /**
     * 获取颜色配置
     */
    private getColorConfig(): any {
        // 这里应该从 ColorManager 获取，暂时使用默认值
        return {
            uRockColor1: new THREE.Color(0.5, 0.5, 0.5),
            uRockColor2: new THREE.Color(0.3, 0.3, 0.3),
            uRockColor3: new THREE.Color(0.2, 0.2, 0.2),
            uMossColor1: new THREE.Color(0.4, 0.5, 0.3),
            uMossColor2: new THREE.Color(0.35, 0.45, 0.25),
            uMossColor3: new THREE.Color(0.3, 0.4, 0.2),
        };
    }

    /**
     * 更新颜色
     */
    private updateColors(): void {
        if (!this.customRockUniforms) return;

        const colors = this.getColorConfig();
        
        this.customRockUniforms.uRockColor1.value.copy(colors.uRockColor1);
        this.customRockUniforms.uRockColor2.value.copy(colors.uRockColor2);
        this.customRockUniforms.uRockColor3.value.copy(colors.uRockColor3);
        this.customRockUniforms.uMossColor1.value.copy(colors.uMossColor1);
        this.customRockUniforms.uMossColor2.value.copy(colors.uMossColor2);
        this.customRockUniforms.uMossColor3.value.copy(colors.uMossColor3);

        this.logger.debug('[Rocks] Updated colors');
    }

}
