import {eventBus, LoggerFactory} from "common-tools";

export default class Sizes {

    private Logger = LoggerFactory.create("weather-sizes");

    private container: HTMLElement | null;
    private width: number;
    private height: number;
    private pixelRatio: number;
    private resizeTimeout: any;

    constructor(container?: HTMLElement) {
        this.container = container || null;
        
        // 初始化尺寸
        this.updateDimensions();
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.resizeTimeout = null;

        // 监听窗口 resize
        window.addEventListener('resize', () => this.handleResizeDebounced());
        
        // 如果有容器，监听容器的 ResizeObserver
        if (this.container && 'ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(() => {
                this.handleResizeDebounced();
            });
            resizeObserver.observe(this.container);
        }
    }

    private updateDimensions() {
        if (this.container) {
            // 优先使用容器尺寸
            this.width = this.container.clientWidth;
            this.height = this.container.clientHeight;
        } else {
            // 回退到窗口尺寸
            this.width = window.innerWidth;
            this.height = window.innerHeight;
        }
    }

    handleResizeDebounced() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.handleResize();
        }, 300);
    }

    handleResize() {
        this.updateDimensions();
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);

        eventBus.emit('resize');
    }

    public on(event: string, callback: () => void) {
        if (typeof event === 'undefined' || event === '') {
            this.Logger.warn('wrong event names');
            return false;
        }

        if (typeof callback === 'undefined') {
            this.Logger.warn('wrong callback');
            return false;
        }

        return eventBus.on(event, callback);
    }

    public getWidth() {
        return this.width;
    }

    public getHeight() {
        return this.height;
    }

    public getPixelRatio() {
        return this.pixelRatio;
    }
}
