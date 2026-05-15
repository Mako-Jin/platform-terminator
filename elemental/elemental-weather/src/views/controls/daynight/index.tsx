import {type JSX, useEffect, useState} from "react";
import {datetimeManager, type TimeChangedData} from "common-three";
import {LoggerFactory} from "common-tools";
import "./index.scss";


export interface DayNightToggleProps {
    onTimeChange?: (time: string) => void;
}

const DayNightToggle: ({onTimeChange}: DayNightToggleProps) => JSX.Element = ({ onTimeChange }) => {
    const logger = LoggerFactory.create('DayNightToggleButton');
    
    const [currentTime, setCurrentTime] = useState<'day' | 'night'>(
        datetimeManager.isDaytime() ? 'day' : 'night'
    );

    const timeOptions: Array<{ id: 'day' | 'night'; icon: string; className: string; title: string }> = [
        { id: 'day', icon: 'fas fa-sun', className: 'day', title: 'Day' },
        { id: 'night', icon: 'fas fa-moon', className: 'night', title: 'Night' },
    ];

    useEffect(() => {
        // 监听时间变化（每分钟更新）
        const handleTimeChanged = (data: TimeChangedData) => {
        logger.info('Time changed:', data);
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
    }, [currentTime, logger, onTimeChange]);

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
                    timestamp: datetimeManager.getCurrentTime(),
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
