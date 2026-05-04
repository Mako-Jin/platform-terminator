

/**
 * 场景配置
 */
export interface SceneConfig {
    /** 背景色 */
    backgroundColor?: string | number;
    /** 背景透明度 */
    backgroundAlpha?: number;
    /** 是否启用雾效 */
    fog?: boolean;
    /** 雾效颜色 */
    fogColor?: string | number;
    /** 雾效近距 */
    fogNear?: number;
    /** 雾效远距 */
    fogFar?: number;
    /** 是否启用雾化（指数雾） */
    fogExp2?: boolean;
    /** 雾效密度（指数雾） */
    fogDensity?: number;
    /** 环境光颜色 */
    ambientLightColor?: string | number;
    /** 环境光强度 */
    ambientLightIntensity?: number;
    /** 是否自动添加默认灯光 */
    autoAddLights?: boolean;
}
