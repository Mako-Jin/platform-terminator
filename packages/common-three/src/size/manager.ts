
import {eventBus, LoggerFactory} from "common-tools";
import type {SizeChangedData} from "./types";

/**
 * 窗口大小管理器（单例）
 * 负责监听窗口和容器尺寸变化
 */
export class SizeManager {

    private static instance: SizeManager | null = null;
    private logger = LoggerFactory.create('size-manager');

    private width: number = typeof window !== 'undefined' ? window.innerWidth : 0;
    private height: number = typeof window !== 'undefined' ? window.innerHeight : 0;
    private resizeObserver: ResizeObserver | null = null;
    private observedElements: Map<HTMLElement, (data: SizeChangedData) => void> = new Map();
    private listeners: Set<(data: SizeChangedData) => void> = new Set();

    // 断点定义
    private static readonly BREAKPOINTS = {
        MOBILE: 768,
        TABLET: 1024,
    };

    // 事件名称常量
    public static readonly SIZE_CHANGED = 'common-three:size:changed';

    private constructor() {
        if (typeof window !== 'undefined') {
            this.setupWindowResizeListener();
        }
    }

    /**
     * 获取单例实例
     */
    static getInstance(): SizeManager {
        if (!SizeManager.instance) {
            SizeManager.instance = new SizeManager();
        }
        return SizeManager.instance;
    }

    /**
     * 获取当前宽度
     */
    getWidth(): number {
        return this.width;
    }

    /**
     * 获取当前高度
     */
    getHeight(): number {
        return this.height;
    }

    /**
     * 获取宽高比
     */
    getAspectRatio(): number {
        return this.height > 0 ? this.width / this.height : 0;
    }

    /**
     * 判断是否是移动端
     */
    isMobile(): boolean {
        return this.width < SizeManager.BREAKPOINTS.MOBILE;
    }

    /**
     * 判断是否是平板
     */
    isTablet(): boolean {
        return this.width >= SizeManager.BREAKPOINTS.MOBILE && 
               this.width < SizeManager.BREAKPOINTS.TABLET;
    }

    /**
     * 判断是否是桌面端
     */
    isDesktop(): boolean {
        return this.width >= SizeManager.BREAKPOINTS.TABLET;
    }

    /**
     * 获取设备像素比
     */
    getPixelRatio(): number {
        return typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    }

    /**
     * 监听指定容器的尺寸变化
     *
     * @param element 要监听的 DOM 元素
     * @param callback 尺寸变化回调（可选，不传则触发全局事件）
     */
    observe(element: HTMLElement, callback?: (data: SizeChangedData) => void): void {
        if (!element) {
            this.logger.error('Cannot observe null element');
            return;
        }

        // 如果已经监听过，先移除
        if (this.observedElements.has(element)) {
            this.unobserve(element);
        }

        // 初始化 ResizeObserver
        if (!this.resizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const target = entry.target as HTMLElement;
                    this.handleElementResize(target);
                }
            });
        }

        // 开始监听
        this.resizeObserver.observe(element);

        // 保存回调
        const handler = callback || (() => {});
        this.observedElements.set(element, handler);

        this.logger.info(`Started observing element`);
    }

    /**
     * 停止监听指定容器
     *
     * @param element 要停止监听的 DOM 元素
     */
    unobserve(element: HTMLElement): void {
        if (this.resizeObserver && this.observedElements.has(element)) {
            this.resizeObserver.unobserve(element);
            this.observedElements.delete(element);
            this.logger.info(`Stopped observing element`);
        }
    }

    /**
     * 停止监听所有容器
     */
    unobserveAll(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.observedElements.clear();
            this.logger.info('Stopped observing all elements');
        }
    }

    /**
     * 添加尺寸变化监听器
     *
     * @param callback 回调函数
     */
    onSizeChanged(callback: (data: SizeChangedData) => void): void {
        this.listeners.add(callback);
        this.logger.debug(`Added size changed listener, total: ${this.listeners.size}`);
    }

    /**
     * 移除尺寸变化监听器
     *
     * @param callback 回调函数
     */
    offSizeChanged(callback: (data: SizeChangedData) => void): void {
        this.listeners.delete(callback);
        this.logger.debug(`Removed size changed listener, total: ${this.listeners.size}`);
    }

    /**
     * 清空所有监听器
     */
    clearListeners(): void {
        this.listeners.clear();
        this.logger.info('Cleared all size changed listeners');
    }

    /**
     * 设置窗口 resize 监听器
     */
    private setupWindowResizeListener(): void {
        let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

        window.addEventListener('resize', () => {
            // 使用防抖，避免频繁触发
            if (resizeTimeout !== null) {
                clearTimeout(resizeTimeout);
            }

            resizeTimeout = setTimeout(() => {
                this.handleWindowResize();
                resizeTimeout = null;
            }, 100);
        });

        this.logger.info('Window resize listener setup');
    }

    /**
     * 处理窗口尺寸变化
     */
    private handleWindowResize(): void {
        const previousWidth = this.width;
        const previousHeight = this.height;

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.triggerSizeChanged(previousWidth, previousHeight);
    }

    /**
     * 处理元素尺寸变化
     */
    private handleElementResize(element: HTMLElement): void {
        const previousWidth = this.width;
        const previousHeight = this.height;

        const rect = element.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.triggerSizeChanged(previousWidth, previousHeight);

        // 触发自定义回调
        const callback = this.observedElements.get(element);
        if (callback) {
            try {
                const data = this.createSizeData(previousWidth, previousHeight);
                callback(data);
            } catch (error) {
                this.logger.error('Error in element resize callback:', error);
            }
        }
    }

    /**
     * 触发尺寸变化事件
     */
    private triggerSizeChanged(previousWidth: number, previousHeight: number): void {
        const data = this.createSizeData(previousWidth, previousHeight);

        // 触发全局事件
        eventBus.emit(SizeManager.SIZE_CHANGED, data);

        // 触发本地监听器
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                this.logger.error('Error in size changed listener:', error);
            }
        });

        this.logger.debug(`Size changed: ${data.width}x${data.height}`);
    }

    /**
     * 创建尺寸变化数据
     */
    private createSizeData(previousWidth: number, previousHeight: number): SizeChangedData {
        return {
            width: this.width,
            height: this.height,
            previousWidth,
            previousHeight,
            aspectRatio: this.getAspectRatio(),
            isMobile: this.isMobile(),
            isTablet: this.isTablet(),
            pixelRatio: this.getPixelRatio(),
        };
    }

    /**
     * 销毁大小管理器
     */
    dispose(): void {
        this.unobserveAll();
        this.clearListeners();
        this.logger.info('Size manager disposed');
    }
}

// 导出单例实例
export const sizeManager = SizeManager.getInstance();

export default SizeManager;
