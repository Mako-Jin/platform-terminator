import {eventBus} from "common-shared";
import {LoggerFactory} from "common-shared";


export default class Clock {

    private logger = LoggerFactory.create("weather-clock");

    private startTime: number;
    private current: number;
    private elapsedTime: number;
    private delta: number;

    constructor() {
        this.startTime = performance.now();
        this.current = this.startTime;
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
        this.elapsedTime = (this.current - this.startTime) / 1000;

        eventBus.emit('animate');

        window.requestAnimationFrame(() => {
            this.animate();
        });
    }

    public start() {
        this.animate();
        this.logger.info('[Clock] Animation loop started');
    }

    public on(event: string, callback: () => void) {
        if (typeof event === 'undefined' || event === '') {
            this.logger.warn('wrong event names');
            return false;
        }

        if (typeof callback === 'undefined') {
            this.logger.warn('wrong callback');
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
