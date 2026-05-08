import { useEffect, useState } from 'react';
import { datetimeManager } from 'common-three';
import type { SeasonType, SeasonChangedData } from 'common-three';
import {Haptics} from "../../utils/haptics";

export interface SeasonToggleProps {
  onSeasonChange?: (season: string) => void;
}

const SeasonToggle: ({onSeasonChange}: { onSeasonChange: any }) => JSX.Element = ({ onSeasonChange }) => {
  const [currentSeason, setCurrentSeason] = useState<SeasonType>('spring');

  const seasons: Array<{ id: SeasonType; icon: string; className: string }> = [
    { id: 'spring', icon: 'fas fa-seedling', className: 'spring' },
    { id: 'autumn', icon: 'fa-brands fa-canadian-maple-leaf', className: 'autumn' },
    { id: 'winter', icon: 'fas fa-snowflake', className: 'winter' },
    // { id: 'summer', icon: 'fas fa-sun', className: 'summer' },
    { id: 'rainy', icon: 'fas fa-cloud-rain', className: 'rainy' },
  ];

  useEffect(() => {
    // 初始化当前季节
    setCurrentSeason(datetimeManager.getCurrentSeason());

    // 监听季节变化
    const handleSeasonChange = (data: SeasonChangedData) => {
      setCurrentSeason(data.currentSeason);
      onSeasonChange?.(data.currentSeason);
    };

    datetimeManager.onSeasonChanged(handleSeasonChange);

    return () => {
      datetimeManager.offSeasonChanged(handleSeasonChange);
    };
  }, [onSeasonChange]);

  const handleSeasonClick = (seasonId: string) => {
    if (seasonId === currentSeason) {
      return;
    }

    Haptics.buttonTap();

    // 触发自定义事件
    window.dispatchEvent(
      new CustomEvent('seasonChange', {
        detail: {
          season: seasonId,
          oldSeason: currentSeason,
          timestamp: Date.now(),
        },
      })
    );

    // 更新本地状态
    setCurrentSeason(seasonId);
    onSeasonChange?.(seasonId);

  };

  return (
    <div className="control-panel-group" id="season-menu">
      {seasons.map((season) => (
        <button
          key={season.id}
          className={`season-button ${season.className} ${
            currentSeason === season.id ? 'active' : ''
          }`}
          data-season={season.id}
          title={season.id.charAt(0).toUpperCase() + season.id.slice(1)}
          onClick={() => handleSeasonClick(season.id)}
        >
          <i className={season.icon}/>
        </button>
      ))}
    </div>
  );
};

export default SeasonToggle;
