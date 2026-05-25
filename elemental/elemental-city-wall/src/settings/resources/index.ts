import type {Asset} from "common-three";


export const WORLD_ASSETS: Asset[] = [];

/**
 * 场景装饰资源 - 非 qiankun 场景下额外加载这些
 */
export const SCENE_ASSETS: Asset[] = [];

/**
 * 所有资源 - 非 qiankun 场景下使用
 */
export const ASSETS: Asset[] = [
    ...WORLD_ASSETS,
    ...SCENE_ASSETS,
];
