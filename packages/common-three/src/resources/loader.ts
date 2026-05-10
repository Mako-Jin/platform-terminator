import {LoggerFactory, eventBus} from "common-tools";
import type {
    Asset,
    LoaderMap,
    ResourceErrorData,
    ResourceLoadedData,
    ResourceProgressData
} from "./types";
import {AudioLoader, CubeTextureLoader, LoadingManager, TextureLoader} from "three";
import {resourcesManager} from "./manager";
import {DRACOLoader} from "three/addons/loaders/DRACOLoader";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader";
import {HDRLoader} from "three/addons/loaders/HDRLoader";


export class ResourceLoader {

    // 事件名称常量
    public static readonly COMMON_THREE_RESOURCE_PROGRESS = 'common-three:resource:progress';
    public static readonly COMMON_THREE_RESOURCE_LOADED = 'common-three:resource:loaded';
    public static readonly COMMON_THREE_RESOURCE_ERROR = 'common-three:resource:error';

    private logger = LoggerFactory.create("common-three-resource-loader");

    private readonly sources: Asset[];

    private readonly isDebugMode: boolean;

    private toLoad: number;
    private loaded: number;

    private sourceByUrl: {[key: string]: Asset};

    private readonly manager: LoadingManager;

    private loaders: Partial<LoaderMap> = {};

    constructor(assets: Asset[], isDebugMode: boolean = false) {
        this.sources = assets;
        this.isDebugMode = isDebugMode;
        this.convertSource();
        this.toLoad = Object.keys(this.sourceByUrl).length;
        this.loaded = 0;
        this.manager = new LoadingManager();
        this.addEventListeners();
        this.initLoaders();
        this.doLoad();

        if (this.toLoad === 0) {
            setTimeout(() => this.onLoadComplete(), 0);
        }
    }

    private convertSource() {
        this.sourceByUrl = Object.fromEntries(
            this.sources.flatMap((src: Asset): [string, Asset][] => [
                ...src.path.map((url): [string, Asset] => [url, src]),
                ...(typeof window !== 'undefined' && src.path[0]
                    ? [[ResourceLoader.getAbsoluteUrl(src.path[0]), src] as [string, Asset]]
                    : [])
            ])
        );
    }

    private static getAbsoluteUrl(url: string): string {
        try {
            return new URL(url, window.location.href).href;
        } catch {
            return url;
        }
    }

    private addEventListeners() {
        this.addProcessEvent();
        this.addOnloadEvent();
        this.addLoadErrorEvent();
    }

    private static extractUrlKey(url: string | string[] | any): string {
        if (typeof url === 'string') {
            return url;
        } else if (Array.isArray(url) && url.length > 0) {
            return url[0];
        } else if (url && typeof url === 'object') {
            const obj = url as Record<string, any>;
            return obj.url || obj.src || JSON.stringify(url);
        } else {
            return String(url);
        }
    }

    private addProcessEvent() {
        this.manager.onProgress = (_url: string | string[], itemsLoaded: number, itemsTotal: number) => {
            const urlKey = ResourceLoader.extractUrlKey(_url);
            const src = this.sourceByUrl[urlKey];
            const id = src ? src.id : urlKey;
            const file = urlKey.indexOf('/') !== -1
                    ? urlKey.substring(urlKey.lastIndexOf('/') + 1)
                    : urlKey;

            this.loaded = itemsLoaded;

            const progressData: ResourceProgressData = {
                assetId: `${id} - ${file}`,
                currentUrl: urlKey,
                itemsLoaded,
                itemsTotal,
                percent: (itemsLoaded / itemsTotal) * 100,
            };

            eventBus.emit(ResourceLoader.COMMON_THREE_RESOURCE_PROGRESS, progressData);

            if (this.isDebugMode) {
                this.logger.info(`[ResourceLoader] Progress: ${progressData.assetId} (${itemsLoaded}/${itemsTotal})`);
            }
        };
    }

    private addOnloadEvent() {
        this.manager.onLoad = () => {
            this.onLoadComplete();
        };
    }

    private onLoadComplete() {
        resourcesManager.markAsLoaded(this.toLoad);

        // ✅ 触发资源加载完成事件
        const loadedData: ResourceLoadedData = {
            itemsLoaded: this.toLoad,
            itemsTotal: this.toLoad,
            percent: 100,
            totalDuration: Date.now(),
        };
        eventBus.emit(ResourceLoader.COMMON_THREE_RESOURCE_LOADED, loadedData);

        if (this.isDebugMode) {
            this.logger.info('[Loader] All resources loaded successfully');
        }
    }

    private addLoadErrorEvent() {
        this.manager.onError = (url: string | string[]) => {
            let urlKey = ResourceLoader.extractUrlKey(url);

            const src = this.sourceByUrl[urlKey];
            const id = src ? src.id : urlKey;

            const errorData: ResourceErrorData = {
                assetId: id,
                url: urlKey,
                errorType: 'unknown',
                itemsLoaded: this.loaded,
                itemsTotal: this.toLoad,
            };

            eventBus.emit(ResourceLoader.COMMON_THREE_RESOURCE_ERROR, errorData);
            if (this.isDebugMode) {
                this.logger.error(`[ResourceLoader] Error loading: ${id} at ${urlKey}`);
            }
        };
    }

    private initLoaders() {
        this.loaders = {};

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        this.loaders.dracoLoader = dracoLoader;

        this.loaders.gltfCompressLoader = new GLTFLoader(this.manager);
        this.loaders.gltfCompressLoader.setDRACOLoader(dracoLoader);
        this.loaders.gltfLoader = new GLTFLoader(this.manager);

        this.loaders.textureLoader = new TextureLoader(this.manager);
        this.loaders.hdriLoader = new HDRLoader(this.manager);
        this.loaders.cubeTextureLoader = new CubeTextureLoader(this.manager);
        this.loaders.audioLoader = new AudioLoader(this.manager);
    }

    private doLoad() {
        for (const source of this.sources) {
            const { type, path, id } = source;

            const onLoad = (file: any) => {
                // ✅ 使用按类型存储的方式（type 作为字符串传入）
                resourcesManager.addItemByType(id, type, file);
                if (this.isDebugMode) {
                    this.logger.info(`[ResourceLoader] Loaded and stored: ${id} [${type}]`);
                }
            };
            const onProgress = undefined;

            switch (type) {
                case 'gltfModelCompressed':
                    this.loaders.gltfCompressLoader.load(path, onLoad, onProgress);
                    break;
                case 'gltfModel':
                    this.loaders.gltfLoader.load(path, onLoad, onProgress);
                    break;
                case 'texture':
                    this.loaders.textureLoader.load(path, onLoad, onProgress);
                    break;
                case 'cubeMap':
                    this.loaders.cubeTextureLoader.load(path, onLoad, onProgress);
                    break;
                case 'audio':
                    this.loaders.audioLoader.load(path, onLoad, onProgress);
                    break;
                default:
                    this.logger.warn(`Unknown asset type: ${type}`);
            }
        }
    }

}
