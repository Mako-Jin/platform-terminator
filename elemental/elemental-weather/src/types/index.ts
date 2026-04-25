// 天气状态枚举
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'thunder';
export type TimeOfDay = 'day' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// 气象局 API 响应
export interface WeatherData {
    temperature: number;
    humidity: number;
    weatherType: WeatherType;
    windSpeed: number;
    visibility: number;
    timestamp: number;
}

// 场景配置接口
export interface SceneConfig {
    enabled: boolean;
    weatherType: WeatherType;
    timeOfDay: TimeOfDay;
    season: Season;
    quality: 'low' | 'medium' | 'high';
    audioEnabled: boolean;
}

// 乾坤通信事件
export interface MicroAppEvent {
    type: 'SCENE_CONFIG_CHANGE' | 'WEATHER_UPDATE' | 'PERFORMANCE_REPORT';
    payload: any;
}
