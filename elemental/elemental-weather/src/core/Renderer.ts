import * as Three from 'three';
import Sizes from "./Size";
import Camera from "./Camera";
import {eventBus, LoggerFactory} from "common-tools";
import {WeatherEvents} from "/@/events/types";
import type {TimeChangedEventData} from "/@/events/types";
import moment from "moment";

export default class Renderer {

    private logger = LoggerFactory.create("weather-renderer");

    private container: HTMLElement;
    private sizes: Sizes;
    private scene: Three.Scene;
    private camera: Camera;
    private isDebugMode: boolean;
    private rendererInstance: Three.WebGLRenderer;

    constructor(
        container: HTMLElement, sizes: Sizes, scene: Three.Scene, camera: Camera, isDebugMode: boolean
    ) {
        this.container = container;
        this.sizes = sizes;
        this.scene = scene;
        this.camera = camera;

        this.isDebugMode = isDebugMode;

        this.setRendererInstance();
        eventBus.on(WeatherEvents.TIME_CHANGED, (data: TimeChangedEventData) => {
            this.updateToneMapping(data.currentTime);
        });

        this.onGraphicsQualityChanged = this.onGraphicsQualityChanged.bind(this);
        window.addEventListener(
            'graphicsQualityChanged',
            this.onGraphicsQualityChanged
        );
    }

    getInitialGraphicsSettings() {
        const defaults = {
            antialias: false,
            shadowMapType: 'PCFShadowMap',
            pixelRatioCap: 2,
        };

        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (!savedSettings) return {
                defaults
            };

            const settings = JSON.parse(savedSettings);
            const quality = settings.graphicsQuality || 'medium';

            if (quality === 'custom') {
                return {
                    antialias: settings.customAntialias || false,
                    shadowMapType: settings.customShadows || 'PCFShadowMap',
                    pixelRatioCap: settings.customPixelRatio || 2,
                };
            }

            const presetSettings = {
                low: {
                    antialias: false,
                    shadowMapType: 'BasicShadowMap',
                    pixelRatioCap: 2,
                },
                medium: {
                    antialias: false,
                    shadowMapType: 'PCFShadowMap',
                    pixelRatioCap: 2,
                },
                high: {
                    antialias: true,
                    shadowMapType: 'PCFSoftShadowMap',
                    pixelRatioCap: 2,
                },
                ultra: {
                    antialias: true,
                    shadowMapType: 'PCFSoftShadowMap',
                    pixelRatioCap: 3,
                },
            };

            return presetSettings[quality] || defaults;
        } catch (error) {
            this.logger.warn(
                'Failed to load graphics settings from localStorage:',
                error
            );
            return defaults;
        }
    }

    setRendererInstance() {
        // const toneMappingOptions = {
        //     NoToneMapping: Three.NoToneMapping,
        //     LinearToneMapping: Three.LinearToneMapping,
        //     ReinhardToneMapping: Three.ReinhardToneMapping,
        //     CineonToneMapping: Three.CineonToneMapping,
        //     ACESFilmicToneMapping: Three.ACESFilmicToneMapping,
        //     AgXToneMapping: Three.AgXToneMapping,
        //     NeutralToneMapping: Three.NeutralToneMapping,
        // };

        const graphicsSettings = this.getInitialGraphicsSettings();
        const useAntialias = graphicsSettings.antialias;

        this.rendererInstance = new Three.WebGLRenderer({
            antialias: useAntialias,
            powerPreference: 'high-performance',
        });

        this.updateToneMapping(moment().format("YYYY-MM-DD HH:mm:ss"));

        this.rendererInstance.toneMappingExposure = 1.75;
        this.rendererInstance.shadowMap.enabled = true;

        const shadowMapTypes = {
            BasicShadowMap: Three.BasicShadowMap,
            PCFShadowMap: Three.PCFShadowMap,
            PCFSoftShadowMap: Three.PCFSoftShadowMap,
        };
        this.rendererInstance.shadowMap.type =
            shadowMapTypes[graphicsSettings.shadowMapType] || Three.PCFShadowMap;

        // 先添加到 DOM
        this.container.appendChild(this.rendererInstance.domElement);

        // 使用 Sizes 提供的尺寸
        const width = this.sizes.getWidth();
        const height = this.sizes.getHeight();
        
        // 强制设置 Canvas 属性
        this.rendererInstance.domElement.width = width;
        this.rendererInstance.domElement.height = height;
        
        this.rendererInstance.setSize(width, height, false);
        this.rendererInstance.setPixelRatio(Math.min(this.sizes.getPixelRatio(), graphicsSettings.pixelRatioCap));

        if (this.isDebugMode) {
            this.setUpPerformanceMonitor();
        }
    }

    public resize() {
        const width = this.sizes.getWidth();
        const height = this.sizes.getHeight();
        
        this.rendererInstance.domElement.width = width;
        this.rendererInstance.domElement.height = height;
        this.rendererInstance.setSize(width, height, false);
        this.rendererInstance.setPixelRatio(this.sizes.getPixelRatio());
    }

    updateToneMapping(time) {
        const hour = moment(time).hour();
        this.rendererInstance.toneMapping =
             hour >= 6 && hour < 18
                ? Three.LinearToneMapping
                : Three.NeutralToneMapping;
    }

    onGraphicsQualityChanged(event) {
        const { settings } = event.detail;

        const shadowMapTypes = {
            BasicShadowMap: Three.BasicShadowMap,
            PCFShadowMap: Three.PCFShadowMap,
            PCFSoftShadowMap: Three.PCFSoftShadowMap,
        };

        if (shadowMapTypes[settings.shadowMapType]) {
            this.rendererInstance.shadowMap.type =
                shadowMapTypes[settings.shadowMapType];
        }

        if (this.sizes && settings.pixelRatioCap) {
            const newPixelRatio = Math.min(
                this.sizes.getPixelRatio(),
                settings.pixelRatioCap
            );
            this.rendererInstance.setPixelRatio(newPixelRatio);
        }

        localStorage.setItem('graphicsAntialias', settings.antialias.toString());
        localStorage.setItem('graphicsShadowMapType', settings.shadowMapType);
        localStorage.setItem(
            'graphicsPixelRatioCap',
            settings.pixelRatioCap.toString()
        );
    }

    setUpPerformanceMonitor() {
        // this.perf = new PerformanceMonitor(this.rendererInstance);
    }

    public getRendererInstance() {
        return this.rendererInstance;
    }

    public update() {
        // if (this.perf) {
        //     this.perf.beginFrame();
        // }
        this.rendererInstance.render(this.scene, this.camera.getCameraInstance());
        // if (this.perf) {
        //     this.perf.endFrame();
        // }
    }

    destroy() {
        eventBus.off(WeatherEvents.TIME_CHANGED, null);
        window.removeEventListener(
            'graphicsQualityChanged',
            this.onGraphicsQualityChanged
        );
        this.rendererInstance.dispose();
    }
}
