import {MusicManager} from "/src/manager";
import {eventBus, LoggerFactory} from "common-tools";
import {useCallback, useEffect, useState} from "react";
import "./index.scss";


declare global {
    interface Navigator {
        haptic?: (params: Array<{ intensity: number; sharpness: number }>) => void;
    }
}


export interface MusicControlProps {
    musicManager?: MusicManager;
}


const MusicControl: ({musicManager}: MusicControlProps) => JSX.Element = ({ musicManager }) => {

    const logger = LoggerFactory.create('weather-control-music');

    const [isMusicEnabled, setIsMusicEnabled] = useState(false);

    const [isVisible, setIsVisible] = useState(false);

    const handleToggle = useCallback(() => {
        if (!musicManager) {
            return;
        }

        // 触觉反馈
        if (navigator.haptic) {
            navigator.haptic([{ intensity: 0.7, sharpness: 0.1 }]);
        } else if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        const currentState = musicManager.getIsMusicEnabled();

        if (currentState) {
            musicManager.pauseMusic();
            logger.info('Music paused by user');
        } else {
            musicManager.resumeMusic();
            logger.info('Music resumed by user');
        }

    }, [musicManager, logger]);

    useEffect(() => {
        if (!musicManager) {
            return;
        }

        setIsMusicEnabled(musicManager.getIsMusicEnabled());

        const handleMusicEnabledChange = (data: { enabled: boolean }) => {
            setIsMusicEnabled(data.enabled);
            logger.debug(`Music enabled state changed: ${data.enabled}`);
        };

        eventBus.on(MusicManager.ELEMENTAL_WEATHER_MUSIC_ENABLED_CHANGED, handleMusicEnabledChange);

        // ✅ 延迟显示按钮，等待动画就绪
        const timer = setTimeout(() => {
            setIsVisible(true);
            logger.info('Music control button shown');
        }, 1000);

        return () => {
            clearTimeout(timer);
            eventBus.off(MusicManager.ELEMENTAL_WEATHER_MUSIC_ENABLED_CHANGED, handleMusicEnabledChange);
        };
    }, [musicManager, logger]);

    return (
        <button
            id="music-control"
            className={`control-btn ${!isMusicEnabled ? 'muted' : ''} ${isVisible ? 'show' : ''}`}
            title={isMusicEnabled ? 'Disable Music' : 'Enable Music'}
            onClick={handleToggle}
        >
            <i className={`fas ${isMusicEnabled ? 'fa-music' : 'fa-volume-mute'}`} />
        </button>
    );

}

export default MusicControl;
