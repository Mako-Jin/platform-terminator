import {type JSX, useEffect, useState} from "react";
import {datetimeManager, type SeasonChangedData, type SeasonType} from "common-three";
import {Haptics} from "/@/utils";
import "./index.scss";


export interface SeasonToggleProps {
    onSeasonChange?: (season: SeasonType) => void;
}

const SeasonToggle: ({onSeasonChange}: SeasonToggleProps) => JSX.Element = (props) => {

    const [currentSeason, setCurrentSeason] = useState<SeasonType>(() => datetimeManager.getCurrentSeason());

    const seasons: Array<{ id: SeasonType; icon: string; className: string }> = [
        { id: 'spring', icon: 'fas fa-seedling', className: 'spring' },
        { id: 'summer', icon: 'fas fa-sun', className: 'summer' },
        { id: 'autumn', icon: 'fa-brands fa-canadian-maple-leaf', className: 'autumn' },
        { id: 'winter', icon: 'fas fa-snowflake', className: 'winter' },
    ];

    useEffect(() => {
        // 监听季节变化
        const handleSeasonChange = (data: SeasonChangedData) => {
            setCurrentSeason(data.currentSeason);
        };

        datetimeManager.onSeasonChanged(handleSeasonChange);

        return () => {
            datetimeManager.offSeasonChanged(handleSeasonChange);
        };
    }, [props]);

    const handleSeasonClick = (seasonId: SeasonType) => {
        if (seasonId === currentSeason) {
            return;
        }

        Haptics.buttonTap();

        datetimeManager.setManualSeason(seasonId);

        // 更新本地状态
        setCurrentSeason(seasonId);
        props.onSeasonChange?.(seasonId);

    };

    return (
        <div className="control-panel-group season-menu">
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

}

export default SeasonToggle;
