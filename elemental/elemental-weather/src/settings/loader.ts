import {LoggerFactory} from "common-tools";
import type {Settings, ConfigObject} from "/@/settings/types.ts";
import {Color} from "three";


export default class SettingsLoaders {

    private static logger = LoggerFactory.create("elemental-weather-setting-loader");

    private static configCache: Map<string, Settings> = new Map();

    /**
     * 加载指定季节的配置
     */
    static async loadSettings(season: string): Promise<Settings> {
        if (this.configCache.has(season)) {
            return this.configCache.get(season)!;
        }

        try {
            const path = `/@/settings/seasons/${season}.json`;
            const module = await import(/* @vite-ignore */ path);
            const rawData = module.default as Record<string, unknown>;

            const processedConfig = this.processConfig(rawData);
            this.configCache.set(season, processedConfig);

            this.logger.debug(`Loaded season config: ${season}`);
            return processedConfig;
        } catch (error) {
            this.logger.error(`Failed to load season config: ${season}`, error);
            throw error;
        }
    }

    /**
     * 批量加载所有季节配置
     */
    static async loadAllSeasons(seasons: string[]): Promise<Map<string, Settings>> {
        const configs = new Map<string, Settings>();

        for (const season of seasons) {
            try {
                const config = await this.loadSettings(season);
                configs.set(season, config);
            } catch (error) {
                this.logger.warn(`Skipping season ${season} due to load error`, error);
                throw error;
            }
        }

        return configs;
    }

    /**
     * 处理原始配置数据，转换为 Settings 类型
     */
    private static processConfig(rawData: Record<string, unknown>): Settings {
        const processed: Settings = {};

        for (const [componentName, componentData] of Object.entries(rawData)) {
            if (typeof componentData === 'object' && componentData !== null) {
                processed[componentName] = this.processComponent(componentData as Record<string, unknown>);
            }
        }

        return processed;
    }

    /**
     * 处理组件配置（按时间段分类）
     */
    private static processComponent(componentData: Record<string, unknown>): { day?: ConfigObject; night?: ConfigObject } {
        const result: { day?: ConfigObject; night?: ConfigObject } = {};

        for (const [timeOfDay, data] of Object.entries(componentData)) {
            if (typeof data === 'object' && data !== null && (timeOfDay === 'day' || timeOfDay === 'night')) {
                result[timeOfDay as 'day' | 'night'] = this.processValues(data as Record<string, unknown>);
            }
        }

        return result;
    }

    /**
     * 处理配置值，将数组转换为 Color 对象
     */
    private static processValues(data: Record<string, unknown>): ConfigObject {
        const result: ConfigObject = {};

        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value) && value.length === 3 && value.every(v => typeof v === 'number')) {
                // 处理 [r, g, b] 数组格式
                result[key] = new Color(value[0], value[1], value[2]);
            } else if (
                typeof value === 'object' && 
                value !== null && 
                'type' in value && 
                (value as { type: unknown }).type === 'color' &&
                'value' in value &&
                Array.isArray((value as { value: unknown }).value)
            ) {
                // 处理 { type: 'color', value: [r, g, b] } 格式
                const colorValue = (value as { value: number[] }).value;
                if (colorValue.length === 3 && colorValue.every(v => typeof v === 'number')) {
                    result[key] = new Color(colorValue[0], colorValue[1], colorValue[2]);
                } else {
                    // ✅ 修复：当颜色值格式不正确时，保持原值（需要类型断言）
                    result[key] = value as ConfigObject[keyof ConfigObject];
                }
            } else {
                // ✅ 其他情况直接赋值（数字、字符串等原始类型）
                result[key] = value as ConfigObject[keyof ConfigObject];
            }
        }

        return result;
    }

    /**
     * 清除配置缓存
     */
    static clearCache(): void {
        this.configCache.clear();
    }
    
}
