import {eventBus, LoggerFactory} from "common-shared";

export default class Sizes {

    private Logger = LoggerFactory.create("weather-sizes");

    private width: number;
    private height: number;
    private pixelRatio: number;
    private resizeTimeout: any;

    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.resizeTimeout = null;

        window.addEventListener('resize', () => this.handleResizeDebounced());
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
        this.width = window.innerWidth;
        this.height = window.innerHeight;
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
