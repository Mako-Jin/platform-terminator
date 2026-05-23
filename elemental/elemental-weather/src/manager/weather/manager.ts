import {eventBus, LoggerFactory} from "common-tools";
import type {WeatherChangedData, WeatherType} from "./types";
import {WEATHER_DISPLAY_NAMES} from "./types";

/**
 * 天气管理器（单例）
 * 负责管理天气状态和天气切换
 */
export class WeatherManager {

    private static instance: WeatherManager | null = null;
    private logger = LoggerFactory.create('elemental-weather-manager');

    private currentWeather: WeatherType = 'sunny';
    private weatherListeners: Set<(data: WeatherChangedData) => void> = new Set();

    // 事件名称常量
    public static readonly WEATHER_CHANGED = 'elemental-weather:weather:changed';

    private constructor() {
        this.logger.info('WeatherManager initialized');
    }

    /**
     * 获取单例实例
     */
    static getInstance(): WeatherManager {
        if (!WeatherManager.instance) {
            WeatherManager.instance = new WeatherManager();
        }
        return WeatherManager.instance;
    }

    /**
     * 设置当前天气
     *
     * @param weather 天气类型
     */
    setWeather(weather: WeatherType): void {
        // ✅ 非 Debug 模式下禁止手动设置
        // if (!isDebugMode()) {
        //     this.logger.warn('Manual season override is only available in Debug mode');
        //     return;
        // }

        if (weather === this.currentWeather) {
            this.logger.debug(`Weather is already ${weather}, skipping`);
            return;
        }

        const previousWeather = this.currentWeather;
        this.currentWeather = weather;

        this.logger.info(`Weather changed: ${WEATHER_DISPLAY_NAMES[previousWeather]} → ${WEATHER_DISPLAY_NAMES[weather]}`);

        // 触发天气变化事件
        this.emitWeatherChangeEvent(previousWeather, weather);
    }

    /**
     * 获取当前天气
     */
    getCurrentWeather(): WeatherType {
        return this.currentWeather;
    }

    /**
     * 添加天气变化监听器
     *
     * @param callback 回调函数
     */
    onWeatherChanged(callback: (data: WeatherChangedData) => void): void {
        this.weatherListeners.add(callback);
        this.logger.debug(`Added weather changed listener, total: ${this.weatherListeners.size}`);
    }

    /**
     * 移除天气变化监听器
     *
     * @param callback 回调函数
     */
    offWeatherChanged(callback: (data: WeatherChangedData) => void): void {
        this.weatherListeners.delete(callback);
        this.logger.debug(`Removed weather changed listener, total: ${this.weatherListeners.size}`);
    }

    /**
     * 清空所有监听器
     */
    clearListeners(): void {
        this.weatherListeners.clear();
        this.logger.info('Cleared all weather listeners');
    }

    /**
     * 创建天气变化数据对象
     */
    private createWeatherChangeData(
        previousWeather: WeatherType,
        currentWeather: WeatherType
    ): WeatherChangedData {
        return {
            currentWeather,
            previousWeather,
            timestamp: Date.now(),
        };
    }

    /**
     * 发送天气变化事件
     */
    private emitWeatherChangeEvent(
        previousWeather: WeatherType,
        currentWeather: WeatherType
    ): void {
        const weatherData = this.createWeatherChangeData(previousWeather, currentWeather);

        // 触发全局事件
        eventBus.emit(WeatherManager.WEATHER_CHANGED, weatherData);

        // 触发本地监听器
        this.weatherListeners.forEach(callback => {
            try {
                callback(weatherData);
            } catch (error) {
                this.logger.error('Error in weather changed listener:', error);
            }
        });
    }

    /**
     * 销毁天气管理器
     */
    dispose(): void {
        this.clearListeners();
        this.logger.info('WeatherManager disposed');
    }
}

// 导出单例实例
export const weatherManager = WeatherManager.getInstance();

export default WeatherManager;
