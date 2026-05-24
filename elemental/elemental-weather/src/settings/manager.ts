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
     * 时间轴:
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
        const minutes = datetimeManager.getMinute();
        const decimalHour = hour + minutes / 60; // ✅ 关键修复:使用小数小时提高精度

        if (decimalHour >= this.DAY_FULL_START && decimalHour <= this.DAY_FULL_END) {
            linearFactor = 0; // 完全白天
        } else if (decimalHour >= this.NIGHT_FULL_START || decimalHour < this.NIGHT_FULL_END) {
            linearFactor = 1; // 完全夜晚
        } else if (decimalHour >= this.SUN_RISE_hour && decimalHour < this.DAY_FULL_START) {
            // ✅ 关键修复:黎明过渡更平滑
            const transitionRange = this.DAY_FULL_START - this.SUN_RISE_hour;
            linearFactor = 1 - ((decimalHour - this.SUN_RISE_hour) / transitionRange);
        } else if (decimalHour >= this.DAY_FULL_END && decimalHour < this.SUNSET_hour) {
            // ✅ 关键修复:黄昏过渡更平滑
            const transitionRange = this.SUNSET_hour - this.DAY_FULL_END;
            linearFactor = (decimalHour - this.DAY_FULL_END) / transitionRange;
        } else if (decimalHour >= this.SUNSET_hour && decimalHour < this.NIGHT_FULL_START) {
            // ✅ 关键修复:夜晚过渡更平滑
            const transitionRange = this.NIGHT_FULL_START - this.SUNSET_hour;
            linearFactor = (decimalHour - this.SUNSET_hour) / transitionRange;
        } else {
            // ✅ 关键修复:凌晨过渡更平滑
            const transitionRange = this.SUN_RISE_hour - this.NIGHT_FULL_END;
            linearFactor = 1 - ((decimalHour - this.NIGHT_FULL_END) / transitionRange);
        }

        linearFactor = Math.max(0, Math.min(1, linearFactor));

        // ✅ 关键修复:默认使用easeInOut而非smoothstep,过渡更自然
        const finalEasing = easing === 'smoothstep' ? 'easeInOut' : easing;
        return this.applyEasing(linearFactor, finalEasing);
    }

    /**
     * 应用缓动函数
     */
    applyEasing(linearFactor: number, easing: EasingType = 'easeInOut'): number {
        switch (easing) {
            case 'linear':
                return linearFactor;

            case 'easeInOut':
                return linearFactor < 0.5
                    ? 2 * linearFactor * linearFactor
                    : 1 - Math.pow(-2 * linearFactor + 2, 2) / 2;

            case 'smoothstep':
                return linearFactor * linearFactor * (3 - 2 * linearFactor);

            default:
                return linearFactor;
        }
    }

    clearCache(): void {
        this.seasonConfigs.clear();
        this.isInitialized = false;
        SettingsLoaders.clearCache();
    }

}
