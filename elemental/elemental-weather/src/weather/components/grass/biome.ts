import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    type ComponentConfig,
    type DateChangedData,
    type IObject3DComponent,
    Object3DComponent,
    SceneWrapper,
    type SeasonChangedData,
    type TimeChangedData,
    type UpdateParams,
    resourcesManager
} from "common-three";


interface BiomeData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}


export default class BiomeManager extends Object3DComponent {

    private worldSize: number;
    private biomeTexture: Three.Texture | null | undefined = null;
    private biomeData: BiomeData | null = null;

    constructor(scene: SceneWrapper, options: { 
        isDebugMode?: boolean;
        worldSize?: number;
    } = {}) {
        super(scene, 'weather-biome', options.isDebugMode);
        
        this.worldSize = options.worldSize ?? 33;
    }

    /**
     * 初始化阶段 - 加载并缓存 Biome 数据
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[BiomeManager] Initializing...');

        this.loadBiomeTexture();

        this.logger.info(`[BiomeManager] Initialization complete. Texture size: ${this.biomeData?.width}x${this.biomeData?.height}`);
    }

    /**
     * 激活阶段
     */
    protected onActivate(): void {
        this.logger.info('[BiomeManager] Activating...');
    }

    /**
     * 更新阶段 - BiomeManager 不需要每帧更新
     */
    protected onUpdate(_params: UpdateParams): void {
        // BiomeManager 是静态数据管理器，不需要更新
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[BiomeManager] Deactivated');
    }

    /**
     * 销毁阶段 - 清理缓存数据
     */
    protected onDispose(): void {
        this.logger.info('[BiomeManager] Disposing...');

        this.biomeData = null;
        this.biomeTexture = null;
    }

    public onTimeChanged(_data: TimeChangedData): void {
        // BiomeManager 不响应时间变化
    }

    public onSeasonChanged(_data: SeasonChangedData): void {
        // BiomeManager 不响应季节变化
    }

    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[BiomeManager] Date changed: ${data.currentDate}`);
    }

    /**
     * 加载 Biome 纹理
     */
    private loadBiomeTexture(): void {
        this.biomeTexture = resourcesManager.getItemById('grassPathDensityDataTexture');
        if (!this.biomeTexture) {
            this.logger.error('[BiomeManager] Biome texture resource not found');
            return;
        }

        this.biomeTexture.minFilter = Three.NearestFilter;
        this.biomeTexture.magFilter = Three.NearestFilter;
        this.biomeTexture.generateMipmaps = false;

        this.cacheBiomeData();
    }

    /**
     * 缓存 Biome 数据到内存（性能优化）
     */
    private cacheBiomeData(): void {
        if (!this.biomeTexture) {
            this.logger.warn('[BiomeManager] Biome texture not loaded yet');
            return;
        }

        const img = this.biomeTexture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | ImageData | undefined;

        // 检查图片是否已加载
        if (!img) {
            this.logger.warn('[BiomeManager] Biome texture image is null or undefined');
            return;
        }

        // 获取图片尺寸（兼容不同类型的图片源）
        let width = 0;
        let height = 0;

        if ('naturalWidth' in img) {
            // HTMLImageElement
            width = (img as HTMLImageElement).naturalWidth;
            height = (img as HTMLImageElement).naturalHeight;
        } else if ('width' in img) {
            // HTMLCanvasElement, ImageBitmap, ImageData
            width = (img as HTMLCanvasElement | ImageBitmap | ImageData).width;
            height = (img as HTMLCanvasElement | ImageBitmap | ImageData).height;
        }

        if (width === 0 || height === 0) {
            this.logger.warn(`[BiomeManager] Biome texture has invalid dimensions: ${width}x${height}`);
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            this.logger.error('[BiomeManager] Failed to get canvas context for biome caching');
            return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img as CanvasImageSource, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.biomeData = {
            data: imageData.data,
            width: canvas.width,
            height: canvas.height,
        };

        this.logger.info(`[BiomeManager] Biome data cached: ${canvas.width}x${canvas.height}`);
    }

    /**
     * 根据世界坐标获取草地密度值 (0-1)
     * @param worldX 世界 X 坐标
     * @param worldZ 世界 Z 坐标
     * @returns 密度值 (0.0 - 1.0)
     */
    public getGrassDensity(worldX: number, worldZ: number): number {
        if (!this.biomeData) {
            this.logger.warn('[BiomeManager] Biome data not cached, returning default density 1.0');
            return 1.0;
        }

        const u = worldX / this.worldSize + 0.5;
        const v = worldZ / this.worldSize + 0.5;

        const pixelX = Math.floor(u * this.biomeData.width);
        const pixelY = Math.floor((1 - v) * this.biomeData.height);

        const clampedX = Math.max(0, Math.min(this.biomeData.width - 1, pixelX));
        const clampedY = Math.max(0, Math.min(this.biomeData.height - 1, pixelY));

        const idx = (clampedY * this.biomeData.width + clampedX) * 4;
        const greenChannelValue = this.biomeData.data[idx + 1];
        
        return greenChannelValue / 255;
    }

    /**
     * 获取 Biome 纹理（用于着色器）
     */
    public getBiomeTexture(): Three.Texture | null | undefined {
        return this.biomeTexture;
    }

    /**
     * 获取缓存的 Biome 数据
     */
    public getBiomeData(): BiomeData | null {
        return this.biomeData;
    }

    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();

        const info = {
            worldSize: this.worldSize,
            textureWidth: this.biomeData?.width || 0,
            textureHeight: this.biomeData?.height || 0,
            hasCachedData: !!this.biomeData,
        };

        const infoFolder = gui.addFolder('Biome Info');
        infoFolder.add(info, 'worldSize').name('World Size').disable();
        infoFolder.add(info, 'textureWidth').name('Texture Width').disable();
        infoFolder.add(info, 'textureHeight').name('Texture Height').disable();
        infoFolder.add(info, 'hasCachedData').name('Has Cached Data').disable();

        // 测试密度查询
        const testCoords = { x: 0, z: 0, density: 0 };
        const testFolder = gui.addFolder('Test Density Query');
        testFolder.add(testCoords, 'x', -this.worldSize / 2, this.worldSize / 2).name('World X');
        testFolder.add(testCoords, 'z', -this.worldSize / 2, this.worldSize / 2).name('World Z');
        testFolder.add(testCoords, 'density', 0, 1).name('Density').disable();
        
        testFolder.add({
            query: () => {
                testCoords.density = this.getGrassDensity(testCoords.x, testCoords.z);
            }
        }, 'query').name('Query Density');
    }
}
