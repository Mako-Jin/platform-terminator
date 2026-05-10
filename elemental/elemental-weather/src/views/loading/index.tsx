import {ResourceLoader} from "common-three";
import {eventBus} from "common-tools";
import type {ResourceProgressData, ResourceErrorData} from "common-three";
import {useEffect, useRef, useState} from "react";
import "./index.scss";


interface LoadingScreenProps {
    resources: ResourceLoader;
    onComplete: (withMusic: boolean) => void;
}


const LoadingScreen: (
    { resources, onComplete }: LoadingScreenProps
) => JSX.Element = ({ resources, onComplete }) => {

    const loadingMessages = [
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

    const [showButtons, setShowButtons] = useState(false);

    const titleRef = useRef<HTMLHeadingElement>(null);

    const progressBarRef = useRef<HTMLDivElement>(null);

    const [progress, setProgress] = useState(0);

    const [message, setMessage] = useState(loadingMessages[0]);

    const [isLoaded, setIsLoaded] = useState(false);

    const getAssetType = (id: string): string => {
        if (id.includes('.gltf') || id.includes('.glb')) return '3D Model';
        if (id.match(/\.(jpg|png|webp)$/i)) return 'Texture';
        if (id.match(/\.(mp3|wav|ogg)$/i)) return 'Audio';
        if (id.includes('.json')) return 'Data';
        if (id.includes('.hdr')) return 'Environment';
        if (id.includes('.bin')) return 'Binary Data';
        return 'Asset';
    };

    const getLoadingMessage = (id: string, itemsLoaded: number, itemsTotal: number): string => {
        const messageIndex = Math.floor(
            (itemsLoaded - 1) / Math.max(1, Math.floor(itemsTotal / loadingMessages.length))
        );
        const baseMessage = loadingMessages[messageIndex % loadingMessages.length];
        const assetType = getAssetType(id);
        const dots = '.'.repeat((itemsLoaded % 4) + 1);
        return `${baseMessage}${dots} ${assetType} (${itemsLoaded}/${itemsTotal})`;
    };

    const handleProgress = (resourceProgressData: ResourceProgressData) => {
        setProgress(resourceProgressData.percent);
        const message = getLoadingMessage(
            resourceProgressData.assetId,
            resourceProgressData.itemsLoaded,
            resourceProgressData.itemsTotal
        );
        setMessage(message);
    };

    const handleError = (resourceErrorData: ResourceErrorData) => {
        const assetType = getAssetType(resourceErrorData.assetId);
        setMessage(`⚠️ Elemental disruption detected... ${assetType} failed 
            (${resourceErrorData.itemsLoaded}/${resourceErrorData.itemsTotal})`);
    };

    const handleLoaded = () => {
        setMessage('Serenity achieved... \nWelcome to your sanctuary!');
        setIsLoaded(true);

        setTimeout(() => {
            setShowButtons(true);
        }, 800);
    };

    const handleExploreClick = (withMusic: boolean) => {
        onComplete(withMusic);
    };

    useEffect(() => {
        const updateProgressBarWidth = () => {
            if (progressBarRef.current && titleRef.current) {
                progressBarRef.current.style.width = `${titleRef.current.offsetWidth}px`;
            }
        };

        updateProgressBarWidth();

        eventBus.on(ResourceLoader.COMMON_THREE_RESOURCE_PROGRESS, handleProgress);
        eventBus.on(ResourceLoader.COMMON_THREE_RESOURCE_ERROR, handleError);
        eventBus.on(ResourceLoader.COMMON_THREE_RESOURCE_LOADED, handleLoaded);

        window.addEventListener('resize', updateProgressBarWidth);

        return () => {
            eventBus.off(ResourceLoader.COMMON_THREE_RESOURCE_PROGRESS, handleProgress);
            eventBus.off(ResourceLoader.COMMON_THREE_RESOURCE_ERROR, handleError);
            eventBus.off(ResourceLoader.COMMON_THREE_RESOURCE_LOADED, handleLoaded);

            window.removeEventListener('resize', updateProgressBarWidth);
        };
    }, [resources]);

    return (
        <div className={`loading-screen ${!showButtons ? '' : 'buttons-visible'}`}>
            <div className="loader-content">
                <h1 className="loader-title" ref={titleRef}>
                    <i className="fa-regular fa-square"/>
                    Elemental Serenity
                </h1>

                <div className="loader-progress">
                    <div
                        className="loader-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <p className="loader-text" style={{ whiteSpace: 'pre-line' }}>{message}</p>

                <div className={`explore-buttons ${showButtons ? 'show' : ''}`}>
                    <button
                        className="explore-button explore-button-light"
                        onClick={() => handleExploreClick(true)}
                        disabled={!isLoaded}
                    >
                        <i className="fas fa-music"/>
                        Explore with Music
                    </button>
                    <button
                        className="explore-button explore-button-dark"
                        onClick={() => handleExploreClick(false)}
                        disabled={!isLoaded}
                    >
                        <i className="fas fa-volume-mute"/>
                        Explore without Music
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
