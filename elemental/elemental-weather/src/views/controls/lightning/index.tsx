import {LoggerFactory} from "common-tools";
import {type JSX, useCallback, useEffect, useState} from "react";
import "./index.scss";
import {datetimeManager, type SeasonChangedData} from "common-three";


interface LightningButtonProps {
    onStrike?: () => void;
}


const LightningButton: (props: LightningButtonProps) => JSX.Element = (props) => {

    const logger = LoggerFactory.create('LightningButton');

    const [isStriking, setIsStriking] = useState(false);

    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleSeasonChange = (data: SeasonChangedData) => {
            const shouldShow = data.currentSeason === 'rainy';
            setIsVisible(shouldShow);
            logger.debug(`Lightning button visibility: ${shouldShow} (season: ${data.currentSeason})`);
        };

        const currentSeason = datetimeManager.getCurrentSeason();
        handleSeasonChange({
            currentSeason: currentSeason,
            previousSeason: currentSeason,
            solarTerm: "",
            date: "",
            timestamp: ""
        } as unknown as SeasonChangedData);

        datetimeManager.onSeasonChanged(handleSeasonChange);

        return () => {
            datetimeManager.offSeasonChanged(handleSeasonChange);
        };
    }, [logger]);

    const handleClick = useCallback(() => {
        if ('haptic' in navigator) {
            (navigator as any).haptic('error');
        } else if (navigator.vibrate) {
            navigator.vibrate([50, 30, 100, 50, 200]);
        }

        setIsStriking(true);
        setTimeout(() => {
            setIsStriking(false);
        }, 400);

        props.onStrike?.();
        logger.info('Lightning triggered');
    }, [props, logger]);
    

    return isVisible ? (
        <div className={`lightning-btn-wrapper show ${isStriking ? 'striking' : ''}`}>
            <button
                id="lightning-strike"
                className="lightning-btn"
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
    ) : null;
    
}



export default LightningButton;
