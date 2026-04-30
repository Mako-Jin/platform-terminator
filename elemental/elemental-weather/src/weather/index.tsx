import {LoggerFactory} from "common-shared";
import {useEffect, useRef} from "react";
import {ASSETS, ResourceLoader} from "/@/resources";
import {isDebugMode} from "common-shared";
import { start as startListener } from "./listener"

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

        const resources = new ResourceLoader(ASSETS, isDebugMode);
        // 启动事件监听器
        startListener(
            targetContainer,
            resources,
            debugMode,
            shaderContainerRef.current || targetContainer
        );
    }, []);

    return (
        <div className="weather-container">
            <div ref={weatherContainerRef} className="canvas-wrapper"/>
            {/* 着色器显示覆盖层 */}
            <div ref={shaderContainerRef}/>
        </div>
    );

}

export default WeatherView;
