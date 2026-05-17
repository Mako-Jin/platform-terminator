import {MusicManager} from "/@/manager";
import MusicControl from "/@/views/controls/music";
import "./index.scss";
import LightningButton from "/@/views/controls/lightning";
import {LoggerFactory} from "common-tools";
import SeasonToggle from "/@/views/controls/seasons";
import type {JSX} from "react";
import DayNightToggle from "/@/views/controls/daynight";
import type {SeasonType} from "common-three";


interface ControlPanelProps {
    visible?: boolean;
    musicManager?: MusicManager;
    onSeasonChange?: (season: SeasonType) => void;
    onTimeChange?: (time: string) => void;
    onLightningStrike?: () => void;
}


const ControlPanel: (
    {visible, musicManager, onSeasonChange, onTimeChange, onLightningStrike}: ControlPanelProps
) => (null | JSX.Element) = ({
    visible = false,
    musicManager,
    onSeasonChange,
    onTimeChange,
    onLightningStrike,
}) => {

    const logger = LoggerFactory.create("weather-control-panel");

    return (
        <div id="control-panel" className="show">

            {/* 季节切换 */}
            <SeasonToggle onSeasonChange={onSeasonChange} />

            {/* 昼夜切换 */}
            <DayNightToggle onTimeChange={onTimeChange} />

            {/* 音乐控制 */}
            {musicManager && <MusicControl musicManager={musicManager} />}

            {/* 闪电按钮（仅雨天显示） */}
            <LightningButton
                onStrike={() => {
                    logger.debug('Lightning struck!');
                    onLightningStrike?.();
                }}
            />
        </div>
    );

}


export default ControlPanel;
