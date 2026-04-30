import type {EventMap} from "common-shared";


export const WeatherEvents = {
    TIME_CHANGED: 'weather:time:changed',
    TIME_MODE_CHANGED: 'weather:time:mode:changed',
    TIME_RESET: 'weather:time:reset',
    TIME_QUERY: 'weather:time:query',
    TIME_SET: 'weather:time:set',
} as const;


export interface TimeChangedEventData {
    currentTime: string;
    previousTime: string;
    timestamp: number;
}


export interface WeatherEventMap extends EventMap {
    [WeatherEvents.TIME_CHANGED]: TimeChangedEventData;
}
