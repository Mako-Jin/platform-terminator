import moment from 'moment';
import {LoggerFactory} from "common-shared";
import {eventBus} from "common-shared";
import {type TimeChangedEventData, WeatherEvents} from "/@/events/types";

export type EnvTime = 'day' | 'night';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type EasingType = 'linear' | 'easeInOut' | 'smoothstep';

export interface SunPosition {
    x: number;
    y: number;
    z: number;
}

export interface EnvTimeChangedData {
    envTime: EnvTime;
    previousEnvTime: EnvTime;
    hour: number;
    timeOfDay: TimeOfDay;
}

export interface HourChangedData {
    hour: number;
    previousHour: number;
    timeOfDay: TimeOfDay;
}

export default class TimeManager {

    private Logger = LoggerFactory.create("weather-time");

    private static instance: TimeManager | null = null;
    private useRealTime: boolean;
    private debugMode: boolean;
    private manualTime: moment.Moment | null;
    private realTime: moment.Moment;
    private hour: number;
    private minute: number;
    private timeOfDay: TimeOfDay = 'day';
    private envTime: EnvTime = 'day';

    // 日出日落时间配置
    private readonly SUN_RISE_hour = 6;
    private readonly SUNSET_hour = 18;
    private readonly DAWN_START = 5;
    private readonly DAWN_END = 7;
    private readonly DUSK_START = 17;
    private readonly DUSK_END = 19;

    // 颜色插值过渡时间段
    private readonly DAY_FULL_START = 8;
    private readonly DAY_FULL_END = 16;
    private readonly NIGHT_FULL_START = 20;
    private readonly NIGHT_FULL_END = 4;

    constructor(initialTime: moment.Moment | null = null, debugMode: boolean = false) {
        if (TimeManager.instance) {
            return TimeManager.instance;
        }
        TimeManager.instance = this;

        this.debugMode = debugMode;
        this.useRealTime = !debugMode;

        this.realTime = moment();

        this.manualTime = initialTime;

        this.hour = this.getLocalHour();
        this.minute = this.getLocalMinute();
        this.envTime = this.hourToDayNight(this.hour);

        this.resetToRealTime();
        eventBus.on(WeatherEvents.TIME_CHANGED, (data: TimeChangedEventData) => {
            this.updateTime(data.currentTime);
        });
    }

    public getLocalHour() {
        return this.realTime.hour();
    }

    public getLocalMinute() {
        return this.realTime.minute();
    }

    public hourToDayNight(hour: number) {
        return hour >= 6 && hour < 18 ? 'day' : 'night';
    }

    static getInstance() {
        if (!TimeManager.instance) {
            TimeManager.instance = new TimeManager();
        }
        return TimeManager.instance;
    }

    public get currentTime(): string {
        return this.realTime.format('YYYY-MM-DD HH:mm:ss');
    }

    public setCurrentTime(time: string): void {
        if (!this.debugMode) {
            this.Logger.warn('Only allowed in debug mode');
            return;
        }
        // 验证时间格式
        if (!moment(time, 'YYYY-MM-DD HH:mm:ss', true).isValid()) {
            this.Logger.warn(`Invalid time: ${time}. Expected HH:mm:ss`);
            return;
        }
        this.useRealTime = false;
        this.manualTime = moment(time);
        this.updateTime(time);
    }

    private updateTime(newValue: string): void {
        const oldValue = this.realTime;
        if (oldValue === moment(newValue)) {
            return;
        }
        this.realTime = moment(newValue);
        this.hour = this.realTime.hour();
        this.minute = this.realTime.minute();
        const data = {
            currentTime: newValue,
            previousTime: oldValue.format("YYYY-MM-DD HH:mm:ss"),
            timestamp: moment().format("YYYY-MM-DD HH:mm:ss")
        };
        eventBus.emit(WeatherEvents.TIME_CHANGED, data);
    }

    /**
     * 设置小时 (0-23.99)
     * @param hour - 小时数，可以是小数（如 14.5 表示 14:30）
     */
    setHour(hour: number): void {
        if (hour < 0 || hour >= 24) {
            this.Logger.warn(`Invalid hour value: ${hour}. Must be between 0 and 23.99`);
            return;
        }

        const oldHour = this.hour;
        const oldEnvTime = this.envTime;
        // const oldTimeOfDay = this.timeOfDay;

        this.hour = hour;
        this.minute = Math.round((hour % 1) * 60);
        this.envTime = this.calculateEnvTime(hour);
        this.timeOfDay = this.calculateTimeOfDay(hour);

        if (oldEnvTime !== this.envTime) {
            this.emitEnvTimeChanged(oldEnvTime);
        }

        if (Math.abs(oldHour - hour) > 0.001) {
            this.emitHourChanged(oldHour);
        }
    }

    /**
     * 发射环境时间变化事件
     */
    private emitEnvTimeChanged(previousEnvTime: EnvTime): void {
        const data: EnvTimeChangedData = {
            envTime: this.envTime,
            previousEnvTime,
            hour: this.hour,
            timeOfDay: this.timeOfDay,
        };

        eventBus.emit('environment:time:changed', data);
        this.Logger.debug(`Environment time changed: ${previousEnvTime} → ${this.envTime} at hour ${this.hour.toFixed(2)}`);
    }

    /**
     * 发射小时变化事件
     */
    private emitHourChanged(previousHour: number): void {
        const data: HourChangedData = {
            hour: this.hour,
            previousHour,
            timeOfDay: this.timeOfDay,
        };

        eventBus.emit('environment:hour:changed', data);
    }

    /**
     * 计算当前是白天还是夜晚
    */
    private calculateEnvTime(hour: number): EnvTime {
        return hour >= this.SUN_RISE_hour && hour < this.SUNSET_hour ? 'day' : 'night';
    }

    /**
     * 计算详细时段
     */
    private calculateTimeOfDay(hour: number): TimeOfDay {
        if (hour >= this.DAWN_START && hour < this.DAWN_END) {
            return 'dawn';
        }
        if (hour >= this.DAWN_END && hour < this.DUSK_START) {
            return 'day';
        }
        if (hour >= this.DUSK_START && hour < this.DUSK_END) {
            return 'dusk';
        }
        return 'night';
    }

    public resetToRealTime(): void {
        this.useRealTime = true;
        this.manualTime = null;
        this.updateTime(moment().format("YYYY-MM-DD HH:mm:ss"));
    }

    offChange(callback) {
        eventBus.off(WeatherEvents.TIME_CHANGED, callback);
        return this;
    }

    /**
     * 获取当前小时
     */
    public getHour(): number {
        return this.hour;
    }

    /**
     * 获取当前分钟
     */
    public getMinute(): number {
        return this.minute;
    }

    /**
     * 获取当前时间的小时数（包含分钟的小数部分）
     * 例如：14:30 返回 14.5
     */
    public getDecimalHour(): number {
        return this.hour + this.minute / 60;
    }

    /**
     * 获取当前环境时间（白天/夜晚）
     */
    public getEnvTime(): EnvTime {
        return this.envTime;
    }

    /**
     * 获取时段类型
     */
    public getTimeOfDay(): TimeOfDay {
        return this.timeOfDay;
    }

    // ==================== 时间判断方法 ====================

    /**
     * 判断是否是白天
     */
    public isDay(): boolean {
        return this.envTime === 'day';
    }

    /**
     * 判断是否是夜晚
     */
    public isNight(): boolean {
        return this.envTime === 'night';
    }

    /**
     * 判断是否是黎明
     */
    isDawn(): boolean {
        return this.timeOfDay === 'dawn';
    }

    /**
     * 判断是否是黄昏
     */
    isDusk(): boolean {
        return this.timeOfDay === 'dusk';
    }

    // ==================== 渐变计算方法 ====================

    /**
     * 获取一天中的进度 (0-1)
     * 0 = 日出时刻, 1 = 日落时刻
     */
    public getDayProgress(): number {
        if (this.hour < this.SUN_RISE_hour || this.hour >= this.SUNSET_hour) {
            return 0;
        }

        return (this.getDecimalHour() - this.SUN_RISE_hour) / (this.SUNSET_hour - this.SUN_RISE_hour);
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

        if (this.hour >= this.DAY_FULL_START && this.hour <= this.DAY_FULL_END) {
            linearFactor = 0; // 完全白天
        } else if (this.hour >= this.NIGHT_FULL_START || this.hour < this.NIGHT_FULL_END) {
            linearFactor = 1; // 完全夜晚
        } else if (this.hour >= this.SUN_RISE_hour && this.hour < this.DAY_FULL_START) {
            linearFactor = 1 - (this.hour - this.SUN_RISE_hour) / (this.DAY_FULL_START - this.SUN_RISE_hour);
        } else if (this.hour >= this.DAY_FULL_END && this.hour < this.SUNSET_hour) {
            linearFactor = (this.hour - this.DAY_FULL_END) / (this.SUNSET_hour - this.DAY_FULL_END);
        } else if (this.hour >= this.SUNSET_hour && this.hour < this.NIGHT_FULL_START) {
            linearFactor = (this.hour - this.SUNSET_hour) / (this.NIGHT_FULL_START - this.SUNSET_hour);
        } else {
            linearFactor = 1 - (this.hour - this.NIGHT_FULL_END) / (this.SUN_RISE_hour - this.NIGHT_FULL_END);
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

    /**
     * 获取太阳位置
     * 基于24小时制计算太阳在天空中的位置
     */
    public getSunPosition(): SunPosition {
        const sunrise = this.SUN_RISE_hour;
        const sunset = this.SUNSET_hour;
        // const noon = (sunrise + sunset) / 2;
        const decimalHour = this.getDecimalHour();
        if (decimalHour >= sunrise && decimalHour <= sunset) {
            const dayProgress = (this.hour - sunrise) / (sunset - sunrise);
            const angle = dayProgress * Math.PI;

            return {
                x: Math.cos(angle) * 15,
                y: Math.sin(angle) * 15,
                z: 8,
            };
        } else {
            const adjustedHour = this.hour < sunrise ? this.hour + 24 : this.hour;
            const nightTotal = 24 - sunset + sunrise;
            const nightProgress = (adjustedHour - sunset) / nightTotal;
            const angle = nightProgress * Math.PI;

            return {
                x: Math.cos(angle) * -10,
                y: Math.sin(angle) * 15,
                z: 5,
            };
        }
    }

    /**
     * 获取月亮位置（夜晚时）
     */
    public getMoonPosition(): SunPosition | null {
        if (this.isDay()) {
            return null;
        }

        const sunrise = this.SUN_RISE_hour;
        const sunset = this.SUNSET_hour;
        const adjustedHour = this.hour < sunrise ? this.hour + 24 : this.hour;
        const nightTotal = 24 - sunset + sunrise;
        const nightProgress = (adjustedHour - sunset) / nightTotal;
        const angle = nightProgress * Math.PI;

        return {
            x: Math.cos(angle) * -10,
            y: Math.sin(angle) * 12,
            z: -5,
        };
    }

    /**
     * 获取光照强度系数 (0-1)
     * 用于调整环境光强度
     */
    public getLightIntensity(): number {
        const factor = this.getColorInterpolationFactor('smoothstep');
        return 1 - factor * 0.7; // 夜晚保留30%的基础光照
    }

    // ==================== 事件监听 ====================

    /**
     * 监听环境时间变化
     */
    onEnvTimeChange(callback: (newTime: EnvTime, oldTime: EnvTime, data: EnvTimeChangedData) => void): void {
        eventBus.on('environment:time:changed', callback);
    }

    /**
     * 监听小时变化
     */
    onHourChange(callback: (newHour: number, oldHour: number, data: HourChangedData) => void): void {
        eventBus.on('environment:hour:changed', callback);
    }

    /**
     * 取消监听环境时间变化
     */
    offEnvTimeChange(callback?: Function): void {
        eventBus.off('environment:time:changed', callback as any);
    }

    /**
     * 取消监听小时变化
     */
    offHourChange(callback?: Function): void {
        eventBus.off('environment:hour:changed', callback as any);
    }

}
