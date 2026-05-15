import {type JSX, useEffect, useState} from "react";
import {datetimeManager, type SeasonChangedData, type SeasonType} from "common-three";
import {Haptics} from "/@/utils";
import "./index.scss";


export interface SeasonToggleProps {
    onSeasonChange?: (season: string) => void;
}

const SeasonToggle: ({onSeasonChange}: SeasonToggleProps) => JSX.Element = (props) => {

    const [currentSeason, setCurrentSeason] = useState<SeasonType>(() => datetimeManager.getCurrentSeason());

    const seasons: Array<{ id: SeasonType; icon: string; className: string }> = [
        { id: 'spring', icon: 'fas fa-seedling', className: 'spring' },
        { id: 'autumn', icon: 'fa-brands fa-canadian-maple-leaf', className: 'autumn' },
        { id: 'winter', icon: 'fas fa-snowflake', className: 'winter' },
        { id: 'summer', icon: 'fas fa-sun', className: 'summer' },
        { id: 'rainy', icon: 'fas fa-cloud-rain', className: 'rainy' },
    ];

    useEffect(() => {
        // 监听季节变化
        const handleSeasonChange = (data: SeasonChangedData) => {
            setCurrentSeason(data.currentSeason);
            props.onSeasonChange?.(data.currentSeason);
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

        // 触发自定义事件
        window.dispatchEvent(
            new CustomEvent('seasonChange', {
                detail: {
                    season: seasonId,
                    oldSeason: currentSeason,
                    timestamp: datetimeManager.getCurrentTime(),
                },
            })
        );

        // 更新本地状态
        setCurrentSeason(seasonId);
        props.onSeasonChange?.(seasonId);

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

}

export default SeasonToggle;
