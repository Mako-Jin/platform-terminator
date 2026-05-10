import {MusicManager} from "/@/manager";
import MusicControl from "/@/views/controls/music.tsx";


interface ControlPanelProps {
    visible?: boolean;
    musicManager?: MusicManager;
    onSeasonChange?: (season: string) => void;
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

    return (
        <div id="control-panel" className="show">
            {/* 音乐控制 */}
            {musicManager && <MusicControl musicManager={musicManager} />}
        </div>
    );

}


export default ControlPanel;
