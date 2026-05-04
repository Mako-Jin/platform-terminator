

/**
 * 时间变化事件数据
 */
export interface TimeChangedData {
    /** 当前时间字符串 (YYYY-MM-DD HH:mm:ss) */
    currentTime: string;
    /** 前一时间字符串 */
    previousTime: string;
    /** 小时数 (0-23) */
    hour: number;
    /** 分钟数 (0-59) */
    minute: number;
    /** 秒数 (0-59) */
    second: number;
    /** 时间戳 */
    timestamp: number;
}



/**
 * 日期变化事件数据
 */
export interface DateChangedData {
    /** 当前日期字符串 (YYYY-MM-DD) */
    currentDate: string;
    /** 前一日日期字符串 */
    previousDate: string;
    /** 年份 */
    year: number;
    /** 月份 (1-12) */
    month: number;
    /** 日期 (1-31) */
    day: number;
    /** 星期几 (0-6, 0=星期日) */
    weekday: number;
    /** 星期几名称 */
    weekdayName: string;
    /** 时间戳 */
    timestamp: number;
    /** 是否是节日 */
    isFestival: boolean;
    /** 节日名称（如果有） */
    festivalName?: string;
    /** 是否是重要日期 */
    isImportant: boolean;
    /** 重要日期描述（如果有） */
    importantDescription?: string;
}

/**
 * 节日配置
 */
export interface FestivalConfig {
    /** 节日名称 */
    name: string;
    /** 月份 (1-12) */
    month: number;
    /** 日期 (1-31) */
    day: number;
    /** 是否每年重复 */
    recurring: boolean;
    /** 可选的年份（针对非重复节日） */
    year?: number;
    /** 节日描述 */
    description?: string;
    /** 自定义样式或图标 */
    icon?: string;
    color?: string;
}

/**
 * 重要日期配置
 */
export interface ImportantDateConfig {
    /** 日期标识 */
    id: string;
    /** 年份 */
    year: number;
    /** 月份 (1-12) */
    month: number;
    /** 日期 (1-31) */
    day: number;
    /** 描述 */
    description: string;
    /** 回调函数（当到达此日期时调用） */
    callback?: (data: DateChangedData) => void;
    /** 是否只触发一次 */
    once?: boolean;
}

