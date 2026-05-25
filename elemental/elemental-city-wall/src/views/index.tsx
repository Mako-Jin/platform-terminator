import {isDebugMode, LoggerFactory} from "common-tools";
import {useCallback, useEffect, useRef, useState} from "react";
import World from "/@/word";
import {fullConfig, type QiankunConfig} from "/@/settings";


const WorldView = ({container}: { container?: HTMLElement | string } = {}) => {

    const logger = LoggerFactory.create("elemental-city-wall-container");

    const worldContainerRef = useRef<HTMLDivElement>(null);

    const debugMode = isDebugMode();
    
    // ✅ qiankun 配置状态
    const [qiankunConfig, setQiankunConfig] = useState<QiankunConfig>(fullConfig);

    const getContainer = useCallback((): HTMLElement | null => {
        // 优先使用传入的container，否则使用ref
        let targetContainer: HTMLElement | null;

        if (container) {
            targetContainer = typeof container === 'string'
                ? document.querySelector(container)
                : container;
        } else {
            targetContainer = worldContainerRef.current;
        }
        return targetContainer;
    }, [container]);

    const initWorld = () => {

        const targetContainer = getContainer();
        if (!targetContainer) {
            logger.error('weather world container not found');
            return;
        }
        
        const world = World.getInstance();
        world.init({
            container: targetContainer,
            isDebugMode: debugMode,
            onInitProgress: (progress: number) => {
                logger.debug(`Loading progress: ${progress * 100}%`);
            },
            qiankunConfig: qiankunConfig
        });
    }

    useEffect(() => {
        initWorld();
    }, [initWorld]);

    return (
        <>
            <div className="world-container">
                <div ref={worldContainerRef}/>
            </div>
        </>
    );
}

export default WorldView;