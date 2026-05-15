import {eventBus, LoggerFactory, isDebugMode} from "common-tools";
import type {DateChangedData, FestivalConfig, SeasonChangedData, SeasonType, TimeChangedData} from "./types";
import {Solar} from 'lunar-javascript';
import {SEASON_DISPLAY_NAMES} from "./types";

/**
 * 时间管理器（单例）
 * 负责管理时间、日期、节日检测、二十四节气
 */
export class DateTimeManager {

    private static instance: DateTimeManager | null = null;
    private logger = LoggerFactory.create('common-three-time-manager');

    private currentTime: Date;
    private previousDate: string | null = null;
    private previousSeason: SeasonType | null = null;
    private updateInterval: number | null = null;
    private isRunning: boolean = false;
    private timeListeners: Set<(data: TimeChangedData) => void> = new Set();
    private dateListeners: Set<(data: DateChangedData) => void> = new Set();
    private seasonListeners: Set<(data: SeasonChangedData) => void> = new Set();

    // ✅ 手动覆盖的季节（仅 Debug 模式可用）
    private manualSeasonOverride: SeasonType | null = null;

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
    public static readonly SEASON_CHANGED = 'common-three:season:changed';

    private constructor() {
        this.currentTime = new Date();
        this.previousDate = this.getDateKey(this.currentTime);
        this.previousSeason = this.getCurrentSeason(); // ✅ 使用 getCurrentSeason

        this.loadDefaultFestivals();

        // ✅ 记录 Debug 模式状态
        const debugMode = isDebugMode();
        this.logger.info(`DateTimeManager initialized (Debug mode: ${debugMode})`);
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
     * ✅ 手动设置季节（仅在 Debug 模式下可用）
     *
     * @param season 要设置的季节
     */
    setManualSeason(season: SeasonType): void {
        // ✅ 非 Debug 模式下禁止手动设置
        if (!isDebugMode()) {
            this.logger.warn('Manual season override is only available in Debug mode');
            return;
        }

        const previousSeason = this.manualSeasonOverride || this.previousSeason;
        this.manualSeasonOverride = season;

        this.logger.info(`Manual season set: ${season} (Debug mode)`);

        // ✅ 触发季节变化事件
        this.emitSeasonChangeEvent(previousSeason || 'spring', season);
    }

    /**
     * ✅ 手动设置时间（仅在 Debug 模式下可用）
     *
     * @param hours 小时 (0-23)
     * @param minutes 分钟 (0-59)，可选
     * @param seconds 秒数 (0-59)，可选
     */
    setManualTime(hours: number, minutes?: number, seconds?: number): void {
        // ✅ 非 Debug 模式下禁止手动设置
        if (!isDebugMode()) {
            this.logger.warn('Manual time override is only available in Debug mode');
            return;
        }

        // 参数验证
        if (hours < 0 || hours > 23) {
            this.logger.error('Invalid hours: must be between 0 and 23');
            return;
        }
        if (minutes !== undefined && (minutes < 0 || minutes > 59)) {
            this.logger.error('Invalid minutes: must be between 0 and 59');
            return;
        }
        if (seconds !== undefined && (seconds < 0 || seconds > 59)) {
            this.logger.error('Invalid seconds: must be between 0 and 59');
            return;
        }

        const previousTime = new Date(this.currentTime);
        const newTime = new Date(this.currentTime);
        newTime.setHours(hours, minutes ?? 0, seconds ?? 0, 0);

        this.currentTime = newTime;

        this.logger.info(`Manual time set: ${this.formatDateTime(newTime, 'HH:mm:ss')} (Debug mode)`);

        // ✅ 触发时间变化事件
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

        // ✅ 检查是否需要切换昼夜
        const wasDaytime = previousTime.getHours() >= 6 && previousTime.getHours() < 18;
        const isDaytime = hours >= 6 && hours < 18;

        if (wasDaytime !== isDaytime) {
            this.logger.info(`Day/Night switched: ${wasDaytime ? 'day' : 'night'} → ${isDaytime ? 'day' : 'night'}`);
        }
    }

    /**
     * ✅ 切换到白天（6:00 AM）
     */
    setToDaytime(): void {
        this.setManualTime(12, 0, 0); // 中午 12 点
    }

    /**
     * ✅ 切换到夜晚（8:00 PM）
     */
    setToNighttime(): void {
        this.setManualTime(20, 0, 0); // 晚上 8 点
    }

    /**
     * ✅ 清除手动季节覆盖，恢复自动计算
     */
    clearManualSeason(): void {
        if (this.manualSeasonOverride) {
            const overriddenSeason = this.manualSeasonOverride;
            this.manualSeasonOverride = null;

            // ✅ 恢复到自动计算的季节
            const autoSeason = this.getAutoSeason();

            this.logger.info(`Manual season override cleared: ${overriddenSeason} → ${autoSeason}`);

            // ✅ 触发季节变化事件
            this.emitSeasonChangeEvent(overriddenSeason, autoSeason);
        }
    }

    /**
     * ✅ 检查是否有手动季节覆盖
     */
    hasManualSeason(): boolean {
        return this.manualSeasonOverride !== null;
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
     * ✅ 获取当前节气（使用 lunar-javascript 库）
     */
    getCurrentSolarTerm(): string {
        try {
            const solar = Solar.fromDate(this.currentTime);
            const lunar = solar.getLunar();
            const jieQi = lunar.getJieQi();

            // 如果当天是节气日，返回节气名称
            if (jieQi) {
                return jieQi;
            }

            // 否则查找最近的节气
            return this.getNearestSolarTerm();
        } catch (error) {
            this.logger.error('Failed to get solar term:', error);
            return '';
        }
    }

    /**
     * ✅ 获取最近的节气
     */
    private getNearestSolarTerm(): string {
        try {
            const year = this.getYear();
            const terms = [
                '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
                '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
                '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
                '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
            ];

            let nearestTerm = '';
            let nearestDate: Date | null = null;

            for (const term of terms) {
                const termSolar = this.getSolarTermDate(year, term);

                if (termSolar && this.currentTime >= termSolar) {
                    if (!nearestDate || termSolar > nearestDate) {
                        nearestTerm = term;
                        nearestDate = termSolar;
                    }
                }
            }

            if (nearestTerm) {
                this.logger.debug(`[getNearestSolarTerm] Found nearest term: ${nearestTerm} (${nearestDate?.toLocaleDateString()})`);
                return nearestTerm;
            }

            const lastYearTerms = this.getSolarTermDate(year - 1, '大寒');
            if (lastYearTerms && this.currentTime >= lastYearTerms) {
                this.logger.debug(`[getNearestSolarTerm] Using last year's 大寒`);
                return '大寒';
            }

            this.logger.warn('[getNearestSolarTerm] No solar term found, returning empty string');
            return '';
        } catch (error) {
            this.logger.error('Failed to get nearest solar term:', error);
            return '';
        }
    }

    /**
     * ✅ 获取节气的具体日期
     */
    private getSolarTermDate(year: number, term: string): Date | null {
        try {
            // 遍历该年的每一天，找到节气日
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const solar = Solar.fromDate(d);
                const lunar = solar.getLunar();
                if (lunar.getJieQi() === term) {
                    return new Date(d);
                }
            }

            return null;
        } catch (error) {
            this.logger.error(`Failed to get date for solar term ${term}:`, error);
            return null;
        }
    }

    /**
     * ✅ 获取自动计算的季节（私有方法，不考虑手动覆盖）- 始终使用真实节气
     */
    private getAutoSeason(): SeasonType {
        // ✅ 始终使用 Solar 库获取真实节气
        const solarTerm = this.getCurrentSolarTerm();

        // 根据节气判断季节（更符合中国传统）
        if (['立春', '雨水', '惊蛰', '春分', '清明', '谷雨'].includes(solarTerm)) {
            return 'spring';
        } else if (['立夏', '小满', '芒种', '夏至', '小暑', '大暑'].includes(solarTerm)) {
            return 'summer';
        } else if (['立秋', '处暑', '白露', '秋分', '寒露', '霜降'].includes(solarTerm)) {
            return 'autumn';
        } else if (['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'].includes(solarTerm)) {
            return 'winter';
        }

        // fallback: 使用天文季节（理论上不会走到这里）
        const month = this.getMonth();
        if (month >= 3 && month <= 5) {
            return 'spring';
        } else if (month >= 6 && month <= 8) {
            return 'summer';
        } else if (month >= 9 && month <= 11) {
            return 'autumn';
        } else {
            return 'winter';
        }
    }

    /**
     * ✅ 获取当前季节（唯一公开的季节获取方法，包含 Debug 模式判断）
     */
    getCurrentSeason(): SeasonType {
        // ✅ 如果 Debug 模式且有手动覆盖，返回手动设置的季節
        if (isDebugMode() && this.manualSeasonOverride) {
            return this.manualSeasonOverride;
        }

        // 否则根据真实节气自动计算
        return this.getAutoSeason();
    }

    /**
     * ✅ 根据节气获取季节
     */
    getSeasonBySolarTerm(solarTerm: string): SeasonType | undefined {
        const springTerms = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨'];
        const summerTerms = ['立夏', '小满', '芒种', '夏至', '小暑', '大暑'];
        const autumnTerms = ['立秋', '处暑', '白露', '秋分', '寒露', '霜降'];
        const winterTerms = ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];

        if (springTerms.includes(solarTerm)) return 'spring';
        if (summerTerms.includes(solarTerm)) return 'summer';
        if (autumnTerms.includes(solarTerm)) return 'autumn';
        if (winterTerms.includes(solarTerm)) return 'winter';

        return undefined;
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
     * ✅ 添加季节变化监听器
     *
     * @param callback 回调函数
     */
    onSeasonChanged(callback: (data: SeasonChangedData) => void): void {
        this.seasonListeners.add(callback);
        this.logger.debug(`Added season changed listener, total: ${this.seasonListeners.size}`);
    }

    /**
     * ✅ 移除季节变化监听器
     *
     * @param callback 回调函数
     */
    offSeasonChanged(callback: (data: SeasonChangedData) => void): void {
        this.seasonListeners.delete(callback);
        this.logger.debug(`Removed season changed listener, total: ${this.seasonListeners.size}`);
    }

    /**
     * 清空所有监听器
     */
    clearListeners(): void {
        this.timeListeners.clear();
        this.dateListeners.clear();
        this.seasonListeners.clear();
        this.logger.info('Cleared all listeners');
    }

    /**
     * ✅ 创建季节变化数据对象（公共方法）
     */
    private createSeasonChangeData(
        previousSeason: SeasonType,
        currentSeason: SeasonType
    ): SeasonChangedData {
        const solarTerm = this.getCurrentSolarTerm();

        return {
            currentSeason,
            previousSeason,
            solarTerm,
            date: this.formatDateTime(this.currentTime, 'YYYY-MM-DD'),
            timestamp: Date.now(),
        };
    }

    /**
     * ✅ 发送季节变化事件（公共方法）
     */
    private emitSeasonChangeEvent(
        previousSeason: SeasonType,
        currentSeason: SeasonType
    ): void {
        const seasonData = this.createSeasonChangeData(previousSeason, currentSeason);

        // 触发全局事件
        eventBus.emit(DateTimeManager.SEASON_CHANGED, seasonData);

        // 触发本地监听器
        this.seasonListeners.forEach(callback => {
            try {
                callback(seasonData);
            } catch (error) {
                this.logger.error('Error in season changed listener:', error);
            }
        });

        // 日志输出
        this.logger.info(
            `🍂 Season changed: ${SEASON_DISPLAY_NAMES[previousSeason]} → ${SEASON_DISPLAY_NAMES[currentSeason]} (${seasonData.solarTerm})`
        );
    }

    /**
     * 时间滴答（内部方法）
     */
    private createTimeChangeData(
        currentTime: Date,
        previousTime: Date
    ): TimeChangedData {
        return {
            currentTime: this.formatDateTime(currentTime, 'YYYY-MM-DD HH:mm:ss'),
            previousTime: this.formatDateTime(previousTime, 'YYYY-MM-DD HH:mm:ss'),
            hour: currentTime.getHours(),
            minute: currentTime.getMinutes(),
            second: currentTime.getSeconds(),
            timestamp: currentTime.getTime(),
        };
    }

    /**
     * ✅ 发送时间变化事件（私有方法）
     */
    private emitTimeChangeEvent(previousTime: Date): void {
        const timeData = this.createTimeChangeData(this.currentTime, previousTime);

        // 触发全局事件
        eventBus.emit(DateTimeManager.TIME_CHANGED, timeData);

        // 触发本地监听器
        this.timeListeners.forEach(callback => {
            try {
                callback(timeData);
            } catch (error) {
                this.logger.error('Error in time changed listener:', error);
            }
        });
    }

    /**
     * 时间滴答（内部方法）
     */
    private tick(): void {
        const previousTime = new Date(this.currentTime);
        this.currentTime = new Date();

        // 1. 触发时间变化事件（每分钟）
        this.emitTimeChangeEvent(previousTime);

        // 2. 检查日期是否变化（每天午夜）
        const currentDateKey = this.getDateKey(this.currentTime);
        if (currentDateKey !== this.previousDate) {
            this.handleDateChange(previousTime);
            this.previousDate = currentDateKey;
        }

        this.logger.debug(`Time updated: ${this.formatDateTime(this.currentTime, 'YYYY-MM-DD HH:mm:ss')}`);
    }

    /**
     * 处理日期变化
     */
    private handleDateChange(previousTime: Date): void {
        const festival = this.getTodayFestival();
        const solarTerm = this.getCurrentSolarTerm();
        const currentSeason = this.getCurrentSeason(); // ✅ 使用 getCurrentSeason

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
            solarTerm: solarTerm,
            season: currentSeason,
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

        // ✅ 检查季节是否变化（只在没有手动覆盖时）
        if (!this.manualSeasonOverride && this.previousSeason !== currentSeason) {
            this.emitSeasonChangeEvent(this.previousSeason || currentSeason, currentSeason);
            this.previousSeason = currentSeason;
        }

        // 触发本地监听器
        this.dateListeners.forEach(callback => {
            try {
                callback(dateData);
            } catch (error) {
                this.logger.error('Error in date changed listener:', error);
            }
        });

        this.logger.info(`Date changed: ${dateData.currentDate} (${dateData.weekdayName}) [${solarTerm}]`);
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
