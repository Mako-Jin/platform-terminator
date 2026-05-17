import * as Three from 'three';

/**
 * Skydome 默认颜色配置
 * 按季节和昼夜分类的天空颜色预设
 */
export interface SkyColorConfig {
    zenithColor: Three.Color;
    horizonColor: Three.Color;
    groundColor: Three.Color;
    sunColor?: Three.Color;
    sunGlowColor?: Three.Color;
    moonColor?: Three.Color;
    moonGlowColor?: Three.Color;
    starColor?: Three.Color;
}

export interface SeasonSkyColors {
    day: SkyColorConfig;
    night: SkyColorConfig;
}

export interface AllSeasonColors {
    spring: SeasonSkyColors;
    winter: SeasonSkyColors;
    autumn: SeasonSkyColors;
    rainy: SeasonSkyColors;
}

/**
 * 默认天空颜色预设
 * 参考 Elemental-Serenity-main 的实现
 */
export const DEFAULT_SKY_COLORS: AllSeasonColors = {
    spring: {
        day: {
            zenithColor: new Three.Color(0.0, 0.35, 0.82),
            horizonColor: new Three.Color(0.46, 0.74, 0.93),
            groundColor: new Three.Color(0.04, 0.55, 0.65),
            sunColor: new Three.Color(0.639, 0.494, 0.058),
            sunGlowColor: new Three.Color(1.0, 0.635, 0),
        },
        night: {
            zenithColor: new Three.Color(0.02, 0.05, 0.15),
            horizonColor: new Three.Color(0.05, 0.1, 0.25),
            groundColor: new Three.Color(0.1, 0.15, 0.3),
            moonColor: new Three.Color(0.95, 0.95, 1.0),
            moonGlowColor: new Three.Color(0x738ec4),
            starColor: new Three.Color(1.0, 1.0, 1.0),
        },
    },
    winter: {
        day: {
            zenithColor: new Three.Color(0.4, 0.6, 0.9),
            horizonColor: new Three.Color(0.8, 0.85, 0.95),
            groundColor: new Three.Color(0.9, 0.92, 0.98),
            sunColor: new Three.Color(0.95, 0.95, 1.0),
            sunGlowColor: new Three.Color(0.8, 0.9, 1.0),
        },
        night: {
            zenithColor: new Three.Color(0.01, 0.03, 0.12),
            horizonColor: new Three.Color(0.03, 0.08, 0.2),
            groundColor: new Three.Color(0.08, 0.12, 0.25),
            moonColor: new Three.Color(1.0, 1.0, 1.0),
            moonGlowColor: new Three.Color(0.8, 0.9, 1.0),
            starColor: new Three.Color(0.9, 0.95, 1.0),
        },
    },
    autumn: {
        day: {
            zenithColor: new Three.Color(0.6, 0.4, 0.2),
            horizonColor: new Three.Color(0.35, 0.66, 0.72),
            groundColor: new Three.Color(1.0, 0.7, 0.4),
            sunColor: new Three.Color(0.89, 0.75, 0.06),
            sunGlowColor: new Three.Color(0.94, 0.53, 0),
        },
        night: {
            zenithColor: new Three.Color(0.08, 0.04, 0.08),
            horizonColor: new Three.Color(0.15, 0.08, 0.12),
            groundColor: new Three.Color(0.25, 0.15, 0.2),
            moonColor: new Three.Color(1, 0.5, 0.21),
            moonGlowColor: new Three.Color(0xe5a55d),
            starColor: new Three.Color(1.0, 0.9, 0.8),
        },
    },
    rainy: {
        day: {
            zenithColor: new Three.Color(0.25, 0.3, 0.4),
            horizonColor: new Three.Color(0.4, 0.5, 0.6),
            groundColor: new Three.Color(0.5, 0.6, 0.7),
            sunColor: new Three.Color(0.7, 0.7, 0.8),
            sunGlowColor: new Three.Color(0.6, 0.6, 0.7),
        },
        night: {
            zenithColor: new Three.Color(0.03, 0.05, 0.08),
            horizonColor: new Three.Color(0.06, 0.1, 0.15),
            groundColor: new Three.Color(0.1, 0.15, 0.2),
            moonColor: new Three.Color(0.6, 0.7, 0.8),
            moonGlowColor: new Three.Color(0.5, 0.6, 0.8),
            starColor: new Three.Color(0.7, 0.8, 0.9),
        },
    },
};

/**
 * 默认 Uniform 初始值
 */
export const DEFAULT_UNIFORMS = {
    uZenithColor: new Three.Color(0.2, 0.5, 0.9),
    uHorizonColor: new Three.Color(0.7, 0.85, 0.95),
    uGroundColor: new Three.Color(0.95, 0.9, 0.85),

    uSunPosition: new Three.Vector3(-0.846, -0.085, -1.0),
    uSunColor: new Three.Color(1.0, 0.95, 0.8),
    uSunGlowColor: new Three.Color(1.0, 0.7, 0.3),
    uSunSize: 0.005,
    uSunGlowSize: 0.03386,
    uSunRayCount: 12.0,
    uSunRayLength: 0.0352,
    uSunRaySharpness: 8.0,

    uMoonPosition: new Three.Vector3(-0.5, -0.085, -1.0),
    uMoonColor: new Three.Color(0.95, 0.95, 1.0),
    uMoonGlowColor: new Three.Color(0.7, 0.8, 1.0),
    uMoonSize: 0.0268665,
    uMoonGlowSize: 0.0266345,

    uStarColor: new Three.Color(1.0, 1.0, 1.0),
    uStarDensity: 10.0,
    uStarBrightness: 2.5,

    uTime: 0,
    uIsNight: 0.0,
    uSeason: 0.0,
    uAtmosphereIntensity: 0.0,
};

/**
 * 季节到数值的映射
 */
export const SEASON_MAP: Record<string, number> = {
    spring: 0,
    winter: 1,
    autumn: 2,
    rainy: 3,
};

/**
 * 几何体默认参数
 */
export const GEOMETRY_DEFAULTS = {
    radius: 150,
    widthSegments: 32,
    heightSegments: 16,
};