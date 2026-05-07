import { useEffect, useState } from 'react';
import { datetimeManager } from 'common-three';
import type {TimeChangedData} from "common-three";

export interface DayNightToggleProps {
  onTimeChange?: (time: string) => void;
}

const DayNightToggle: ({onTimeChange}: { onTimeChange: TimeChangedData }) => JSX.Element = ({ onTimeChange }) => {
  const [currentTime, setCurrentTime] = useState<'day' | 'night'>(
      datetimeManager.isDaytime() ? 'day' : 'night'
  );

  const timeOptions = [
    { id: 'day', icon: 'fas fa-sun', className: 'day', title: 'Day' },
    { id: 'night', icon: 'fas fa-moon', className: 'night', title: 'Night' },
  ];

  useEffect(() => {
    // 监听时间变化（每分钟更新）
    const handleTimeChanged = (data: any) => {
      const isDay = datetimeManager.isDaytime();
      const newTime = isDay ? 'day' : 'night';

      if (newTime !== currentTime) {
        setCurrentTime(newTime);
        onTimeChange?.(newTime);
      }
    };

    datetimeManager.onTimeChanged(handleTimeChanged);

    return () => {
      datetimeManager.offTimeChanged(handleTimeChanged);
    };
  }, [currentTime, onTimeChange]);

  const handleTimeClick = (timeId: 'day' | 'night') => {
    if (timeId === currentTime) {
      return;
    }

    // 触觉反馈（移动端）
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    // 更新本地状态并触发事件
    setCurrentTime(timeId);

    window.dispatchEvent(
        new CustomEvent('timeChange', {
          detail: {
            time: timeId,
            oldTime: currentTime,
            timestamp: Date.now(),
          },
        })
    );

    onTimeChange?.(timeId);
  };

  return (
    <div className="control-panel-group" id="daynight-toggle">
      {timeOptions.map((option) => (
        <button
          key={option.id}
          className={`daynight-button ${option.className} ${
            currentTime === option.id ? 'active' : ''
          }`}
          data-time={option.id}
          title={option.title}
          onClick={() => handleTimeClick(option.id)}
        >
          <i className={option.icon}/>
        </button>
      ))}
    </div>
  );
};

export default DayNightToggle;
