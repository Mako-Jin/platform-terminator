import {type JSX, useEffect, useState} from "react";
import {Haptics} from "/@/utils";
import "./index.scss";
import type {WeatherChangedData, WeatherType} from "/@/manager/weather/types.ts";
import {weatherManager} from "/@/manager/weather/manager.ts";


export interface WeatherToggleProps {
    onWeatherChange?: (weather: WeatherType) => void;
}

const WeatherToggle: ({onWeatherChange}: WeatherToggleProps) => JSX.Element = (props) => {

    const [currentWeather, setCurrentWeather] = useState<WeatherType>('sunny');

    const weathers: Array<{ id: WeatherType; icon: string; className: string; title: string }> = [
        { id: 'sunny', icon: 'fas fa-sun', className: 'sunny', title: 'Sunny' },
        { id: 'cloudy', icon: 'fas fa-cloud', className: 'cloudy', title: 'Cloudy' },
        { id: 'rainy', icon: 'fas fa-cloud-rain', className: 'rainy', title: 'Rainy' },
        { id: 'snowy', icon: 'fas fa-snowflake', className: 'snowy', title: 'Snowy' },
        { id: 'foggy', icon: 'fas fa-smog', className: 'foggy', title: 'Foggy' },
    ];

    useEffect(() => {
        // 监听季节变化
        const handleWeatherChange = (data: WeatherChangedData) => {
            setCurrentWeather(data.currentWeather);
            props.onWeatherChange?.(data.currentWeather);
        };

        weatherManager.onWeatherChanged(handleWeatherChange);

        return () => {
            weatherManager.offWeatherChanged(handleWeatherChange);
        };
    }, [props]);

    const handleWeatherClick = (weatherId: WeatherType) => {
        if (weatherId === currentWeather) {
            return;
        }

        Haptics.buttonTap();

        weatherManager.setWeather(weatherId);

        // 更新本地状态
        setCurrentWeather(weatherId);
        props.onWeatherChange?.(weatherId);
    };

    return (
        <div className="control-panel-group weather-menu">
            {weathers.map((weather) => (
                <button
                    key={weather.id}
                    className={`weather-button ${weather.className} ${
                        currentWeather === weather.id ? 'active' : ''
                    }`}
                    data-season={weather.id}
                    title={weather.title}
                    onClick={() => handleWeatherClick(weather.id)}
                >
                    <i className={weather.icon}/>
                </button>
            ))}
        </div>
    );

}

export default WeatherToggle;
