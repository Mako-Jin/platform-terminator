import {type HttpRequestConfig, RequestMethodEnum} from "./types.ts";
import {CONSTS} from "./constants.ts";
import {AxiosHeaders} from "axios";


/**
 * 检查 URL 是否匹配白名单模式
 * @param url 请求 URL
 * @param patterns 白名单模式数组
 * @returns 是否匹配
 */
export const matchPattern = (url: string | undefined, patterns: string[]): boolean => {
    if (!url) {
        return false;
    }
    return patterns.some(pattern => {
        // 支持精确匹配和模糊匹配
        if (pattern.startsWith('*') && pattern.endsWith('*')) {
            return url.includes(pattern.slice(1, -1));
        } else if (pattern.startsWith('*')) {
            return url.endsWith(pattern.slice(1));
        } else if (pattern.endsWith('*')) {
            return url.startsWith(pattern.slice(0, -1));
        }
        return url === pattern || url.includes(pattern);
    });
};


/**
 * 检查接口是否在不需要带 token 的白名单中
 * @param config 请求配置
 * @returns 是否不需要带 token
 */
export const isWithoutToken = (config: HttpRequestConfig): boolean => {
    const { whiteList } = config;
    if (!whiteList?.withToken) {
        return false;
    }
    return matchPattern(config.url, whiteList.withToken);
};


/**
 * 检查接口是否在不参与取消逻辑的白名单中
 * @param config 请求配置
 * @returns 是否不参与取消逻辑
 */
export const isNoCancel = (config: HttpRequestConfig): boolean => {
    // 优先检查请求级别的配置
    if (config.noCancel !== undefined) {
        return config.noCancel;
    }

    // 检查全局白名单
    const { whiteList } = config;
    if (!whiteList?.noCancel) {
        return false;
    }
    return matchPattern(config.url, whiteList.noCancel);
};


/**
 * 检查接口是否有特殊配置
 * @param config 请求配置
 * @returns 特殊配置（如果存在）
 */
export const getSpecialConfig = (config: HttpRequestConfig): Partial<HttpRequestConfig> | undefined => {
    const { whiteList } = config;
    if (!whiteList?.special) {
        return undefined;
    }

    for (const [pattern, specialConfig] of Object.entries(whiteList.special)) {
        if (matchPattern(config.url, [pattern])) {
            return specialConfig;
        }
    }
    return undefined;
};


/**
 * 根据配置判断是否需要取消请求
 * @param config 请求配置
 * @returns 是否需要取消
 */
export const shouldCancelRequest = (config: HttpRequestConfig): boolean => {
    // 检查是否在取消白名单中
    if (isNoCancel(config)) {
        return false;
    }

    // 检查取消配置是否启用
    const { cancelConfig } = config;
    if (cancelConfig?.enabled === false) {
        return false;
    }

    // 检查按方法配置
    if (config.method && cancelConfig?.methods) {
        const method = config.method.toUpperCase() as keyof typeof cancelConfig.methods;
        if (cancelConfig.methods[method] === false) {
            return false;
        }
    }

    return true;
};


/**
 * 生成请求仓库的 key
 * @param config 请求配置
 * @returns 请求标识 key
 */
export const getRepositoryKey = (config: HttpRequestConfig): string => {
    // 不参与取消逻辑的接口，返回唯一标识（不参与去重）
    if (!shouldCancelRequest(config)) {
        return `non_cancel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    // 深拷贝参数，排除 timestamp 和其他不参与去重的字段
    const params = { ...config.params };
    delete params?.timestamp;
    delete params?.__noCache;

    return [
        config.method,
        config.url,
        JSON.stringify(params),
        JSON.stringify(config.data)
    ].join('&');
};


/**
 * 检查是否是重复请求
 * @param config 当前请求配置
 * @param existingKeys 已存在的请求 key 集合
 * @returns 是否是重复请求
 */
export const isDuplicateRequest = (
    config: HttpRequestConfig,
    existingKeys: Set<string>
): boolean => {
    if (!shouldCancelRequest(config)) {
        return false;
    }

    const key = getRepositoryKey(config);
    return existingKeys.has(key);
};


/**
 * 获取请求方法的优先级（用于排序）
 * @param method 请求方法
 * @returns 优先级数值
 */
export const getMethodPriority = (method?: string): number => {
    const priorities: Record<string, number> = {
        [RequestMethodEnum.GET]: 1,
        [RequestMethodEnum.POST]: 2,
        [RequestMethodEnum.PUT]: 3,
        [RequestMethodEnum.PATCH]: 4,
        [RequestMethodEnum.DELETE]: 5,
    };
    return priorities[method?.toUpperCase() || ''] || 10;
};


/**
 * 合并请求配置（特殊配置覆盖默认配置）
 * @param defaultConfig 默认配置
 * @param config 请求配置
 * @returns 合并后的配置
 */
export const mergeConfig = (
    defaultConfig: HttpRequestConfig,
    config: HttpRequestConfig
): HttpRequestConfig => {
    // 检查特殊配置
    const specialConfig = getSpecialConfig(config);
    if (specialConfig) {
        return { ...defaultConfig, ...specialConfig, ...config };
    }
    return { ...defaultConfig, ...config };
};


/**
 * 默认 requestId 生成器
 * @returns 唯一请求标识
 */
export const generateRequestId = (): string => {
    // 使用时间戳 + 随机字符串，确保唯一性
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 11);
    return `${timestamp}_${random}`;
};


/**
 * 默认 traceId 生成器（使用 UUID v4 风格）
 * @returns 链路追踪标识
 */
export const generateTraceId = (): string => {
    // 尝试使用原生 crypto API
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // 降级方案：手动生成 UUID 风格的字符串
    const random = () => {
        let result = '';
        // 确保生成足够的字符，处理 Math.random() 返回小于预期值的情况
        while (result.length < 8) {
            result += Math.random().toString(16).slice(2);
        }
        return result.slice(0, 8);
    };
    return `${random()}${random()}-${random()}-${random()}-${random()}-${random()}${random()}${random()}`;
};


/**
 * 从请求头获取或生成 traceId
 * @param config 请求配置
 * @returns traceId
 */
export const getOrGenerateTraceId = (config: HttpRequestConfig): string => {
    // 优先从请求头获取（支持上游传递）
    const traceIdHeader = config.tracing?.traceIdHeader || 'X-Trace-Id';
    if (config.headers?.[traceIdHeader]) {
        return String(config.headers[traceIdHeader]);
    }

    // 使用自定义生成器或默认生成器
    const generator = config.tracing?.traceIdGenerator || generateTraceId;
    return generator();
};

/**
 * 生成请求追踪信息
 * @param config 请求配置
 * @returns 追踪信息对象
 */
export const generateTracingInfo = (config: HttpRequestConfig): {
    requestId: string;
    traceId: string;
} => {
    // 检查是否启用追踪
    const enabled = config.tracing?.enabled !== false;
    if (!enabled) {
        return { requestId: '', traceId: '' };
    }

    // 生成 requestId
    const requestIdGenerator = config.tracing?.requestIdGenerator || generateRequestId;
    const requestId = requestIdGenerator();

    // 获取或生成 traceId
    const traceId = getOrGenerateTraceId(config);

    return { requestId, traceId };
};

/**
 * 将追踪信息添加到请求头
 * @param config 请求配置
 * @returns 更新后的配置
 */
export const addTracingHeaders = (config: HttpRequestConfig): HttpRequestConfig => {
    const tracing = config.tracing;
    if (!tracing || tracing.enabled === false) {
        return config;
    }

    const { requestId, traceId } = generateTracingInfo(config);

    // 获取自定义请求头名称
    const requestIdHeader = tracing.requestIdHeader || CONSTS.DEFAULT_X_REQUEST_ID;
    const traceIdHeader = tracing.traceIdHeader || CONSTS.DEFAULT_X_Trace_ID;

    // 创建新的 headers 对象，避免修改原对象
    // 使用 AxiosHeaders 类确保类型正确
    const newHeaders = new AxiosHeaders(config.headers);

    // 设置追踪头
    newHeaders.set(requestIdHeader, requestId);
    newHeaders.set(traceIdHeader, traceId);

    // 添加到请求头
    return {
        ...config,
        headers: newHeaders,
    };
};