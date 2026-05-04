import {eventBus, LoggerFactory} from "common-tools";
import type {TimeChangedData, DateChangedData, FestivalConfig} from "./types";

/**
 * 时间管理器（单例）
 * 负责管理时间、日期、节日检测
 */
export class DateTimeManager {

    private static instance: DateTimeManager | null = null;
    private logger = LoggerFactory.create('time-manager');

    private currentTime: Date;
    private previousDate: string | null = null;
    private updateInterval: number | null = null;
    private isRunning: boolean = false;
    private timeListeners: Set<(data: TimeChangedData) => void> = new Set();
    private dateListeners: Set<(data: DateChangedData) => void> = new Set();

    // 节日配置列表
    private festivals: Map<string, FestivalConfig> = new Map();

    // 星期名称映射
    private static readonly WEEKDAY_NAMES = [
        '星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'
    ];

    // 事件名称常量
    public static readonly TIME_CHANGED = 'common-three:time:changed';
    public static readonly DATE_CHANGED = 'common-three:date:changed';
    public static readonly FESTIVAL_DETECTED = 'common-three:festival:detected';

    private constructor() {
        this.currentTime = new Date();
        this.previousDate = this.getDateKey(this.currentTime);
        this.loadDefaultFestivals();
    }

    /**
     * 获取单例实例
     */
    static getInstance(): DateTimeManager {
        if (!DateTimeManager.instance) {
            DateTimeManager.instance = new DateTimeManager();
        }
        return DateTimeManager.instance;
    }

    /**
     * 启动时间更新
     *
     * @param intervalMs 更新间隔（毫秒），默认 60000（1分钟）
     */
    start(intervalMs: number = 60000): void {
        if (this.isRunning) {
            this.logger.warn('Time manager is already running');
            return;
        }

        this.isRunning = true;
        this.updateInterval = window.setInterval(() => {
            this.tick();
        }, intervalMs);

        this.logger.info(`Time manager started with interval ${intervalMs}ms`);

        // 立即触发一次更新
        this.tick();
    }

    /**
     * 停止时间更新
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.isRunning = false;
        this.logger.info('Time manager stopped');
    }

    /**
     * 获取当前时间
     */
    getCurrentTime(): Date {
        return new Date(this.currentTime);
    }

    /**
     * 获取格式化时间字符串
     *
     * @param format 格式模板，默认 'YYYY-MM-DD HH:mm:ss'
     */
    getFormattedTime(format: string = 'YYYY-MM-DD HH:mm:ss'): string {
        return this.formatDateTime(this.currentTime, format);
    }

    /**
     * 获取当前小时
     */
    getHour(): number {
        return this.currentTime.getHours();
    }

    /**
     * 获取当前分钟
     */
    getMinute(): number {
        return this.currentTime.getMinutes();
    }

    /**
     * 获取当前秒数
     */
    getSecond(): number {
        return this.currentTime.getSeconds();
    }

    /**
     * 获取当前年份
     */
    getYear(): number {
        return this.currentTime.getFullYear();
    }

    /**
     * 获取当前月份 (1-12)
     */
    getMonth(): number {
        return this.currentTime.getMonth() + 1;
    }

    /**
     * 获取当前日期 (1-31)
     */
    getDay(): number {
        return this.currentTime.getDate();
    }

    /**
     * 获取星期几 (0-6)
     */
    getWeekday(): number {
        return this.currentTime.getDay();
    }

    /**
     * 获取星期几名称
     */
    getWeekdayName(): string {
        return DateTimeManager.WEEKDAY_NAMES[this.getWeekday()];
    }

    /**
     * 判断是否是白天（6:00 - 18:00）
     */
    isDaytime(): boolean {
        const hour = this.getHour();
        return hour >= 6 && hour < 18;
    }

    /**
     * 判断是否是夜晚
     */
    isNighttime(): boolean {
        return !this.isDaytime();
    }

    /**
     * 检查今天是否是节日
     */
    isFestival(): boolean {
        const key = `${this.getMonth()}-${this.getDay()}`;
        return this.festivals.has(key);
    }

    /**
     * 获取今天的节日信息
     */
    getTodayFestival(): FestivalConfig | undefined {
        const key = `${this.getMonth()}-${this.getDay()}`;
        return this.festivals.get(key);
    }

    /**
     * 添加节日配置
     *
     * @param config 节日配置
     */
    addFestival(config: FestivalConfig): void {
        const key = `${config.month}-${config.day}`;
        this.festivals.set(key, config);
        this.logger.info(`Added festival: ${config.name}`);
    }

    /**
     * 批量添加节日配置
     *
     * @param configs 节日配置列表
     */
    addFestivals(configs: FestivalConfig[]): void {
        configs.forEach(config => this.addFestival(config));
        this.logger.info(`Added ${configs.length} festivals`);
    }

    /**
     * 移除节日配置
     *
     * @param key 节日键值
     */
    removeFestival(key: string): void {
        this.festivals.delete(key);
        this.logger.info(`Removed festival: ${key}`);
    }

    /**
     * 获取所有节日配置
     */
    getAllFestivals(): Map<string, FestivalConfig> {
        return new Map(this.festivals);
    }

    /**
     * 添加时间变化监听器
     *
     * @param callback 回调函数
     */
    onTimeChanged(callback: (data: TimeChangedData) => void): void {
        this.timeListeners.add(callback);
        this.logger.debug(`Added time changed listener, total: ${this.timeListeners.size}`);
    }

    /**
     * 移除时间变化监听器
     *
     * @param callback 回调函数
     */
    offTimeChanged(callback: (data: TimeChangedData) => void): void {
        this.timeListeners.delete(callback);
        this.logger.debug(`Removed time changed listener, total: ${this.timeListeners.size}`);
    }

    /**
     * 添加日期变化监听器
     *
     * @param callback 回调函数
     */
    onDateChanged(callback: (data: DateChangedData) => void): void {
        this.dateListeners.add(callback);
        this.logger.debug(`Added date changed listener, total: ${this.dateListeners.size}`);
    }

    /**
     * 移除日期变化监听器
     *
     * @param callback 回调函数
     */
    offDateChanged(callback: (data: DateChangedData) => void): void {
        this.dateListeners.delete(callback);
        this.logger.debug(`Removed date changed listener, total: ${this.dateListeners.size}`);
    }

    /**
     * 清空所有监听器
     */
    clearListeners(): void {
        this.timeListeners.clear();
        this.dateListeners.clear();
        this.logger.info('Cleared all listeners');
    }

    /**
     * 时间滴答（内部方法）
     */
    private tick(): void {
        const previousTime = new Date(this.currentTime);
        this.currentTime = new Date();

        // 1. 触发时间变化事件（每分钟）
        const timeData: TimeChangedData = {
            currentTime: this.formatDateTime(this.currentTime, 'YYYY-MM-DD HH:mm:ss'),
            previousTime: this.formatDateTime(previousTime, 'YYYY-MM-DD HH:mm:ss'),
            hour: this.currentTime.getHours(),
            minute: this.currentTime.getMinutes(),
            second: this.currentTime.getSeconds(),
            timestamp: this.currentTime.getTime(),
        };

        eventBus.emit(DateTimeManager.TIME_CHANGED, timeData);
        this.timeListeners.forEach(callback => {
            try {
                callback(timeData);
            } catch (error) {
                this.logger.error('Error in time changed listener:', error);
            }
        });

        // 2. 检查日期是否变化（每天午夜）
        const currentDateKey = this.getDateKey(this.currentTime);
        if (currentDateKey !== this.previousDate) {
            this.handleDateChange(previousTime);
            this.previousDate = currentDateKey;
        }

        this.logger.debug(`Time updated: ${timeData.currentTime}`);
    }

    /**
     * 处理日期变化
     */
    private handleDateChange(previousTime: Date): void {
        const festival = this.getTodayFestival();

        const dateData: DateChangedData = {
            currentDate: this.formatDateTime(this.currentTime, 'YYYY-MM-DD'),
            previousDate: this.formatDateTime(previousTime, 'YYYY-MM-DD'),
            year: this.currentTime.getFullYear(),
            month: this.currentTime.getMonth() + 1,
            day: this.currentTime.getDate(),
            weekday: this.currentTime.getDay(),
            weekdayName: DateTimeManager.WEEKDAY_NAMES[this.currentTime.getDay()],
            timestamp: this.currentTime.getTime(),
            isFestival: !!festival,
            festivalName: festival?.name,
            isImportant: false,
        };

        // 触发全局事件
        eventBus.emit(DateTimeManager.DATE_CHANGED, dateData);

        // 如果是节日，触发节日事件
        if (festival) {
            eventBus.emit(DateTimeManager.FESTIVAL_DETECTED, {
                ...dateData,
                festival,
            });
            this.logger.info(`🎉 Festival detected: ${festival.name}`);
        }

        // 触发本地监听器
        this.dateListeners.forEach(callback => {
            try {
                callback(dateData);
            } catch (error) {
                this.logger.error('Error in date changed listener:', error);
            }
        });

        this.logger.info(`Date changed: ${dateData.currentDate} (${dateData.weekdayName})`);
    }

    /**
     * 获取日期键值
     */
    private getDateKey(date: Date): string {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}-${month}-${day}`;
    }

    /**
     * 加载默认节日配置
     */
    private loadDefaultFestivals(): void {
        const defaultFestivals: FestivalConfig[] = [
            { name: '元旦', month: 1, day: 1, recurring: true, description: '新年第一天' },
            { name: '情人节', month: 2, day: 14, recurring: true, description: '浪漫的日子' },
            { name: '劳动节', month: 5, day: 1, recurring: true, description: '国际劳动节' },
            { name: '儿童节', month: 6, day: 1, recurring: true, description: '孩子们的节日' },
            { name: '国庆节', month: 10, day: 1, recurring: true, description: '中华人民共和国成立纪念日' },
            { name: '圣诞节', month: 12, day: 25, recurring: true, description: '西方传统节日' },
        ];

        this.addFestivals(defaultFestivals);
        this.logger.info('Loaded default festivals');
    }

    /**
     * 格式化日期时间
     */
    private formatDateTime(date: Date, format: string): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', String(year))
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * 销毁时间管理器
     */
    dispose(): void {
        this.stop();
        this.clearListeners();
        this.festivals.clear();
        this.logger.info('Time manager disposed');
    }
}

// 导出单例实例
export const datetimeManager = DateTimeManager.getInstance();

export default DateTimeManager;
