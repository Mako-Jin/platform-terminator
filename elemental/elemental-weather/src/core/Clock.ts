import {eventBus} from "common-shared";
import {LoggerFactory} from "common-shared";


export default class Clock {

    private Logger = LoggerFactory.create("weather-clock");

    private start: number;
    private current: number;
    private elapsedTime: number;
    private delta: number;

    constructor() {
        this.start = performance.now();
        this.current = this.start;
        this.elapsedTime = 0;
        this.delta = 0;

        window.requestAnimationFrame(() => {
            this.animate();
        });
    }

    animate() {
        const currentTime = performance.now();
        this.delta = Math.min((currentTime - this.current) / 1000, 0.1);
        this.current = currentTime;
        this.elapsedTime = (this.current - this.start) / 1000;

        eventBus.emit('animate');

        window.requestAnimationFrame(() => {
            this.animate();
        });
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

    public getElapsedTime(): number {
        return this.elapsedTime;
    }

    public getDelta(): number {
        return this.delta;
    }

}
