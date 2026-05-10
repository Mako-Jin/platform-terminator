import {MusicManager} from "/@/manager";
import {LoggerFactory} from "common-tools";
import {useCallback, useEffect, useState} from "react";


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

        // 切换音乐状态
        if (isMusicEnabled) {
            musicManager.resumeMusic?.() || musicManager.resume?.();
            logger.info('Music enabled');
        } else {
            musicManager.pauseMusic?.() || musicManager.pause?.();
            logger.info('Music disabled');
        }

        setIsMusicEnabled(!isMusicEnabled);
    }, [musicManager, isMusicEnabled, logger]);

    useEffect(() => {
        if (!musicManager) {
            return;
        }

        const handleMusicChange = () => {
            const muted = musicManager.isMuted || !musicManager.isPlaying;
            setIsMusicEnabled(muted);
            logger.debug(`Music state changed: ${muted ? 'muted' : 'playing'}`);
        };

        handleMusicChange();

        // ✅ 延迟显示按钮，等待动画就绪
        const timer = setTimeout(() => {
            setIsVisible(true);
            logger.info('Music control button shown');
        }, 1000);

        return () => {
            clearTimeout(timer);
        };
    }, [musicManager, logger]);

    return (
        <button
            id="music-control"
            className={`control-btn ${isMusicEnabled ? 'muted' : ''} ${isVisible ? 'show' : ''}`}
            title={isMusicEnabled ? 'Enable Music' : 'Disable Music'}
            onClick={handleToggle}
        >
            <i className={`fas ${isMusicEnabled ? 'fa-volume-mute' : 'fa-music'}`} />
        </button>
    );

}

export default MusicControl;
