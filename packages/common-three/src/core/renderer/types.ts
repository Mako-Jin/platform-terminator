import * as Three from 'three';

/**
 * 渲染器配置
 */
export interface RendererConfig {
    /** 抗锯齿 */
    antialias?: boolean;
    /** Alpha 通道 */
    alpha?: boolean;
    /** 设备像素比 */
    pixelRatio?: number;
    /** 是否启用阴影 */
    shadows?: boolean;
    /** 阴影类型 */
    shadowType?: Three.ShadowMapType;
    /** 输出颜色空间 */
    outputColorSpace?: string;
    /** 色调映射 */
    toneMapping?: Three.ToneMapping;
    /** 色调映射曝光 */
    toneMappingExposure?: number;
    /** 背景色 */
    backgroundColor?: string | number;
    /** 背景透明度 */
    backgroundAlpha?: number;
}

