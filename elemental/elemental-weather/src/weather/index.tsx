import {useEffect, useRef} from "react";
import ASSETS from "/@/utils/assets/assets.ts";
import ResourceLoader from "/@/utils/ResourceLoader.ts";
import {
    AppEvents,
    eventBus,
    LoggerFactory,
    type ResourceErrorData,
    type ResourceLoadedData,
    type ResourceProgressData
} from "common-shared";
import Loader from "/@/weather/loader";
import Weather from "/@/weather/weather.ts";
import {logGameState, logGraphicsChange, logMusicChange} from "/@/utils/logger";
import ShaderReveal from "/@/utils/ShaderReveal.ts";
import './index.scss';
import SeasonManager from "/@/utils/SeasonManager.ts";
import EnvironmentTimeManager from "/@/utils/EnvironmentTimeManager.ts";


const WeatherView = ({container}: { container?: HTMLElement | string } = {}) => {

    const weatherContainerRef = useRef<HTMLDivElement>(null);

    const Logger = LoggerFactory.create("weather-container");

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

        const Haptics = {
            buttonTap() {
                if (navigator.haptic) {
                    navigator.haptic([{ intensity: 0.7, sharpness: 0.1 }]);
                } else if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            },

            thunder() {
                if (navigator.haptic) {
                    navigator.haptic('error');
                } else if (navigator.vibrate) {
                    navigator.vibrate([50, 30, 100, 50, 200]);
                }
            },
        };

        const isDebugMode =
            typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('mode') === 'debug';

        const setProgressBarWidth = () => {
            const titleWidth = loaderTitle.offsetWidth;
            loaderProgress.style.width = `${titleWidth}px`;
        };

        window.addEventListener('load', setProgressBarWidth);

        const resources = new ResourceLoader(ASSETS);

        const getLoadingMessage = (id: string, itemsLoaded: number, itemsTotal: number) => {
            const messages = [
                'Gathering elemental essence',
                'Weaving natural harmonies',
                'Awakening ancient spirits',
                "Channeling earth's energy",
                'Summoning peaceful winds',
                'Collecting forest whispers',
                'Brewing tranquil potions',
                'Painting serene landscapes',
                "Tuning nature's symphony",
                'Crafting mystical elements',
            ];

            const getAssetType = (assetId: string) => {
                if (assetId.includes('.gltf') || assetId.includes('.glb'))
                    return '3D Model';
                if (
                    assetId.includes('.jpg') ||
                    assetId.includes('.png') ||
                    assetId.includes('.webp')
                )
                    return 'Texture';
                if (
                    assetId.includes('.mp3') ||
                    assetId.includes('.wav') ||
                    assetId.includes('.ogg')
                )
                    return 'Audio';
                if (assetId.includes('.json')) return 'Data';
                if (assetId.includes('.hdr')) return 'Environment';
                if (assetId.includes('.bin')) return 'Binary Data';
                return 'Asset';
            };

            const messageIndex = Math.floor(
                (itemsLoaded - 1) / Math.max(1, Math.floor(itemsTotal / messages.length))
            );
            const baseMessage = messages[messageIndex % messages.length];
            const assetType = getAssetType(id);
            const dots = '.'.repeat((itemsLoaded % 4) + 1);

            return `${baseMessage}${dots} ${assetType} (${itemsLoaded}/${itemsTotal})`;
        };

        const loader = document.getElementById('loader');
        const progressBar = document.getElementById('progress-bar') as HTMLElement;

        const loaderText = document.getElementById('loader-text') as HTMLElement;

        const loaderTitle = document.querySelector('.loader-title') as HTMLElement;
        const loaderProgress = document.querySelector('.loader-progress-bar') as HTMLElement;
        const exploreButtons = document.getElementById('explore-buttons');
        const exploreWithMusic = document.getElementById('explore-with-music');
        const exploreWithoutMusic = document.getElementById('explore-without-music');
        const shaderCanvas = document.getElementById('shader-overlay');
        const shaderReveal = new ShaderReveal(shaderCanvas);

        const dayNightButtons = document.querySelectorAll('.daynight-button');

        const seasonButtons = document.querySelectorAll('.season-button');

        const controlPanel = document.getElementById('control-panel');
        const pageTitle = document.getElementById('page-title');
        const environmentTimeManager = EnvironmentTimeManager.getInstance();
        const seasonManager = SeasonManager.getInstance();

        const reverseSeasonMapping = {
            spring: 'spring',
            autumn: 'autumn',
            winter: 'winter',
            rainy: 'rain',
        };

        const initializeSeasonUI = () => {
            const currentSeason = seasonManager.currentSeason;
            const uiSeason = reverseSeasonMapping[currentSeason];
            seasonButtons.forEach((button) => {
                button.classList.remove('active');
                if (button.dataset.season === uiSeason) {
                    button.classList.add('active');
                }
            });
        };

        eventBus.on(AppEvents.RESOURCE_PROGRESS, (data: ResourceProgressData) => {
            progressBar.style.width = `${data.percent}%`;

            loaderText.innerHTML = getLoadingMessage(data.id, data.itemsLoaded, data.itemsTotal).replace(
                '\n',
                '<br>'
            );

            if (isDebugMode) {
                Logger.info(
                    `Loaded asset: "${data.id}" (${data.itemsLoaded}/${data.itemsTotal} — ${data.percent.toFixed(
                        1
                    )}%)`
                );
            }
        });

        eventBus.on(AppEvents.RESOURCE_ERROR, (data: ResourceErrorData) => {
            const assetType =
                data.id.includes('.gltf') || data.id.includes('.glb')
                    ? '3D Model'
                    : data.id.includes('.jpg') || data.id.includes('.png')
                        ? 'Texture'
                        : data.id.includes('.mp3') || data.id.includes('.wav')
                            ? 'Audio'
                            : 'Asset';

            loaderText.innerHTML = `⚠️ Elemental disruption detected...<br>${assetType} failed (${data.itemsLoaded}/${data.itemsTotal})`;
            Logger.error(
                `[ResourceLoader] Failed to load item named "${data.id}" at "${data.url}" (${data.itemsLoaded}/${data.itemsTotal} so far)`
            );
        });

        eventBus.on(AppEvents.RESOURCE_LOADED, (data: ResourceLoadedData) => {
            loaderText.textContent = 'Serenity achieved... Welcome to your sanctuary!';

            if (isDebugMode) {
                if (Object.keys(resources.getItems()).length) {
                    Logger.debug('✅ All assets are loaded. Initializing game…!');
                } else {
                    Logger.debug('☑️ No asset to load. Initializing game…!');
                }
            }

            setTimeout(() => {
                exploreButtons.style.visibility = 'visible';
                setTimeout(() => {
                    exploreButtons.classList.add('show');
                }, 100);
            }, 800);

            const startGame = (withMusic = true) => {
                exploreWithMusic.disabled = true;
                exploreWithoutMusic.disabled = true;

                setTimeout(() => {
                    const weather = new Weather(
                        weatherContainerRef.current,
                        resources,
                        isDebugMode,
                        withMusic
                    );

                    (window as any).gameInstance = weather;
                    logGameState(weather);

                    if (weather.musicManager) {
                        weather.musicManager.on('trackChanged', (track: any) => {
                            logMusicChange('track', track.name);
                        });
                    }

                    window.addEventListener('graphicsQualityChanged', (event) => {
                        logGraphicsChange(event.detail.quality);
                    });

                    shaderReveal.start();

                    loader.classList.add('hidden');

                    setTimeout(() => {
                        loader.remove();

                        setTimeout(() => {
                            controlPanel.classList.add('show');
                            pageTitle.classList.add('show');
                            initializeSeasonUI();
                            initializeDayNightUI();
                        }, 500);
                        document.dispatchEvent(new CustomEvent('gameStarted'));
                    }, 500);
                }, 200);
            };
            exploreWithMusic.addEventListener('click', () => {
                Haptics.buttonTap();
                startGame(true);
            });
            exploreWithoutMusic.addEventListener('click', () => {
                Haptics.buttonTap();
                startGame(false);
            });
        });

        const initializeDayNightUI = () => {
            const currentTime = environmentTimeManager.envTime;
            dayNightButtons.forEach((button) => {
                button.classList.remove('active');
                if (button.dataset.time === currentTime) {
                    button.classList.add('active');
                }
            });
        };

    }, []);

    return (
        <div className="weather-container">
            <div ref={weatherContainerRef} className="canvas-wrapper"/>
            {/* Shader Reveal Overlay */}
            {/* 着色器显示覆盖层 */}
            <canvas id="shader-overlay"></canvas>
            {/* Hamburger Menu Button */}
            <button id="hamburger-menu" title="Settings">
                <i className="fas fa-bars"></i>
            </button>
            {/* Right Side Control Panel */}
            <div id="control-panel">
                {/* Day/Night Toggle */}
                <div id="daynight-toggle">
                    <button className="daynight-button active day" data-time="day" title="Day">
                        <i className="fas fa-sun"></i>
                    </button>
                    <button className="daynight-button night" data-time="night" title="Night">
                        <i className="fas fa-moon"></i>
                    </button>
                </div>

                {/* Season Toggle Menu */}
                <div id="season-menu">
                    <button
                        className="season-button active spring"
                        data-season="spring"
                        title="Spring"
                    >
                        <i className="fas fa-seedling"></i>
                    </button>
                    <button
                        className="season-button autumn"
                        data-season="autumn"
                        title="Autumn"
                    >
                        <i className="fa-brands fa-canadian-maple-leaf"></i>
                    </button>
                    <button
                        className="season-button winter"
                        data-season="winter"
                        title="Winter"
                    >
                        <i className="fas fa-snowflake"></i>
                    </button>
                    <button className="season-button rain" data-season="rain" title="Rain">
                        <i className="fas fa-cloud-rain"></i>
                    </button>
                </div>

                {/* Music Control Button */}
                <button id="music-control" title="Toggle Music">
                    <i className="fas fa-music"></i>
                </button>
            </div>
            <div id="page-title">
                <i className="fa-regular fa-square"></i>Elemental Serenity
            </div>
            <Loader/>
        </div>
    )
}

export default WeatherView;
