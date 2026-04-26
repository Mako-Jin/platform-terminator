import type {Asset} from "/@/utils/assets/assets.ts";
import {
    AppEvents,
    eventBus,
    LoggerFactory,
    type ResourceErrorData,
    type ResourceLoadedData,
    type ResourceProgressData
} from "common-shared";

import {AudioLoader, CubeTextureLoader, LoadingManager, TextureLoader} from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

/**
 * 加载器映射
 */
interface LoaderMap {
    dracoLoader: DRACOLoader;
    gltfCompressLoader: GLTFLoader;
    gltfLoader: GLTFLoader;
    textureLoader: TextureLoader;
    hdriLoader: HDRLoader;
    cubeTextureLoader: CubeTextureLoader;
    audioLoader: AudioLoader;
}

class ResourceLoader {

    private Logger = LoggerFactory.create("ResourceLoader");

    private sources: Asset[];
    private sourceByUrl: {[key: string]: Asset};
    private toLoad: number;
    private loaded: number;
    private isDebugMode: boolean;

    private manager: LoadingManager;

    private loaders: Partial<LoaderMap> = {};

    private items: Record<string, any> = {};

    constructor(assets: Asset[], isDebugMode: boolean = false) {
        this.sources = assets;
        this.isDebugMode = isDebugMode;
        this.sourceByUrl = {};

        this.sources.forEach((src) => {
            const paths = Array.isArray(src.path) ? src.path : [src.path];
            paths.forEach((url) => {
                this.sourceByUrl[url] = src;
            });

            try {
                if (typeof window !== 'undefined') {
                    const abs = new URL(paths[0], window.location.href).href;
                    this.sourceByUrl[abs] = src;
                }
            } catch (e) {
                this.Logger.error('Error adding source by URL:', e);
            }
        });

        this.toLoad = Object.keys(this.sourceByUrl).length;
        this.loaded = 0;

        this.manager = new LoadingManager();

        this.manager.onProgress = (_url, itemsLoaded, itemsTotal) => {
            let urlKey;
            if (typeof _url === 'string') {
                urlKey = _url;
            } else if (Array.isArray(_url) && _url.length) {
                urlKey = _url[0];
            } else if (_url && typeof _url === 'object') {
                urlKey = _url.url || _url.src || JSON.stringify(_url);
            } else {
                urlKey = String(_url);
            }

            const src = this.sourceByUrl[urlKey];
            const id = src ? src.id : urlKey;
            const file =
                typeof urlKey === 'string' && urlKey.indexOf('/') !== -1
                    ? urlKey.substring(urlKey.lastIndexOf('/') + 1)
                    : urlKey;

            this.loaded = itemsLoaded;

            const progressData: ResourceProgressData = {
                id: `${id} - ${file}`,
                itemsLoaded,
                itemsTotal,
                percent: (itemsLoaded / itemsTotal) * 100,
            };

            // 使用统一事件总线发送进度事件
            eventBus.emit(AppEvents.RESOURCE_PROGRESS, progressData);

            if (this.isDebugMode) {
                this.Logger.info(`[ResourceLoader] Progress: ${progressData.id} (${itemsLoaded}/${itemsTotal})`);
            }
        };

        this.manager.onLoad = () => {
            const loadedData: ResourceLoadedData = {
                itemsLoaded: this.toLoad,
                itemsTotal: this.toLoad,
                percent: 100,
            };

            // 使用统一事件总线发送加载完成事件
            eventBus.emit(AppEvents.RESOURCE_LOADED, loadedData);

            if (this.isDebugMode) {
                this.Logger.info('[ResourceLoader] All resources loaded successfully');
            }
        };

        this.manager.onError = (url) => {
            let urlKey;
            if (typeof url === 'string') urlKey = url;
            else if (Array.isArray(url) && url.length) urlKey = url[0];
            else if (url && typeof url === 'object')
                urlKey = url.url || url.src || JSON.stringify(url);
            else urlKey = String(url);

            const src = this.sourceByUrl[urlKey];
            const id = src ? src.id : urlKey;

            const errorData: ResourceErrorData = {
                id,
                url: urlKey,
                itemsLoaded: this.loaded,
                itemsTotal: this.toLoad,
            };

            // 使用统一事件总线发送错误事件
            eventBus.emit(AppEvents.RESOURCE_ERROR, errorData);
            if (this.isDebugMode) {
                this.Logger.error(`[ResourceLoader] Error loading: ${id} at ${urlKey}`);
            }
        };

        this.setLoaders();
        this.initLoading();

        if (this.toLoad === 0) {
            setTimeout(() => this.manager.onLoad(), 0);
        }

    }

    private setLoaders() {
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

    private initLoading() {

        for (const source of this.sources) {
            const { type, path, id } = source;

            const onLoad = (file: any) => {
                this.items[id] = file;
                if (this.isDebugMode) {
                    this.Logger.info(`[ResourceLoader] Loaded: ${id}`);
                }
            };
            const onProgress = undefined;

            switch (type) {
                case 'gltfModelCompressed':
                    this.loaders.gltfCompressLoader.load(path, onLoad, onProgress);
                    break;
                case 'gltfModelCompressed':
                    this.loaders.gltfLoader.load(path, onLoad, onProgress);
                    break;
                case 'texture':
                    this.loaders.textureLoader.load(path, onLoad, onProgress);
                    break;
                // case 'HDRITexture':
                //     this.loaders.hdriLoader.load(path, onLoad, onProgress);
                //     break;
                case 'cubeMap':
                    this.loaders.cubeTextureLoader.load(path, onLoad, onProgress);
                    break;
                case 'audio':
                    this.loaders.audioLoader.load(path, onLoad, onProgress);
                    break;
                default:
                    this.Logger.warn(`Unknown asset type: ${type}`);
            }
        }
    }

    /**
     * 获取已加载的资源
     */
    getItems(): Record<string, any> {
        return this.items;
    }

}

export default ResourceLoader;
