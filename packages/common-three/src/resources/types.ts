import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {AudioLoader, CubeTextureLoader, TextureLoader} from "three";

// 'cubeMap' - 立方体贴图
// 'texture' - 纹理贴图
// 'gltfModelCompressed' - 压缩的 GLTF 模型
// 'audio' - 音频文件
export type AssetType = 'cubeMap' | 'texture' | 'gltfModelCompressed' | 'audio';

export interface Asset {
    id: string;
    type: AssetType;
    path: string | string[];
}

/**
 * 加载器映射
 */
export interface LoaderMap {
    dracoLoader: DRACOLoader;
    gltfCompressLoader: GLTFLoader;
    gltfLoader: GLTFLoader;
    textureLoader: TextureLoader;
    hdriLoader: HDRLoader;
    cubeTextureLoader: CubeTextureLoader;
    audioLoader: AudioLoader;
}

/**
 * 资源加载基础数据
 */
interface ResourceBaseData {
    /** 已加载数量 */
    itemsLoaded: number;
    /** 总数量 */
    itemsTotal: number;
    /** 加载进度百分比 (0-100) */
    percent: number;
}

/**
 * 资源进度数据
 */
export interface ResourceProgressData extends ResourceBaseData {
    /** 资源唯一标识符 */
    assetId: string;
    /** 当前加载的资源 URL */
    currentUrl?: string;
    /** 加载耗时(ms) */
    duration?: number;
}

/**
 * 资源加载完成数据
 */
export interface ResourceLoadedData extends ResourceBaseData {
    /** 加载总耗时(ms) */
    totalDuration: number;
    /** 失败的资源列表 */
    failedUrls?: string[];
}

/**
 * 资源错误数据
 */
export interface ResourceErrorData {
    /** 资源唯一标识符 */
    assetId: string;
    /** 出错的 URL */
    url: string;
    /** 错误类型 */
    errorType: 'network' | 'timeout' | 'abort' | 'decode' | 'unknown';
    /** 错误对象 */
    error?: Error;
    /** 已加载数量 */
    itemsLoaded: number;
    /** 总数量 */
    itemsTotal: number;
    /** 重试次数 */
    retryCount?: number;
}

