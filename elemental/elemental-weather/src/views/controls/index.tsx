import {MusicManager, type WeatherType} from "/@/manager";
import MusicControl from "/@/views/controls/music";
import "./index.scss";
import LightningButton from "/@/views/controls/lightning";
import {LoggerFactory} from "common-tools";
import SeasonToggle from "/@/views/controls/seasons";
import type {JSX} from "react";
import DayNightToggle from "/@/views/controls/daynight";
import type {SeasonType} from "common-three";
import WeatherToggle from "/@/views/controls/weather";


interface ControlPanelProps {
    visible?: boolean;
    musicManager?: MusicManager;
    onSeasonChange?: (season: SeasonType) => void;
    onTimeChange?: (time: string) => void;
    onLightningStrike?: () => void;
    onWeatherChange?: (weather: WeatherType) => void;
}


const ControlPanel: (
    {visible, musicManager, onSeasonChange, onTimeChange, onLightningStrike}: ControlPanelProps
) => (null | JSX.Element) = ({
    visible = false,
    musicManager,
    onSeasonChange,
    onTimeChange,
    onLightningStrike,
    onWeatherChange
}) => {

    const logger = LoggerFactory.create("weather-control-panel");

    const lightningOnStrike = () => {
        logger.debug('Lightning struck!');
        onLightningStrike?.();
    }

    return (
        <div className={`control-panel ${visible ? 'show' : ''}`}>

            {/* 季节切换 */}
            <SeasonToggle onSeasonChange={onSeasonChange} />

            {/* 昼夜切换 */}
            <DayNightToggle onTimeChange={onTimeChange} />

            {/* 天气控制 */}
            <WeatherToggle onWeatherChange={onWeatherChange} />

            {/* 闪电按钮（仅雨天显示） */}
            <LightningButton
                onStrike={lightningOnStrike}
            />

            {/* 音乐控制 */}
            {musicManager && <MusicControl musicManager={musicManager} />}
        </div>
    );

}


export default ControlPanel;
