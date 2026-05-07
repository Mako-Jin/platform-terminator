import { useEffect, useState, useRef } from 'react';
import type { ResourceLoader } from '/@/resources';
import './loading.scss';
import {eventBus} from "common-tools";
import {AppEvents} from "common-tools";

interface LoadingScreenProps {
  resources: ResourceLoader;
  onComplete: (withMusic: boolean) => void;
}

const LoadingScreen: (
    { resources, onComplete }: { resources: ResourceLoader; onComplete: any }
) => JSX.Element = ({ resources, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Gathering elemental essence...');
  const [showButtons, setShowButtons] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

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

  useEffect(() => {
    const handleProgress = ({ id, itemsLoaded, itemsTotal, percent }: any) => {
      setProgress(percent);
      setMessage(getLoadingMessage(id, itemsLoaded, itemsTotal));
    };

    const handleError = ({ id, itemsLoaded, itemsTotal }: any) => {
      const assetType = getAssetType(id);
      setMessage(`⚠️ Elemental disruption detected... ${assetType} failed (${itemsLoaded}/${itemsTotal})`);
    };

    const handleLoaded = () => {
      setMessage('Serenity achieved... Welcome to your sanctuary!');
      setIsLoaded(true);

      setTimeout(() => {
        setShowButtons(true);
      }, 800);
    };

    eventBus.on(AppEvents.RESOURCE_PROGRESS, handleProgress);
    eventBus.on(AppEvents.RESOURCE_ERROR, handleError);
    eventBus.on(AppEvents.RESOURCE_LOADED, handleLoaded);

    return () => {
      eventBus.off(AppEvents.RESOURCE_PROGRESS, handleProgress);
      eventBus.off(AppEvents.RESOURCE_ERROR, handleError);
      eventBus.off(AppEvents.RESOURCE_LOADED, handleLoaded);
    };
  }, [resources]);

  useEffect(() => {
    const updateProgressBarWidth = () => {
      if (progressBarRef.current && titleRef.current) {
        progressBarRef.current.style.width = `${titleRef.current.offsetWidth}px`;
      }
    };

    updateProgressBarWidth();
    window.addEventListener('resize', updateProgressBarWidth);

    return () => {
      window.removeEventListener('resize', updateProgressBarWidth);
    };
  }, []);

  const handleExploreClick = (withMusic: boolean) => {
    onComplete(withMusic);
  };

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

        <p className="loader-text">{message}</p>

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
