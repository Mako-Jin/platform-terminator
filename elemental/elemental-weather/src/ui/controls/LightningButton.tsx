import { useEffect, useState, useCallback } from 'react';
import { LoggerFactory } from 'common-tools';
import {datetimeManager, type SeasonChangedData} from "common-three";

interface LightningButtonProps {
  onStrike?: () => void;
}

const LightningButton: ({onStrike}: { onStrike: any }) => (null | JSX.Element) = ({ onStrike }) => {
  const logger = LoggerFactory.create('LightningButton');
  const [isVisible, setIsVisible] = useState(false);
  const [isStriking, setIsStriking] = useState(false);

  useEffect(() => {
    // 监听季节变化，只在 rainy 季节显示
    const handleSeasonChange = (data: SeasonChangedData) => {
      const shouldShow = data.currentSeason === 'rainy' || data.currentSeason === 'rain';
      setIsVisible(shouldShow);
      logger.debug(`Lightning button visibility: ${shouldShow} (season: ${data.currentSeason})`);
    };

    // 初始化检查
    const currentSeason = datetimeManager.getCurrentSeason();
    handleSeasonChange({
      currentSeason: currentSeason,
      previousSeason: "",
      solarTerm: "",
      date: "",
      timestamp: ""
    } as SeasonChangedData);

    // 订阅季节变化事件
    datetimeManager.onSeasonChanged(handleSeasonChange);

    return () => {
      datetimeManager.offSeasonChanged(handleSeasonChange);
    };
  }, [datetimeManager, logger]);

  const handleClick = useCallback(() => {
    // 触觉反馈
    if ('haptic' in navigator) {
      (navigator as any).haptic('error');
    } else if (navigator.vibrate) {
      navigator.vibrate([50, 30, 100, 50, 200]);
    }

    // 触发动画
    setIsStriking(true);
    setTimeout(() => {
      setIsStriking(false);
    }, 400);

    // 调用回调
    onStrike?.();
    logger.info('Lightning triggered');
  }, [onStrike, logger]);

  if (!isVisible) return null;

  return (
    <div className={`lightning-btn-wrapper ${isStriking ? 'striking' : ''} show`}>
      <button
        id="lightning-strike"
        className="control-btn lightning-btn"
        title="Strike Lightning"
        onClick={handleClick}
      >
        <i className="fas fa-bolt" />
      </button>
      <div className="electric-arcs">
        <span className="arc arc-1" />
        <span className="arc arc-2" />
        <span className="arc arc-3" />
        <span className="arc arc-4" />
      </div>
    </div>
  );
};

export default LightningButton;
