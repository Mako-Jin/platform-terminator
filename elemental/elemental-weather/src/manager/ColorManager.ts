import {LoggerFactory} from "common-shared";
import {eventBus} from "common-shared";
import ColorInterpolator, {type ConfigObject} from "/@/utils/color";
import TimeManager, {type EasingType} from "/@/manager/TimeManager";
import SeasonManager from "/@/manager/SeasonManager.ts";


export interface ColorChangedData {
    component: string;
    config: ConfigObject | null | undefined;
    timeFactor: number;
    timestamp: number;
}

export default class ColorManager {

    private Logger = LoggerFactory.create("weather-color");

    private static instance: ColorManager | null = null;

    private timeManager: TimeManager;
    private seasonManager: SeasonManager;

    private cachedConfigs: Map<string, ConfigObject | null | undefined> = new Map();
    private autoUpdateEnabled: boolean = true;

    constructor() {
        if (ColorManager.instance) {
            return ColorManager.instance;
        }
        ColorManager.instance = this;

        this.timeManager = TimeManager.getInstance();
        this.seasonManager = SeasonManager.getInstance();

        this.setupAutoUpdate();
    }

    static getInstance(): ColorManager {
        if (!ColorManager.instance) {
            ColorManager.instance = new ColorManager();
        }
        return ColorManager.instance;
    }

    private setupAutoUpdate(): void {
        eventBus.on('environment:time:changed', () => {
            if (this.autoUpdateEnabled) {
                this.invalidateCache();
            }
        });

        eventBus.on('environment:hour:changed', () => {
            if (this.autoUpdateEnabled) {
                this.invalidateCache();
            }
        });
    }

    private invalidateCache(): void {
        this.cachedConfigs.clear();
    }

    public getGroundColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.getComponentConfig('ground', easing);
    }

    public getLightingConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.getComponentConfig('lighting', easing);
    }

    public getGrassColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.getComponentConfig('grass', easing);
    }

    public getBushColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.getComponentConfig('bush', easing);
    }

    public getRocksColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.getComponentConfig('rocks', easing);
    }

    public getFireColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.getComponentConfig('fire', easing);
    }

    public getComponentConfig(component: string, easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        const currentSeason = this.seasonManager.season;
        const cacheKey = `${currentSeason}_${component}_${easing}`;

        if (this.cachedConfigs.has(cacheKey)) {
            return this.cachedConfigs.get(cacheKey);
        }

        const seasonConfigs = this.seasonManager.getSeasonConfig(currentSeason);
        if (!seasonConfigs) {
            this.Logger.warn(`No color configs found for season: ${currentSeason}`);
            
            if (!this.seasonManager['isInitialized']) {
                this.Logger.warn(`SeasonManager is not initialized yet. Config will be available after initialization.`);
            }
            
            return null;
        }

        const componentConfig = seasonConfigs[component];
        if (!componentConfig) {
            this.Logger.warn(`No config found for component: ${component} in season: ${currentSeason}`);
            return null;
        }

        const timeFactor = this.timeManager.getColorInterpolationFactor(easing);
        const interpolated = ColorInterpolator.interpolateConfig(
            componentConfig.day,
            componentConfig.night,
            timeFactor
        );

        this.cachedConfigs.set(cacheKey, interpolated);

        this.emitColorChanged(component, interpolated, timeFactor);

        return interpolated;
    }

    public getAllConfigs(easing: EasingType = 'smoothstep'): Record<string, ConfigObject | null | undefined> {
        const currentSeason = this.seasonManager.season;
        const seasonConfigs = this.seasonManager.getSeasonConfig(currentSeason);
        if (!seasonConfigs) {
            this.Logger.warn(`No color configs found for season: ${currentSeason}`);
            return {};
        }

        const timeFactor = this.timeManager.getColorInterpolationFactor(easing);
        return ColorInterpolator.batchInterpolate(seasonConfigs, timeFactor);
    }

    private emitColorChanged(component: string, config: ConfigObject | null | undefined, timeFactor: number): void {
        const data: ColorChangedData = {
            component,
            config,
            timeFactor,
            timestamp: Date.now(),
        };

        eventBus.emit('environment:color:changed', data);
    }

    public onColorChange(callback: (data: ColorChangedData) => void): void {
        eventBus.on('environment:color:changed', callback);
    }

    public offColorChange(callback?: Function): void {
        eventBus.off('environment:color:changed', callback as any);
    }

    public setAutoUpdate(enabled: boolean): void {
        this.autoUpdateEnabled = enabled;
        if (enabled) {
            this.invalidateCache();
        }
    }

    public forceUpdate(): void {
        this.invalidateCache();
        this.Logger.debug('Force updated all color configs');
    }

    public reset(): void {
        this.cachedConfigs.clear();
        this.Logger.debug('ColorManager reset');
    }
}