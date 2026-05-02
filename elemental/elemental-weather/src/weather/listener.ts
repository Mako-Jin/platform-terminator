import {eventBus, LoggerFactory} from "common-shared";
import {AppEvents} from "common-shared";
import type {ResourceProgressData, ResourceErrorData, ResourceLoadedData} from "common-shared";
import Weather from "./weather";
import {ResourceLoader} from "../resources";
import ShaderReveal from "/src/shaders/reveal";

let hasInitialized = false;

const logger = LoggerFactory.create('weather-listener');

export const start = (
    weatherContainer: HTMLElement,
    resources: ResourceLoader,
    isDebugMode: boolean,
    shaderContainer: HTMLElement
) => {
    // 监听资源加载进度
    eventBus.on(AppEvents.RESOURCE_PROGRESS, (data: ResourceProgressData) => {

    });

    // 监听资源加载错误事件
    eventBus.on(AppEvents.RESOURCE_ERROR, (data: ResourceErrorData) => {

    });

    // 资源加载完成事件，开启界面渲染
    eventBus.on(AppEvents.RESOURCE_LOADED, (data: ResourceLoadedData) => {
        if (hasInitialized) {
            logger.warn('[Weather] Already initialized, skipping...');
            return;
        }
        
        hasInitialized = true;
        
        logger.info('[Weather] Initializing weather application...');
        const weather = Weather.getInstance();
        weather.init(weatherContainer, resources, isDebugMode);
        (window as any).weatherInstance = weather;
        // const shaderReveal = new ShaderReveal(shaderContainer);
        weather.start();
        // shaderReveal.start()
        logger.info('[Weather] Weather application started successfully');
    });
}
