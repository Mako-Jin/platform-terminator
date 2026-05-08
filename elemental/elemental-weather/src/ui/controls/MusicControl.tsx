import { useEffect, useState, useCallback } from 'react';
import { LoggerFactory } from 'common-tools';

export interface MusicControlProps {
  musicManager?: any;
}

const MusicControl: ({musicManager}: { musicManager: any }) => JSX.Element = ({ musicManager }) => {
  const logger = LoggerFactory.create('MusicControl');
  const [isMuted, setIsMuted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!musicManager) return;

    const handleMusicChange = () => {
      const muted = musicManager.isMuted || !musicManager.isPlaying;
      setIsMuted(muted);
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

  const handleToggle = useCallback(() => {
    if (!musicManager) return;

    // 触觉反馈
    if ('haptic' in navigator) {
      (navigator as any).haptic([{ intensity: 0.7, sharpness: 0.1 }]);
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    // 切换音乐状态
    if (isMuted) {
      musicManager.resumeMusic?.() || musicManager.resume?.();
      logger.info('Music enabled');
    } else {
      musicManager.pauseMusic?.() || musicManager.pause?.();
      logger.info('Music disabled');
    }

    setIsMuted(!isMuted);
  }, [musicManager, isMuted, logger]);

  if (!musicManager) return null;

  return (
    <button
      id="music-control"
      className={`control-btn ${isMuted ? 'muted' : ''} ${isVisible ? 'show' : ''}`}
      title={isMuted ? 'Enable Music' : 'Disable Music'}
      onClick={handleToggle}
    >
      <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-music'}`} />
    </button>
  );
};

export default MusicControl;
