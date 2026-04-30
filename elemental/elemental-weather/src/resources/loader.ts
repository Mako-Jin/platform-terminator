import {AppEvents, eventBus, LoggerFactory} from "common-shared";
import type {ResourceErrorData, ResourceProgressData} from "common-shared";
import type {Asset} from "/@/resources";
import {AudioLoader, CubeTextureLoader, LoadingManager, TextureLoader} from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { resourceManager } from "./manager";


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

export class ResourceLoader {

    private Logger = LoggerFactory.create("ResourceLoader");

    private readonly sources: Asset[];

    private readonly isDebugMode: boolean;

    private sourceByUrl: {[key: string]: Asset};

    private toLoad: number;
    private loaded: number;

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

    private convertSource () {
        this.sourceByUrl = {};
        this.sources.forEach((src: Asset) => {
            const paths = src.path;
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
    }

    private addEventListeners() {
        this.addProcessEvent();
        this.addOnloadEvent();
        this.addLoadErrorEvent();
    }

    private addProcessEvent() {
        this.manager.onProgress = (_url, itemsLoaded, itemsTotal) => {
            let urlKey;
            if (typeof _url === 'string') {
                urlKey = _url;
            } else if (Array.isArray(_url) && (_url as string[]).length) {
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

            eventBus.emit(AppEvents.RESOURCE_PROGRESS, progressData);

            if (this.isDebugMode) {
                this.Logger.info(`[ResourceLoader] Progress: ${progressData.id} (${itemsLoaded}/${itemsTotal})`);
            }
        };
    }

    private addOnloadEvent() {
        this.manager.onLoad = () => {
            this.onLoadComplete();
        };
    }

    private onLoadComplete() {
        resourceManager.markAsLoaded(this.toLoad);

        if (this.isDebugMode) {
            this.Logger.info('[Loader] All resources loaded successfully');
        }
    }

    private addLoadErrorEvent() {
        this.manager.onError = (url) => {
            let urlKey;
            if (typeof url === 'string') {
                urlKey = url;
            } else if (Array.isArray(url) && (url as string[]).length) {
                urlKey = url[0];
            } else if (url && typeof url === 'object') {
                urlKey = url.url || url.src || JSON.stringify(url);
            } else {
                urlKey = String(url);
            }

            const src = this.sourceByUrl[urlKey];
            const id = src ? src.id : urlKey;

            const errorData: ResourceErrorData = {
                id,
                url: urlKey,
                itemsLoaded: this.loaded,
                itemsTotal: this.toLoad,
            };

            eventBus.emit(AppEvents.RESOURCE_ERROR, errorData);
            if (this.isDebugMode) {
                this.Logger.error(`[ResourceLoader] Error loading: ${id} at ${urlKey}`);
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
                resourceManager.addItem(id, file);
                if (this.isDebugMode) {
                    this.Logger.info(`[ResourceLoader] Loaded and stored: ${id}`);
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
                    this.Logger.warn(`Unknown asset type: ${type}`);
            }
        }
    }

}

export default ResourceLoader;

