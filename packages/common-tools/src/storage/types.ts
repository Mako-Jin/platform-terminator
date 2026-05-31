
/**
 * Storage 配置接口
 */
export interface Storage<T = unknown> {
    /**
     * 检查 key 是否存在
     */
    has: (key: string) => boolean;

    /**
     * 检查 key 是否过期
     */
    isExpired?: (key: string) => boolean;

    /**
     * 设置值（支持过期时间）
     */
    set: (key: string, value: T, expires?: number) => void;

    /**
     * 获取值（自动解析 JSON）
     */
    get: (key: string) => T | null;

    /**
     * 删除值
     */
    remove: (key: string) => void;

    /**
     * 清空所有值
     */
    clear: () => void;
}


// 存储项接口
export interface StorageItem<T = unknown> {
    data: T;
    expireAt?: number;
}


/**
 * 存储选项
 */
export interface StorageOptions {

    /**
     * 命名空间（用于区分不同模块）
     */
    namespace?: string;

    /**
     * 存储前缀
     */
    prefix?: string;

    /**
     * 默认过期时间（毫秒）
     */
    defaultExpires?: number;
}

/**
 * 存储类型枚举
 */
export enum StorageType {
    LOCAL = 'local',
    SESSION = 'session',
    COOKIE = 'cookie',
}
