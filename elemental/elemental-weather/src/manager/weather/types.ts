
/**
 * 天气类型
 */
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';

/**
 * 可用天气列表
 */
export const AVAILABLE_WEATHERS: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'foggy'];

/**
 * 天气显示名称映射
 */
export const WEATHER_DISPLAY_NAMES: Record<WeatherType, string> = {
    sunny: 'Sunny',
    cloudy: 'Cloudy',
    rainy: 'Rainy',
    snowy: 'Snowy',
    foggy: 'Foggy',
} as Record<WeatherType, string>;

/**
 * 天气图标映射
 */
export const WEATHER_ICONS: Record<WeatherType, string> = {
    sunny: 'fas fa-sun',
    cloudy: 'fas fa-cloud',
    rainy: 'fas fa-cloud-rain',
    snowy: 'fas fa-snowflake',
    foggy: 'fas fa-smog',
} as Record<WeatherType, string>;

/**
 * 天气变化事件数据
 */
export interface WeatherChangedData {
    /** 当前天气 */
    currentWeather: WeatherType;
    /** 前一天气 */
    previousWeather: WeatherType;
    /** 时间戳 */
    timestamp: number;
}
