import {eventBus, LoggerFactory} from "common-tools";
import ColorInterpolator, {type ConfigObject} from "/@/utils/color";
import {datetimeManager} from "common-three";
import SeasonConfigManager from "/@/resources/loader";


export type EasingType = 'linear' | 'easeInOut' | 'smoothstep';


export interface ColorChangedData {
    component: string;
    config: ConfigObject | null | undefined;
    timeFactor: number;
    timestamp: number;
}

export default class ColorManager {

    private Logger = LoggerFactory.create("weather-color");

    private static instance: ColorManager | null = null;

    private seasonConfigManager: SeasonConfigManager;

    private cachedConfigs: Map<string, ConfigObject | null | undefined> = new Map();
    private autoUpdateEnabled: boolean = true;

    // 日出日落时间配置
    private readonly SUN_RISE_hour = 6;
    private readonly SUNSET_hour = 18;

    // 颜色插值过渡时间段
    private readonly DAY_FULL_START = 8;
    private readonly DAY_FULL_END = 16;
    private readonly NIGHT_FULL_START = 20;
    private readonly NIGHT_FULL_END = 4;

    constructor() {
        if (ColorManager.instance) {
            return ColorManager.instance;
        }
        ColorManager.instance = this;

        this.seasonConfigManager = SeasonConfigManager.getInstance();

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

    public getFallingLeavesColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.getComponentConfig('fallingLeaves', easing);
    }


    public getFireColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.getComponentConfig('fire', easing);
    }

    public getSkydomeColorConfig(easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        return this.getComponentConfig('skydome', easing);
    }

    public getComponentConfig(component: string, easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        const currentSeason = datetimeManager.getCurrentSeason();
        const cacheKey = `${currentSeason}_${component}_${easing}`;

        if (this.cachedConfigs.has(cacheKey)) {
            return this.cachedConfigs.get(cacheKey);
        }

        const seasonConfigs = this.seasonConfigManager.getSeasonConfig(currentSeason);
        if (!seasonConfigs) {
            this.Logger.warn(`No color configs found for season: ${currentSeason}`);

            if (!this.seasonConfigManager['isInitialized']) {
                this.Logger.warn(`SeasonConfig is not initialized yet. Config will be available after initialization.`);
            }

            return null;
        }

        const componentConfig = seasonConfigs[component];
        if (!componentConfig) {
            this.Logger.warn(`No config found for component: ${component} in season: ${currentSeason}`);
            return null;
        }

        const timeFactor = this.getColorInterpolationFactor(easing);
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
        const currentSeason = datetimeManager.getCurrentSeason();
        const seasonConfigs = this.seasonConfigManager.getSeasonConfig(currentSeason);
        if (!seasonConfigs) {
            this.Logger.warn(`No color configs found for season: ${currentSeason}`);
            return {};
        }

        const timeFactor = this.getColorInterpolationFactor(easing);
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

    /**
     * 应用缓动函数
     */
    applyEasing(linearFactor: number, easing: EasingType = 'smoothstep'): number {
        switch (easing) {
            case 'linear':
                return linearFactor;

            case 'easeInOut':
                return linearFactor < 0.5
                    ? 2 * linearFactor * linearFactor
                    : -1 + (4 - 2 * linearFactor) * linearFactor;

            case 'smoothstep':
                return linearFactor * linearFactor * (3 - 2 * linearFactor);

            default:
                return linearFactor;
        }
    }

    /**
     * 获取颜色插值因子 (0=完全白天, 1=完全夜晚)
     * 考虑晨昏平滑过渡
     *
     * 时间轴：
     * 0-4点:   深夜 (factor=1)
     * 4-6点:   黎明过渡 (1→0)
     * 6-8点:   清晨过渡 (1→0)
     * 8-16点:  完全白天 (factor=0)
     * 16-18点: 黄昏过渡 (0→1)
     * 18-20点: 傍晚过渡 (0→1)
     * 20-24点: 深夜 (factor=1)
     */
    getColorInterpolationFactor(easing: EasingType = 'smoothstep'): number {
        let linearFactor: number;

        const hour = datetimeManager.getHour();

        if (hour >= this.DAY_FULL_START && hour <= this.DAY_FULL_END) {
            linearFactor = 0; // 完全白天
        } else if (hour >= this.NIGHT_FULL_START || hour < this.NIGHT_FULL_END) {
            linearFactor = 1; // 完全夜晚
        } else if (hour >= this.SUN_RISE_hour && hour < this.DAY_FULL_START) {
            linearFactor = 1 - (hour - this.SUN_RISE_hour) / (this.DAY_FULL_START - this.SUN_RISE_hour);
        } else if (hour >= this.DAY_FULL_END && hour < this.SUNSET_hour) {
            linearFactor = (hour - this.DAY_FULL_END) / (this.SUNSET_hour - this.DAY_FULL_END);
        } else if (hour >= this.SUNSET_hour && hour < this.NIGHT_FULL_START) {
            linearFactor = (hour - this.SUNSET_hour) / (this.NIGHT_FULL_START - this.SUNSET_hour);
        } else {
            linearFactor = 1 - (hour - this.NIGHT_FULL_END) / (this.SUN_RISE_hour - this.NIGHT_FULL_END);
        }

        linearFactor = Math.max(0, Math.min(1, linearFactor));

        return this.applyEasing(linearFactor, easing);
    }
}
