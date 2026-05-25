import {LoggerFactory, isDebugMode, eventBus} from "common-tools";
import {useCallback, useEffect, useRef, useState} from "react";
import {ResourceLoader, type SeasonType} from "common-three";
import {ASSETS, resolvePath} from "/@/settings/resources";
import LoadingScreen from "./loading";
import {Haptics} from "/@/utils";
import {
    defaultQiankunConfig,
    fullConfig,
    getAssetsForConfig,
    getCurrentConfig,
    type QiankunConfig
} from "/@/settings";
import Weather from "/@/weather";
import SettingsManager from "/@/settings/manager.ts";
import ControlPanel from "/@/views/controls";
import ShaderReveal from "/@/views/shader";
import {MusicManager, type WeatherType} from "/@/manager";
import {Lightning} from "/@/weather/components";
import useToast from "/@/hooks/useToast.ts";
import ToastContainer from "/@/views/toast";
import PageTitle from "/@/views/title";
import HamburgerMenu from "/@/views/menu";
import SettingsModal from "/@/views/settings";


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

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [resourceLoader, setResourceLoader] = useState<ResourceLoader | null>(null);

    const [musicManager, setMusicManager] = useState<MusicManager | undefined>(undefined);

    const {toasts, showToast, removeToast, showSeasonToast, showDayNightToast, showWeatherToast, showMusicToast, showLightningToast} = useToast();

    const debugMode = isDebugMode();
    
    // ✅ qiankun 配置状态
    const [qiankunConfig, setQiankunConfig] = useState<QiankunConfig>(fullConfig);
    
    // ✅ 新增:跟踪Weather实例是否已初始化,防止重复初始化
    const weatherInitializedRef = useRef<boolean>(false);

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
        // ✅ 关键修复:防止重复初始化
        if (weatherInitializedRef.current) {
            logger.warn('[WeatherView] Weather already initialized, skipping...');
            return;
        }
        
        const targetContainer = getContainer();
        if (!targetContainer) {
            logger.error('weather world container not found');
            return;
        }

        logger.info('[Weather] Initializing weather application...');
        weatherInitializedRef.current = true; // ✅ 标记为已初始化
        
        const weather = Weather.getInstance();
        weather.init({
            container: targetContainer, 
            isDebugMode: debugMode, 
            onInitProgress: (progress: number) => {
                logger.debug(`Loading progress: ${progress * 100}%`);
            },
            qiankunConfig: qiankunConfig
        }).then(() => {
            window.weatherInstance = weather;
            logger.info('[Weather] Weather application started successfully');
            // ✅ 获取并设置 musicManager 以便传递给 UI
            setMusicManager(weather.getMusicManager());
            window.weatherInstance?.start(withMusic);
        }).catch((error) => {
            logger.error('[Weather] Initialization failed:', error);
            weatherInitializedRef.current = false;
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
        }, 50);
    };

    const handleSeasonChange = (season: SeasonType) => {
        logger.info(`Season changed to: ${season}`);
        showSeasonToast(season);
    };

    const handleTimeChange = (time: string) => {
        logger.info(`Time changed to: ${time}`);
        showDayNightToast(time);
    };

    const handleWeatherChange = (weather: WeatherType) => {
        logger.info(`Weather changed to: ${weather}`);
        showWeatherToast(weather);
    };

    const handleLightningStrike = () => {
        logger.info('Lightning strike triggered');
        showLightningToast();
        eventBus.emit(Lightning.LIGHTNING_STRIKE_TRIGGERED);
    };

    const handleOpenSettings = () => {
        setIsSettingsOpen(true);
    };

    const handleCloseSettings = () => {
        setIsSettingsOpen(false);
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

        // ✅ 根据 qiankun 配置决定加载哪些资源
        const initResources = (config: QiankunConfig) => {
            const assetsToLoad = getAssetsForConfig(config, ASSETS);
            
            // ✅ 在加载前动态解析资源路径（解决 qiankun 环境下路径问题）
            const resolvedAssets = assetsToLoad.map(asset => ({
                ...asset,
                path: asset.path.map(p => resolvePath(p))
            }));
            
            logger.info(`[WeatherView] Loading ${resolvedAssets.length} assets based on qiankun config`);
            const loader = new ResourceLoader(resolvedAssets, debugMode);
            setResourceLoader(loader);
        };

        // ✅ 获取 qiankun 配置（支持从 API 获取）
        // 如需从 API 获取，传入 API 地址：await getCurrentConfig('/api/qiankun-config')
        const loadConfigAndResources = async () => {
            try {
                // 方式1：使用默认配置
                const config = await getCurrentConfig();
                
                // 方式2：从 API 获取配置（取消注释并配置正确的 API 地址）
                // const config = await getCurrentConfig('/api/qiankun-config');
                
                setQiankunConfig(config);
                initResources(config);
            } catch (error) {
                logger.error('Failed to load qiankun config, using default:', error);
                setQiankunConfig(defaultQiankunConfig);
                initResources(defaultQiankunConfig);
            }
        };

        loadConfigAndResources();

        SettingsManager.getInstance();

        return () => {
            logger.info('WeatherView unmounting, cleaning up...');
            
            // 停止并销毁Weather实例
            if (window.weatherInstance) {
                window.weatherInstance.stop();
                window.weatherInstance.dispose();
                window.weatherInstance = undefined;
                weatherInitializedRef.current = false;
            }
        };
    }, [debugMode, getContainer, qiankunConfig]);

    useEffect(() => {
        if (!musicManager) {
            return;
        }

        const handleTrackChanged = (data: { trackName: string }) => {
            showMusicToast(data.trackName);
        };

        const handleMusicEnabledChanged = (data: { enabled: boolean }) => {
            if (data.enabled) {
                showToast('Music Enabled', 'success', 2000);
            } else {
                showToast('Music Paused', 'info', 2000);
            }
        };
        
        eventBus.on(MusicManager.ELEMENTAL_WEATHER_MUSIC_TRACK_CHANGED, handleTrackChanged);
        eventBus.on(MusicManager.ELEMENTAL_WEATHER_MUSIC_ENABLED_CHANGED, handleMusicEnabledChanged);
        
        return () => {
            eventBus.off(MusicManager.ELEMENTAL_WEATHER_MUSIC_TRACK_CHANGED, handleTrackChanged);
            eventBus.off(MusicManager.ELEMENTAL_WEATHER_MUSIC_ENABLED_CHANGED, handleMusicEnabledChanged);
        };
    }, [musicManager, showMusicToast, showToast]);

    return (
        <>
            <div className="weather-container">
                <div ref={weatherContainerRef}/>
                {/* 加载界面 */}
                {!qiankunConfig.enabled && isLoading && resourceLoader && (
                    <LoadingScreen
                        resources={resourceLoader}
                        onComplete={handleLoadingComplete}
                    />
                )}

                {/* Shader转场动画 */}
                {!qiankunConfig.enabled && showShader && (
                    <ShaderReveal onComplete={handleShaderComplete} />
                )}

                {/* Toast通知容器 */}
                <ToastContainer toasts={toasts} onClose={removeToast} />

                {/* 控制面板 - 根据配置决定是否显示 */}
                {qiankunConfig.showUI && (
                    <ControlPanel
                        visible={showControls}
                        musicManager={musicManager}
                        onSeasonChange={handleSeasonChange}
                        onTimeChange={handleTimeChange}
                        onWeatherChange={handleWeatherChange}
                        onLightningStrike={handleLightningStrike}
                    />
                )}

                {/* 页面标题 - 根据配置决定是否显示 */}
                {qiankunConfig.showUI && !isLoading && !showShader && <PageTitle />}

                {/* 汉堡菜单 - 根据配置决定是否显示 */}
                {qiankunConfig.showUI && !isLoading && !showShader && (
                    <HamburgerMenu onOpenSettings={handleOpenSettings} />
                )}

                {/* 设置模态框 - 根据配置决定是否显示 */}
                {qiankunConfig.showUI && (
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={handleCloseSettings}
                        musicManager={musicManager}
                    />
                )}
            </div>
        </>
    );
}

export default WeatherView;