import { useEffect, useState } from 'react';
import SeasonToggle from './SeasonToggle';
import DayNightToggle from './DayNightToggle';
import MusicControl from './MusicControl';
import LightningButton from './LightningButton';
import {LoggerFactory} from "common-tools";

interface ControlPanelProps {
  visible?: boolean;
  musicManager?: any;
  onSeasonChange?: (season: string) => void;
  onTimeChange?: (time: string) => void;
}

const ControlPanel: (
    { visible, musicManager, onSeasonChange, onTimeChange} : ControlPanelProps
) => (null | JSX.Element) = ({
  visible = false,
  musicManager,
  onSeasonChange,
  onTimeChange,
}) => {

  const logger = LoggerFactory.create("weather-control");

  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  if (!isVisible) return null;

  return (
    <div id="control-panel" className="show">
      {/* 昼夜切换 */}
      <DayNightToggle onTimeChange={onTimeChange} />

      {/* 季节切换 */}
      <SeasonToggle onSeasonChange={onSeasonChange} />

      {/* 闪电按钮（仅雨天显示） */}
      <LightningButton onStrike={() => {
          logger.debug('Lightning struck!');
      }} />

      {/* 音乐控制 */}
      {musicManager && <MusicControl musicManager={musicManager} />}
    </div>
  );
};

export default ControlPanel;
