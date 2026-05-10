import {LoggerFactory} from "common-tools";
import type {ConfigObject, Settings} from "/@/settings/types.ts";
import SettingsLoaders from "/@/settings/loader.ts";
import {AVAILABLE_SEASONS, datetimeManager} from "common-three";
import ColorInterpolator from "/@/settings/utils.ts";


export type EasingType = 'linear' | 'easeInOut' | 'smoothstep';


export default class SettingsManager {

    private logger = LoggerFactory.create("elemental-weather-settings-manager");

    private static instance: SettingsManager | null = null;

    private seasonConfigs: Map<string, Settings> = new Map();

    private isInitialized: boolean = false;

    private initPromise: Promise<void> | null = null;

    // 日出日落时间配置
    private readonly SUN_RISE_hour = 6;
    private readonly SUNSET_hour = 18;

    // 颜色插值过渡时间段
    private readonly DAY_FULL_START = 8;
    private readonly DAY_FULL_END = 16;
    private readonly NIGHT_FULL_START = 20;
    private readonly NIGHT_FULL_END = 4;


    constructor() {
        if (SettingsManager.instance) {
            return SettingsManager.instance;
        }
        SettingsManager.instance = this;

        this.initPromise = this.initialize();
    }

    static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        try {
            this.logger.info('Loading season configurations...');
            this.seasonConfigs = await SettingsLoaders.loadAllSeasons(AVAILABLE_SEASONS);
            this.isInitialized = true;
            this.logger.info(`Successfully loaded ${this.seasonConfigs.size} season configurations`);
        } catch (error) {
            this.logger.error('Failed to initialize season configurations', error);
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

    getSeasonConfig(season?: string): Settings | undefined {
        const targetSeason = season || datetimeManager.getCurrentSeason();

        if (!this.isInitialized) {
            this.logger.warn(`Season Config not initialized yet, returning undefined for season: ${targetSeason}`);
            return undefined;
        }

        return this.seasonConfigs.get(targetSeason);
    }

    public getComponentConfig(component: string, easing: EasingType = 'smoothstep'): ConfigObject | null | undefined {
        const currentSeason = datetimeManager.getCurrentSeason();
        const seasonConfigs = this.getSeasonConfig(currentSeason);
        if (!seasonConfigs) {
            this.logger.warn(`No color configs found for season: ${currentSeason}`);

            if (!this.isInitialized) {
                this.logger.warn(`SeasonConfig is not initialized yet. Config will be available after initialization.`);
            }

            return null;
        }

        const componentConfig = seasonConfigs[component];
        if (!componentConfig) {
            this.logger.warn(`No config found for component: ${component} in season: ${currentSeason}`);
            return null;
        }

        const timeFactor = this.getColorInterpolationFactor(easing);
        return ColorInterpolator.interpolateConfig(
            componentConfig.day,
            componentConfig.night,
            timeFactor
        );
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

}
