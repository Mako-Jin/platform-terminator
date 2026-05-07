import { useEffect, useState } from 'react';
import { datetimeManager } from 'common-three';

interface LightningButtonProps {
  onStrike?: () => void;
}

const LightningButton: ({onStrike}: { onStrike: any }) => (null | JSX.Element) = ({ onStrike }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isStriking, setIsStriking] = useState(false);

  useEffect(() => {
    // 监听季节变化，只在 rainy 季节显示
    const handleSeasonChange = (data: any) => {
      setIsVisible(data.season === 'rainy' || data.season === 'rain');
    };

    // 初始化检查
    const currentSeason = datetimeManager.getCurrentSeason();
    setIsVisible(currentSeason === 'rainy' || currentSeason === 'rain');

    // 订阅季节变化事件
    window.addEventListener('seasonChange', ((event: CustomEvent) => {
      handleSeasonChange(event.detail);
    }) as EventListener);

    return () => {
      window.removeEventListener('seasonChange', (() => {}) as EventListener);
    };
  }, []);

  const handleClick = () => {
    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 100, 50, 200]);
    }

    // 触发动画
    setIsStriking(true);
    setTimeout(() => {
      setIsStriking(false);
    }, 400);

    // 调用回调
    onStrike?.();
  };

  if (!isVisible) return null;

  return (
    <div className={`lightning-btn-wrapper ${isStriking ? 'striking' : ''} show`}>
      <button
        id="lightning-strike"
        className="control-btn lightning-btn"
        title="Strike Lightning"
        onClick={handleClick}
      >
        <i className="fas fa-bolt"/>
      </button>
      <div className="electric-arcs">
        <span className="arc arc-1"/>
        <span className="arc arc-2"/>
        <span className="arc arc-3"/>
        <span className="arc arc-4"/>
      </div>
    </div>
  );
};

export default LightningButton;
