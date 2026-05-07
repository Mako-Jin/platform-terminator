import { useEffect, useState } from 'react';

export interface MusicControlProps {
  musicManager?: any;
}

const MusicControl: React.FC<MusicControlProps> = ({ musicManager }) => {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!musicManager) return;

    // 监听音乐状态变化
    const handleMusicChange = () => {
      setIsMuted(musicManager.isMuted || !musicManager.isPlaying);
    };

    // 初始状态
    handleMusicChange();

    // 如果有事件系统，可以监听
    // musicManager.on('stateChange', handleMusicChange);

    return () => {
      // musicManager.off('stateChange', handleMusicChange);
    };
  }, [musicManager]);

  const handleToggle = () => {
    if (!musicManager) return;

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    // 切换音乐状态
    if (isMuted) {
      musicManager.resume();
    } else {
      musicManager.pause();
    }

    setIsMuted(!isMuted);
  };

  return (
    <button
      id="music-control"
      className={isMuted ? 'muted' : ''}
      title={isMuted ? 'Enable Music' : 'Disable Music'}
      onClick={handleToggle}
    >
      <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-music'}`}></i>
    </button>
  );
};

export default MusicControl;
