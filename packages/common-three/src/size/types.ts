

/**
 * 窗口尺寸变化事件数据
 */
export interface SizeChangedData {
    /** 宽度（像素） */
    width: number;
    /** 高度（像素） */
    height: number;
    /** 前一次宽度 */
    previousWidth: number;
    /** 前一次高度 */
    previousHeight: number;
    /** 宽高比 */
    aspectRatio: number;
    /** 是否是移动端 */
    isMobile: boolean;
    /** 是否是平板 */
    isTablet: boolean;
    /** 设备像素比 */
    pixelRatio: number;
}
