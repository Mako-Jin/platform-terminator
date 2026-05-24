import type { Asset } from "common-three";
import { WEATHER_ASSETS, SCENE_ASSETS } from "../resources";

/**
 * Qiankun 微应用模式配置
 * 用于控制在 qiankun 场景下加载哪些组件和资源
 */
export interface QiankunConfig {
    /** 是否启用 qiankun 模式 */
    enabled: boolean;

    /** 组件白名单 - 只加载这些组件 */
    componentWhitelist: string[];

    /** 资源白名单 - 只加载这些资源的 ID */
    assetWhitelist: string[];

    /** 是否显示 UI 控件 */
    showUI: boolean;
}

/**
 * 默认的 qiankun 配置
 * qiankun 场景下只加载天气相关的核心组件和资源
 */
export const defaultQiankunConfig: QiankunConfig = {
    enabled: true,
    componentWhitelist: [
        'lighting',
        'skydome',
        'ground',
        'windLines',
        'rain',
        'snow',
        'lightning',
        'fog',
    ],
    assetWhitelist: WEATHER_ASSETS.map(asset => asset.id),
    showUI: false,
};

/**
 * 完整配置 - 非 qiankun 场景下使用
 */
export const fullConfig: QiankunConfig = {
    enabled: false,
    componentWhitelist: [
        'lighting',
        'skydome',
        'ground',
        'windLines',
        'rain',
        'snow',
        'lightning',
        'fog',
        'tent',
        'bridge',
        'rocks',
        'bush',
        'treeTrunks',
        'fallingLeaves',
        'camp',
        'fire',
        'fireflies',
    ],
    assetWhitelist: [...WEATHER_ASSETS, ...SCENE_ASSETS].map(asset => asset.id),
    showUI: true,
};

/**
 * 根据配置获取要加载的资源
 */
export const getAssetsForConfig = (config: QiankunConfig, allAssets: Asset[]): Asset[] => {
    return allAssets.filter(asset => config.assetWhitelist.includes(asset.id));
};

/**
 * 从 API 获取 qiankun 配置
 * @param apiUrl API 接口地址
 * @returns Promise<QiankunConfig>
 */
export const fetchQiankunConfig = async (apiUrl: string): Promise<QiankunConfig> => {
    try {
        const response = await fetch(apiUrl);
        const config = await response.json();
        // 合并默认配置，确保必要字段存在
        return { ...defaultQiankunConfig, ...config };
    } catch (error) {
        console.warn('[QiankunConfig] Failed to fetch config from API, using default:', error);
        return defaultQiankunConfig;
    }
};

/**
 * 获取当前环境的配置
 * @param apiUrl 可选的 API 接口地址，如果提供则从 API 获取配置
 * @returns Promise<QiankunConfig>
 */
export const getCurrentConfig = async (apiUrl?: string): Promise<QiankunConfig> => {
    const isQiankun = !!(window as unknown as {__POWERED_BY_QIANKUN__: boolean}).__POWERED_BY_QIANKUN__;

    if (!isQiankun) {
        return fullConfig;
    }

    if (apiUrl) {
        return fetchQiankunConfig(apiUrl);
    }

    return defaultQiankunConfig;
};
