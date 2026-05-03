import {LoggerFactory} from "common-tools";
import {useEffect, useRef} from "react";
import {ASSETS, ResourceLoader} from "/@/resources";
import {isDebugMode} from "common-tools";
import { start as startListener } from "./listener"
import SeasonManager from "/@/manager/SeasonManager.ts";
import ColorManager from "/@/manager/ColorManager.ts";
import TimeManager from "/@/manager/TimeManager.ts";

let resourceLoader: ResourceLoader | null = null;

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

        if (resourceLoader) {
            logger.info('ResourceLoader already exists, skipping initialization');
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
            const resourceLoader = new ResourceLoader(ASSETS, isDebugMode);
            // 启动事件监听器
            startListener(
                targetContainer,
                resourceLoader,
                debugMode,
                shaderContainerRef.current || targetContainer
            );
        });

        return () => {
            logger.info('WeatherView unmounting');
        };
    }, []);

    return (
        <div className="weather-container" ref = {weatherContainerRef}>
            {/* 着色器显示覆盖层 */}
            <div ref={shaderContainerRef}/>
        </div>
    );

}

export default WeatherView;
