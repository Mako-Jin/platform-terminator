import {SCENE_ASSETS, WORLD_ASSETS} from "../resources";


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
    assetWhitelist: [...WORLD_ASSETS, ...SCENE_ASSETS].map(asset => asset.id),
    showUI: true,
};

