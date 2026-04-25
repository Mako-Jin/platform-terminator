


// interface WeatherSettings {
//     enabled: boolean;           // 是否启用天气系统
//     autoLocation: boolean;      // 自动定位
//     city: string;               // 手动设置的城市
//     refreshInterval: number;    // 刷新间隔(分钟)
//     effectIntensity: 'light' | 'medium' | 'heavy' | 'ultra';  // 效果强度
//     showWidget: boolean;        // 是否显示天气小组件
// }
//
// interface WeatherState {
//     // 状态
//     settings: WeatherSettings;
//     currentWeather: WeatherData | null;
//     isLoading: boolean;
//     error: string | null;
//
//     // Actions
//     updateSettings: (settings: Partial<WeatherSettings>) => void;
//     toggleWeather: (enabled: boolean) => void;
//     setCurrentWeather: (weather: WeatherData) => void;
//     setLoading: (loading: boolean) => void;
//     setError: (error: string | null) => void;
//     reset: () => void;
// }
//
// const defaultSettings: WeatherSettings = {
//     enabled: true,  // 默认关闭，需要用户手动开启
//     autoLocation: true,
//     city: 'Shanghai',
//     refreshInterval: 10,
//     effectIntensity: 'medium',
//     showWidget: true
// };

