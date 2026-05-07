import {isDebugMode, LoggerFactory} from "common-tools";
import {useEffect, useRef, useState} from "react";
import {ASSETS, ResourceLoader} from "/@/resources";
import { datetimeManager } from "common-three";
import SeasonManager from "/@/manager/SeasonManager.ts";
import ColorManager from "/@/manager/ColorManager.ts";
import LoadingScreen from "/@/ui/loading";
import ShaderReveal from "/@/ui/ShaderReveal";
import ToastContainer from "/@/ui/ToastContainer";
import ControlPanel from "/@/ui/controls/ControlPanel"
import PageTitle from "/@/ui/PageTitle";
import HamburgerMenu from "/@/ui/HamburgerMenu";
import SettingsModal from "/@/ui/SettingsModal";
import useToast from "/@/ui/useToast";
import './index.scss';
import Weather from "./weather";
import {eventBus} from "common-tools";
import {AppEvents} from "common-tools";


const WeatherView = ({container}: { container?: HTMLElement | string } = {}) => {

    const logger = LoggerFactory.create("weather-container");

    const weatherContainerRef = useRef<HTMLDivElement>(null);
    const shaderContainerRef = useRef<HTMLDivElement>(null);

    const debugMode = isDebugMode;

    const [isLoading, setIsLoading] = useState(true);
    const [showShader, setShowShader] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // const [weatherInitialized, setWeatherInitialized] = useState(false);
    const [musicManager, setMusicManager] = useState<any>(null);

    const { toasts, removeToast, showSeasonToast, showDayNightToast, showMusicToast, showToast } = useToast();

    const [resourceLoader, setResourceLoader] = useState<ResourceLoader | null>(null);

    const handleLoadingComplete = (withMusic: boolean) => {
        logger.info(`Loading complete, starting with music: ${withMusic}`);
        setIsLoading(false);
        setShowShader(true);

        // 这里可以保存音乐选择到全局状态或localStorage
        localStorage.setItem('weather_music_enabled', String(withMusic));
        // ✅ 在这里初始化 Weather 实例
        initializeWeather(withMusic);
    };

    const initializeWeather = (withMusic: boolean) => {
        const targetContainer = weatherContainerRef.current;
        if (!targetContainer) {
            logger.error('Weather container not found');
            return;
        }

        logger.info('[Weather] Initializing weather application...');
        const weather = Weather.getInstance();
        weather.init(targetContainer, withMusic, debugMode).then(() => {
            (window as any).weatherInstance = weather;
            logger.info('[Weather] Weather application started successfully');
        });
    };

    const handleShaderComplete = () => {
        logger.info('Shader reveal complete');
        setShowShader(false);
        setTimeout(() => {
            setShowControls(true);
        }, 500);
    };

    const handleSeasonChange = (season: string) => {
        logger.info(`Season changed to: ${season}`);
        showSeasonToast(season);
    };

    const handleTimeChange = (time: string) => {
        logger.info(`Time changed to: ${time}`);
        showDayNightToast(time);
    };

    const handleOpenSettings = () => {
        setIsSettingsOpen(true);
    };

    const handleCloseSettings = () => {
        setIsSettingsOpen(false);
    };

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

        // 启动datetimeManager（如果还没启动）
        datetimeManager.start(60000); // 每分钟更新

        const initializeManagers = async () => {
            try {
                logger.info('Initializing season and color managers...');

                const seasonManager = SeasonManager.getInstance();
                const colorManager = ColorManager.getInstance();

                // 等待季节配置加载完成
                await seasonManager.waitForInitialization();

                logger.info('Managers initialized successfully');
            } catch (error) {
                logger.error('Failed to initialize managers', error);
            }
        };

        initializeManagers().then(() => {
            const loader = new ResourceLoader(ASSETS, isDebugMode);
            setResourceLoader(loader);

            // 监听季节变化事件
            window.addEventListener('seasonChange', ((event: CustomEvent) => {
                showSeasonToast(event.detail.season);
            }) as EventListener);

            // 监听时间变化事件
            window.addEventListener('timeChange', ((event: CustomEvent) => {
                showDayNightToast(event.detail.time);
            }) as EventListener);
        });

        return () => {
            logger.info('WeatherView unmounting');
            // 清理 Weather 实例
            if ((window as any).weatherInstance) {
                (window as any).weatherInstance.dispose();
                delete (window as any).weatherInstance;
            }

            // 清理事件监听
            eventBus.off(AppEvents.RESOURCE_LOADED);
            eventBus.off(AppEvents.RESOURCE_PROGRESS);
            eventBus.off(AppEvents.RESOURCE_ERROR);
        };
    }, []);

    return (
        <div className="weather-container" ref={weatherContainerRef}>
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

            {/* 页面标题 */}
            {!isLoading && !showShader && <PageTitle />}

            {/* 汉堡菜单 */}
            {!isLoading && !showShader && (
                <HamburgerMenu onOpenSettings={handleOpenSettings} />
            )}

            {/* Toast通知容器 */}
            <ToastContainer toasts={toasts} onClose={removeToast} />

            <ControlPanel
                visible={showControls}
                musicManager={musicManager}
                onSeasonChange={handleSeasonChange}
                onTimeChange={handleTimeChange}
            />

            {/* 设置模态框 */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={handleCloseSettings}
            />

            {/* 着色器显示覆盖层 */}
            <div ref={shaderContainerRef}/>
        </div>
    );

}

export default WeatherView;
