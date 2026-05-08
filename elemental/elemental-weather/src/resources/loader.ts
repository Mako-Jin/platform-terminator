import type {ResourceErrorData, ResourceLoadedData, ResourceProgressData} from "common-tools";
import {AppEvents, eventBus, LoggerFactory} from "common-tools";
import type {Asset} from "/@/resources";
import {AudioLoader, Color, CubeTextureLoader, LoadingManager, TextureLoader} from "three";
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {resourcesManager} from "./manager";
import type {SeasonChangedData} from "common-three";
import {datetimeManager} from "common-three";
import type {ConfigObject} from "/@/utils/color";
import {AVAILABLE_SEASONS} from "common-three";


export interface SeasonColorComponent {
    day?: ConfigObject;
    night?: ConfigObject;
}

export interface SeasonColorConfigs {
    ground?: SeasonColorComponent;
    lighting?: SeasonColorComponent;
    grass?: SeasonColorComponent;
    bush?: SeasonColorComponent;
    rocks?: SeasonColorComponent;
    fire?: SeasonColorComponent;
    fallingLeaves?: SeasonColorComponent;
    windLines?: SeasonColorComponent;
    tent?: SeasonColorComponent;
    skydome?: SeasonColorComponent;
    [key: string]: SeasonColorComponent | undefined;
}


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
        resourcesManager.markAsLoaded(this.toLoad);

        // ✅ 触发资源加载完成事件
        const loadedData: ResourceLoadedData = {
            itemsTotal: this.toLoad,
            timestamp: Date.now(),
        };
        eventBus.emit(AppEvents.RESOURCE_LOADED, loadedData);

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
                resourcesManager.addItem(id, file);
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

export class SeasonConfigLoader {

    private static Logger = LoggerFactory.create("season-config-loader");

    private static configCache: Map<string, SeasonColorConfigs> = new Map();

    static async loadSeasonConfig(season: string): Promise<SeasonColorConfigs> {
        if (this.configCache.has(season)) {
            return this.configCache.get(season)!;
        }

        try {
            const path = `/@/settings/seasons/${season}.json`;
            const module = await import(/* @vite-ignore */ path);
            const rawData = module.default;

            const processedConfig = this.processConfig(rawData);
            this.configCache.set(season, processedConfig);

            this.Logger.debug(`Loaded season config: ${season}`);
            return processedConfig;
        } catch (error) {
            this.Logger.error(`Failed to load season config: ${season}`, error);
            throw error;
        }
    }

    static async loadAllSeasons(seasons: string[]): Promise<Map<string, SeasonColorConfigs>> {
        const configs = new Map<string, SeasonColorConfigs>();

        for (const season of seasons) {
            try {
                const config = await this.loadSeasonConfig(season);
                configs.set(season, config);
            } catch (error) {
                this.Logger.warn(`Skipping season ${season} due to load error`);
            }
        }

        return configs;
    }

    private static processConfig(rawData: any): SeasonColorConfigs {
        const processed: any = {};

        for (const [componentName, componentData] of Object.entries(rawData)) {
            if (typeof componentData === 'object' && componentData !== null) {
                processed[componentName] = this.processComponent(componentData);
            }
        }

        return processed;
    }

    private static processComponent(componentData: any): any {
        const result: any = {};

        for (const [timeOfDay, data] of Object.entries(componentData)) {
            if (typeof data === 'object' && data !== null) {
                result[timeOfDay] = this.processValues(data);
            }
        }

        return result;
    }

    private static processValues(data: any): any {
        const result: any = {};

        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value) && value.length === 3) {
                result[key] = new Color(value[0], value[1], value[2]);
            } else if (typeof value === 'object' && value !== null && value.type === 'color') {
                result[key] = new Color(
                    value.value[0],
                    value.value[1],
                    value.value[2]
                );
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    static clearCache(): void {
        this.configCache.clear();
    }
}


export default class SeasonConfigManager {

    private Logger = LoggerFactory.create("weather-season");

    private static instance: SeasonConfigManager | null = null;

    private currentSeason: string;

    private seasonConfigs: Map<string, SeasonColorConfigs> = new Map();

    private isInitialized: boolean = false;

    private initPromise: Promise<void> | null = null;

    constructor() {
        if (SeasonConfigManager.instance) {
            return SeasonConfigManager.instance;
        }
        SeasonConfigManager.instance = this;

        this.currentSeason = datetimeManager.getCurrentSeason();

        this.initPromise = this.initialize();
    }

    static getInstance(): SeasonConfigManager {
        if (!SeasonConfigManager.instance) {
            SeasonConfigManager.instance = new SeasonConfigManager();
        }
        return SeasonConfigManager.instance;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            this.Logger.info('Loading season configurations...');
            this.seasonConfigs = await SeasonConfigLoader.loadAllSeasons(AVAILABLE_SEASONS);
            this.isInitialized = true;
            this.Logger.info(`Successfully loaded ${this.seasonConfigs.size} season configurations`);
        } catch (error) {
            this.Logger.error('Failed to initialize season configurations', error);
            throw error;
        }
    }

    private emitSeasonChanged(previousSeason: string): void {
        const data: SeasonChangedData = {
            season: this.currentSeason,
            previousSeason,
            timestamp: Date.now(),
        };

        eventBus.emit('environment:season:changed', data);
        this.Logger.debug(`Season changed: ${previousSeason} → ${this.currentSeason}`);
    }

    async waitForInitialization(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initPromise) {
            await this.initPromise;
        } else {
            await this.initialize();
        }
    }

    getSeasonConfig(season?: string): SeasonColorConfigs | undefined {
        const targetSeason = season || this.currentSeason;

        if (!this.isInitialized) {
            this.Logger.warn(`Season Config not initialized yet, returning undefined for season: ${targetSeason}`);
            return undefined;
        }

        return this.seasonConfigs.get(targetSeason);
    }

    registerSeasonConfigs(season: string, configs: SeasonColorConfigs): void {
        this.seasonConfigs.set(season, configs);
        this.Logger.debug(`Registered custom color configs for season: ${season}`);
    }

}
