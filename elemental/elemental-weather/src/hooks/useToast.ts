import { useState, useCallback } from 'react';

export interface ToastConfig {
    id: string;
    message: string;
    type?: 'info' | 'success' | 'error' | 'warning' | 'season' | 'daynight' | 'music' | 'weather';
    icon?: string;
    gradient?: string;
    label?: string;
    duration?: number;
}

const useToast = () => {
    const [toasts, setToasts] = useState<ToastConfig[]>([]);

    const addToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { ...config, id }]);
        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showSeasonToast = useCallback(
        (season: string) => {
            let icon: string;
            let gradient: string;
            let displayName: string;

            switch (season) {
                case 'spring':
                    icon = 'fas fa-seedling';
                    gradient = 'linear-gradient(145deg, #34d399, #10b981)';
                    displayName = 'Blooming Spring';
                    break;
                case 'summer':
                    icon = 'fas fa-sun';
                    gradient = 'linear-gradient(145deg, #fbbf24, #f59e0b)';
                    displayName = 'Sunny Summer';
                    break;
                case 'autumn':
                case 'fall':
                    icon = 'fa-brands fa-canadian-maple-leaf';
                    gradient = 'linear-gradient(145deg, #fb923c, #f97316)';
                    displayName = 'Cozy Autumn';
                    break;
                case 'winter':
                    icon = 'fas fa-snowflake';
                    gradient = 'linear-gradient(145deg, #60a5fa, #3b82f6)';
                    displayName = 'Frosty Winter';
                    break;
                default:
                    icon = 'fas fa-cloud-seedling';
                    gradient = 'linear-gradient(145deg, #34d399, #10b981)';
                    displayName = 'Blooming Spring';
            }

            addToast({
                message: displayName,
                type: 'season',
                icon,
                gradient,
                label: 'Season Changed',
                duration: 3000,
            });
        },
        [addToast]
    );

    const showDayNightToast = useCallback(
        (timeOfDay: string) => {
            const isDay = timeOfDay === 'day';
            addToast({
                message: isDay ? 'Daytime' : 'Nighttime',
                type: 'daynight',
                icon: isDay ? 'fas fa-sun' : 'fas fa-moon',
                gradient: isDay
                    ? 'linear-gradient(145deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(145deg, #818cf8, #6366f1)',
                label: 'Time Changed',
                duration: 3000,
            });
        },
        [addToast]
    );

    const showMusicToast = useCallback(
        (trackName: string) => {
            addToast({
                message: trackName,
                type: 'music',
                icon: 'fas fa-music',
                gradient: 'linear-gradient(145deg, #8b5cf6, #7c3aed)',
                label: 'Now Playing',
                duration: 4000,
            });
        },
        [addToast]
    );

    const showWeatherToast = useCallback(
        (weather: string) => {
            let icon: string;
            let gradient: string;
            let displayName: string;

            switch (weather) {
                case 'sunny':
                    icon = 'fas fa-sun';
                    gradient = 'linear-gradient(145deg, #fbbf24, #f59e0b)';
                    displayName = 'Sunny';
                    break;
                case 'cloudy':
                    icon = 'fas fa-cloud';
                    gradient = 'linear-gradient(145deg, #9ca3af, #6b7280)';
                    displayName = 'Cloudy';
                    break;
                case 'rainy':
                    icon = 'fas fa-cloud-rain';
                    gradient = 'linear-gradient(145deg, #60a5fa, #3b82f6)';
                    displayName = 'Rainy';
                    break;
                case 'snowy':
                    icon = 'fas fa-snowflake';
                    gradient = 'linear-gradient(145deg, #e0f2fe, #bae6fd)';
                    displayName = 'Snowy';
                    break;
                case 'foggy':
                    icon = 'fas fa-smog';
                    gradient = 'linear-gradient(145deg, #d1d5db, #9ca3af)';
                    displayName = 'Foggy';
                    break;
                default:
                    icon = 'fas fa-sun';
                    gradient = 'linear-gradient(145deg, #fbbf24, #f59e0b)';
                    displayName = 'Weather Changed';
            }

            addToast({
                message: displayName,
                type: 'weather',
                icon,
                gradient,
                label: 'Weather Changed',
                duration: 3000,
            });
        },
        [addToast]
    );

    const showLightningToast = useCallback(
        () => {
            addToast({
                message: 'Lightning Strike!',
                type: 'warning',
                icon: 'fas fa-bolt',
                gradient: 'linear-gradient(145deg, #fbbf24, #f59e0b)',
                label: '⚡ Thunderstorm',
                duration: 2000,
            });
        },
        [addToast]
    );

    const showToast = useCallback(
        (message: string, type: ToastConfig['type'] = 'info', duration = 3000) => {
            addToast({ message, type, duration });
        },
        [addToast]
    );

    return {
        toasts,
        removeToast,
        showSeasonToast,
        showDayNightToast,
        showMusicToast,
        showWeatherToast,
        showLightningToast,
        showToast,
    };
};

export default useToast;
