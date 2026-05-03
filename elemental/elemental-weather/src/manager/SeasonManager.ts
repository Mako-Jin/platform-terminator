import {LoggerFactory} from "common-tools";
import {eventBus} from "common-tools";
import * as THREE from 'three';
import {type ConfigObject} from "/@/utils/color";

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

export interface SeasonChangedData {
    season: string;
    previousSeason: string;
    timestamp: number;
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
            const module = await import(path);
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
                result[key] = new THREE.Color(value[0], value[1], value[2]);
            } else if (typeof value === 'object' && value !== null && value.type === 'color') {
                result[key] = new THREE.Color(
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

export default class SeasonManager {

    private Logger = LoggerFactory.create("weather-season");

    private static instance: SeasonManager | null = null;

    private currentSeason: string;

    private availableSeasons: string[];

    private seasonConfigs: Map<string, SeasonColorConfigs> = new Map();

    private isInitialized: boolean = false;

    private initPromise: Promise<void> | null = null;

    constructor(initialSeason = 'spring') {
        if (SeasonManager.instance) {
            return SeasonManager.instance;
        }
        SeasonManager.instance = this;

        this.currentSeason = initialSeason;
        this.availableSeasons = ['spring', 'winter', 'autumn', 'rainy'];

        this.initPromise = this.initialize();
    }

    static getInstance(): SeasonManager {
        if (!SeasonManager.instance) {
            SeasonManager.instance = new SeasonManager();
        }
        return SeasonManager.instance;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            this.Logger.info('Loading season configurations...');
            this.seasonConfigs = await SeasonConfigLoader.loadAllSeasons(this.availableSeasons);
            this.isInitialized = true;
            this.Logger.info(`Successfully loaded ${this.seasonConfigs.size} season configurations`);
        } catch (error) {
            this.Logger.error('Failed to initialize season configurations', error);
            throw error;
        }
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

    get season(): string {
        return this.currentSeason;
    }

    set season(value: string) {
        if (!this.availableSeasons.includes(value)) {
            this.Logger.warn(`Invalid season value: ${value}. Must be one of:`, this.availableSeasons);
            return;
        }

        const oldValue = this.currentSeason;

        if (oldValue === value) {
            return;
        }

        this.currentSeason = value;
        this.emitSeasonChanged(oldValue);
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

    toggle(): void {
        const currentIndex = this.availableSeasons.indexOf(this.currentSeason);
        const nextIndex = (currentIndex + 1) % this.availableSeasons.length;
        this.season = this.availableSeasons[nextIndex];
    }

    setSeason(season: string): void {
        this.season = season;
    }

    getAvailableSeasons(): string[] {
        return [...this.availableSeasons];
    }

    getSeasonConfig(season?: string): SeasonColorConfigs | undefined {
        const targetSeason = season || this.currentSeason;
        
        if (!this.isInitialized) {
            this.Logger.warn(`SeasonManager not initialized yet, returning undefined for season: ${targetSeason}`);
            return undefined;
        }
        
        return this.seasonConfigs.get(targetSeason);
    }

    registerSeasonConfigs(season: string, configs: SeasonColorConfigs): void {
        this.seasonConfigs.set(season, configs);
        this.Logger.debug(`Registered custom color configs for season: ${season}`);
    }

    onSeasonChange(callback: (data: SeasonChangedData) => void): void {
        eventBus.on('environment:season:changed', callback);
    }

    offSeasonChange(callback?: Function): void {
        eventBus.off('environment:season:changed', callback as any);
    }

    reset(): void {
        this.currentSeason = 'spring';
        this.Logger.debug('SeasonManager reset to spring');
    }
}
