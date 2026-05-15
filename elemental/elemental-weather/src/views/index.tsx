import {LoggerFactory, isDebugMode, eventBus} from "common-tools";
import {useCallback, useEffect, useRef, useState} from "react";
import {datetimeManager, ResourceLoader, type SeasonType} from "common-three";
import {ASSETS} from "/@/settings/resources";
import LoadingScreen from "./loading";
import {Haptics} from "/@/utils";
import Weather from "/@/weather";
import SettingsManager from "/@/settings/manager.ts";
import ControlPanel from "/@/views/controls";
import ShaderReveal from "/@/views/shader";
import {MusicManager} from "/@/manager";
import {Lightning} from "/@/weather/components";
import useToast from "/@/hooks/useToast.ts";


declare global {
    interface Window {
        weatherInstance?: Weather;
    }
}


const WeatherView = ({container}: { container?: HTMLElement | string } = {}) => {
    const logger = LoggerFactory.create("elemental-weather-container");

    const [isLoading, setIsLoading] = useState(true);

    const [showControls, setShowControls] = useState(false);

    const [showShader, setShowShader] = useState(false);

    const weatherContainerRef = useRef<HTMLDivElement>(null);

    const [resourceLoader, setResourceLoader] = useState<ResourceLoader | null>(null);

    const [musicManager, setMusicManager] = useState<MusicManager | undefined>(undefined);

    const { toasts, removeToast, showSeasonToast, showDayNightToast, showMusicToast, showToast } = useToast();

    const debugMode = isDebugMode();

    const getContainer = useCallback((): HTMLElement | null => {
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
    }, [container])


    const initializeWeather = (withMusic: boolean) => {
        const targetContainer = getContainer();
        if (!targetContainer) {
            logger.error('weather world container not found');
            return;
        }

        logger.info('[Weather] Initializing weather application...');
        const weather = Weather.getInstance();
        weather.init(targetContainer, withMusic, debugMode).then(() => {
            window.weatherInstance = weather;
            logger.info('[Weather] Weather application started successfully');

            // ✅ 获取并设置 musicManager 以便传递给 UI
            setMusicManager(weather.getMusicManager());
        });
    };

    const handleLoadingComplete = (withMusic: boolean) => {
        logger.info(`Loading complete, starting with music: ${withMusic}`);
        setIsLoading(false);
        setShowShader(true);

        Haptics.buttonTap();

        // ✅ 在这里初始化 Weather 实例
        initializeWeather(withMusic);
    };

    const handleShaderComplete = () => {
        logger.info('Shader reveal complete');
        setShowShader(false);
        setTimeout(() => {
            setShowControls(true);
        }, 500);
    };

    const handleSeasonChange = (season: SeasonType) => {
        logger.info(`Season changed to: ${season}`);
        showSeasonToast(season);
        datetimeManager.setManualSeason(season);
    };

    const handleTimeChange = (time: string) => {
        logger.info(`Time changed to: ${time}`);
        showDayNightToast(time);
        if ('day' === time) {
            datetimeManager.setToDaytime();
        } else {
            datetimeManager.setToNighttime();
        }
    };

    const handleLightningStrike = () => {
        logger.info('Lightning strike triggered');
        // ✅ 通过事件总线触发闪电
        eventBus.emit(Lightning.LIGHTNING_STRIKE_TRIGGERED);
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

            {/* Shader转场动画 */}
            {showShader && (
                <ShaderReveal onComplete={handleShaderComplete} />
            )}

            <ControlPanel
                visible={showControls}
                musicManager={musicManager}
                onSeasonChange={handleSeasonChange}
                onTimeChange={handleTimeChange}
                onLightningStrike={handleLightningStrike}
            />
        </div>
    );
}

export default WeatherView;
