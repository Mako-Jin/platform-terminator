import {LoggerFactory, isDebugMode} from "common-tools";
import {useEffect, useRef, useState} from "react";
import {ResourceLoader} from "common-three";
import {ASSETS} from "/@/settings/resources";
import LoadingScreen from "./loading";
import {Haptics} from "/@/utils/haptics";
import Weather from "/@/weather";
import SettingsManager from "/@/settings/manager.ts";


const WeatherView = ({container}: { container?: HTMLElement | string } = {}) => {
    const logger = LoggerFactory.create("elemental-weather-container");

    const [isLoading, setIsLoading] = useState(true);
    const weatherContainerRef = useRef<HTMLDivElement>(null);

    const [resourceLoader, setResourceLoader] = useState<ResourceLoader | null>(null);

    const debugMode = isDebugMode();

    const getContainer = () => {
        // 优先使用传入的container，否则使用ref
        let targetContainer: HTMLElement | null;

        if (container) {
            targetContainer = typeof container === 'string'
                ? document.querySelector(container)
                : container;
        } else {
            targetContainer = weatherContainerRef.current;
        }
        return targetContainer;
    }

    const handleLoadingComplete = (withMusic: boolean) => {
        logger.info(`Loading complete, starting with music: ${withMusic}`);
        setIsLoading(false);

        Haptics.buttonTap();

        // ✅ 在这里初始化 Weather 实例
        initializeWeather(withMusic);
    };

    const initializeWeather = (withMusic: boolean) => {
        const targetContainer = getContainer();
        if (!targetContainer) {
            logger.error('weather world container not found');
            return;
        }

        logger.info('[Weather] Initializing weather application...');
        const weather = Weather.getInstance();
        weather.init(targetContainer, withMusic, debugMode).then(() => {
            (window as any).weatherInstance = weather;
            logger.info('[Weather] Weather application started successfully');
        });
    };

    useEffect(() => {
        logger.info("weather world view loading...")
        const container = getContainer();
        if (!container) {
            logger.error("weather world container not found")
            return;
        }

        if (resourceLoader) {
            logger.info('ResourceLoader already exists, skipping initialization');
            return;
        }

        // ✅ 修复：将资源加载逻辑提取到单独的函数中，避免在 effect 中直接调用 setState
        const initResources = () => {
            const loader = new ResourceLoader(ASSETS, debugMode);
            setResourceLoader(loader);
        };

        initResources();

        SettingsManager.getInstance();

        return () => {
            logger.info('WeatherView unmounting');
        };
    }, [debugMode, getContainer, logger, resourceLoader]);

    return (
        <div className="weather-container">
            <div ref={weatherContainerRef}/>
            {/* 加载界面 */}
            {isLoading && resourceLoader && (
                <LoadingScreen
                    resources={resourceLoader}
                    onComplete={handleLoadingComplete}
                />
            )}
        </div>
    );
}

export default WeatherView;
