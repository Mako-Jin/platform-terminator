import {LoggerFactory} from "common-tools";
import {type JSX, useCallback, useEffect, useState} from "react";
import "./index.scss";
import {type WeatherChangedData, weatherManager} from "/@/manager";


interface LightningButtonProps {
    onStrike?: () => void;
}


const LightningButton: (props: LightningButtonProps) => JSX.Element = (props) => {

    const logger = LoggerFactory.create('LightningButton');

    const [isStriking, setIsStriking] = useState(false);

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleWeatherChange = (data: WeatherChangedData) => {
            const shouldShow = data.currentWeather === 'rainy';
            setIsVisible(shouldShow);
            logger.debug(`Lightning button visibility: ${shouldShow} (weather: ${data.currentWeather})`);
        };

        const currentWeather = weatherManager.getCurrentWeather();
        setIsVisible(currentWeather === 'rainy');
        logger.debug(`Initial lightning button visibility: ${currentWeather === 'rainy'} (weather: ${currentWeather})`);

        weatherManager.onWeatherChanged(handleWeatherChange);

        return () => {
            weatherManager.offWeatherChanged(handleWeatherChange);
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
        }, 50);

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
