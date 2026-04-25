// packages/platform-weather/src/index.ts

// 导出组件
export { WeatherBackground } from './components/WeatherBackground';
export { WeatherWidget } from './components/WeatherWidget';
export { WeatherSettings } from './components/WeatherSettings';

// 导出 Hooks
export { useWeather } from './hooks/useWeather';
export { useWeatherSettings } from './hooks/useWeatherSettings';

// 导出服务
export { WeatherService } from './services/WeatherService';
export { WeatherRenderer } from './services/WeatherRenderer';

// 导出 Store
export { weatherStore, useWeatherStore } from './store/weatherStore';

// 导出类型
export type {
    WeatherData,
    WeatherCondition,
    WeatherConfig,
    WeatherSettings as WeatherSettingsType
} from './types';

// 导出工具函数
export { loadWeatherSystem, isWeatherSupported } from './utils/loader';

// 默认导出微应用生命周期
export async function bootstrap() {
    console.log('[Weather App] bootstrap');
}

export async function mount(props: any) {
    console.log('[Weather App] mount', props);
}

export async function unmount() {
    console.log('[Weather App] unmount');
}