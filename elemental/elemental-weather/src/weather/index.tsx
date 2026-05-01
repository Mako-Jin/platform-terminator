import {LoggerFactory} from "common-shared";
import {useEffect, useRef} from "react";
import {ASSETS, ResourceLoader} from "/@/resources";
import {isDebugMode} from "common-shared";
import { start as startListener } from "./listener"
import SeasonManager from "/@/manager/SeasonManager.ts";
import ColorManager from "/@/manager/ColorManager.ts";
import TimeManager from "/@/manager/TimeManager.ts";

const WeatherView = ({container}: { container?: HTMLElement | string } = {}) => {

    const logger = LoggerFactory.create("weather-container");

    const weatherContainerRef = useRef<HTMLDivElement>(null);
    const shaderContainerRef = useRef<HTMLDivElement>(null);

    const debugMode = isDebugMode;

    useEffect(() => {
        // 优先使用传入的container，否则使用ref
        let targetContainer: HTMLElement | null;

        if (container) {
            targetContainer = typeof container === 'string'
                ? document.querySelector(container)
                : container;
        } else {
            targetContainer = weatherContainerRef.current;
        }

        if (!targetContainer) {
            return;
        }

        const initializeManagers = async () => {
            try {
                logger.info('Initializing season and color managers...');

                const seasonManager = SeasonManager.getInstance();
                const timeManager = TimeManager.getInstance();
                const colorManager = ColorManager.getInstance();

                // 等待季节配置加载完成
                await seasonManager.waitForInitialization();
                
                logger.info('Managers initialized successfully');
            } catch (error) {
                logger.error('Failed to initialize managers', error);
            }
        };

        initializeManagers().then(() => {
            const resources = new ResourceLoader(ASSETS, isDebugMode);
            // 启动事件监听器
            startListener(
                targetContainer,
                resources,
                debugMode,
                shaderContainerRef.current || targetContainer
            );
        });
    }, []);

    return (
        <div className="weather-container">
            <div ref={weatherContainerRef} className="weather-container-wrapper"/>
            {/* 着色器显示覆盖层 */}
            <div ref={shaderContainerRef}/>
        </div>
    );

}

export default WeatherView;
