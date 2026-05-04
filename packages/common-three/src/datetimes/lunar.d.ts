/**
 * lunar-javascript 库的类型声明
 * https://github.com/6tail/lunar-javascript
 */

declare module 'lunar-javascript' {
    /**
     * 阳历日期类
     */
    export class Solar {
        /**
         * 从 Date 对象创建 Solar 实例
         */
        static fromDate(date: Date): Solar;

        /**
         * 获取对应的农历对象
         */
        getLunar(): Lunar;

        /**
         * 获取年份
         */
        getYear(): number;

        /**
         * 获取月份 (1-12)
         */
        getMonth(): number;

        /**
         * 获取日期 (1-31)
         */
        getDay(): number;

        /**
         * 获取星期 (0-6, 0=星期日)
         */
        getWeek(): number;

        /**
         * 转为 Date 对象
         */
        toDate(): Date;

        /**
         * 转为字符串
         */
        toString(): string;
    }

    /**
     * 农历日期类
     */
    export class Lunar {
        /**
         * 获取节气名称
         * @returns 如果是节气日，返回节气名称（如"立春"），否则返回空字符串
         */
        getJieQi(): string;

        /**
         * 获取农历月份 (1-12)
         */
        getMonth(): number;

        /**
         * 获取农历日期 (1-30)
         */
        getDay(): number;

        /**
         * 获取农历年份
         */
        getYear(): number;

        /**
         * 获取生肖
         */
        getYearShengXiao(): string;

        /**
         * 获取天干地支（年）
         */
        getYearInGanZhi(): string;

        /**
         * 获取天干地支（月）
         */
        getMonthInGanZhi(): string;

        /**
         * 获取天干地支（日）
         */
        getDayInGanZhi(): string;

        /**
         * 获取星座
         */
        getXingZuo(): string;

        /**
         * 转为字符串
         */
        toString(): string;

        /**
         * 获取完整的农历字符串
         */
        toFullString(): string;
    }

    /**
     * 工具类
     */
    export class LunarUtil {
        /**
         * 获取某年的所有节气
         * @param year 年份
         * @returns 节气数组
         */
        static getJieQiList(year: number): string[];
    }
}
