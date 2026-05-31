
import type {AxiosResponse, InternalAxiosRequestConfig} from "axios";
import type {Storage} from "../storage/types.ts";


export interface Interceptor<T> {

    /**
     * @description: 请求拦截器
     */
    requestInterceptor?: (config: HttpRequestConfig) => HttpRequestConfig;

    /**
     * @description: 请求失败拦截器
     */
    requestInterceptorCatch?: (error: Error) => Promise<void>;

    /**
     * @description: 响应拦截器
     */
    responseInterceptor?: <R = T>(response: AxiosResponse<Result<T>>) => R | Promise<R>;

    /**
     * @description: 请求之后的错误处理
     */
    responseInterceptorCatch?: (error: Error) => void;

}


export interface TokenManagerConfig {
    /** 是否启用自动刷新 */
    enabled?: boolean;
    /** 刷新接口地址 */
    refreshUrl?: string;
    /** 过期阈值（毫秒），默认 5 分钟 */
    expiresThreshold?: number;
    /** refreshToken 有效期（毫秒），默认 7 天 */
    refreshExpiresIn?: number;
    /** 存储键名配置 */
    storageKeys?: {
        tokenDataKey?: string;
        accessTokenKey?: string;
        refreshTokenKey?: string;
    };
    /** 自定义刷新请求配置 */
    refreshRequestConfig?: Partial<HttpRequestConfig>;
}


/**
 * 扩展默认的RequestConfig
 */
export interface HttpRequestConfig<T = unknown> extends InternalAxiosRequestConfig {
    /**
     * 各种hook
     */
    interceptors?: Interceptor<T>;
    /**
     * 是否显示加载
     */
    showLoading?: boolean;
    /**
     * 是否带token
     */
    withToken?: boolean;
    /**
     * 是否跳过token刷新，默认false
     */
    skipRefresh?: boolean;

    noCancel?: boolean;

    /**
     * 请求取消配置
     */
    cancelConfig?: {
        /** 是否启用请求取消 */
        enabled?: boolean;
        /** 按方法配置是否取消 */
        methods?: {
            GET?: boolean;
            POST?: boolean;
            PUT?: boolean;
            DELETE?: boolean;
            PATCH?: boolean;
        };
    };

    /**
     * 重试配置
     */
    retryConfig?: {
        /** 最大重试次数 */
        maxRetries: number;
        /** 初始重试延迟（毫秒） */
        delay: number;
        /** 重试延迟倍增因子（指数退避） */
        backoffMultiplier?: number;
        /** 最大重试延迟（毫秒） */
        maxDelay?: number;
        /** 需要重试的 HTTP 状态码 */
        retryOnStatus?: number[];
        /** 是否重试网络错误 */
        retryOnNetworkError?: boolean;
    };

    /**
     * 白名单配置
     */
    whiteList?: {
        /**
         * 不需要带 token 的接口
         */
        withToken?: string[];
        /**
         * 不参与取消逻辑的接口
         */
        noCancel?: string[];
        /**
         * 特殊配置接口（覆盖默认配置）
         */
        special?: Record<string, Partial<HttpRequestConfig>>
    }

    /**
     * 成功响应码
     */
    successCode?: string | string[];

    /**
     * 消息提示回调
     */
    messageHandler?: {
        success: (msg: string) => void;
        error: (msg: string) => void;
        warn: (msg: string) => void;
        info: (msg: string) => void;
    };
    /**
     * Storage 配置
     */
    storage?: Storage;

    /**
     * 全局配置
     */
    globalConfig?: {
        /** 是否自动添加时间戳防缓存（仅 GET 请求） */
        autoTimestamp?: boolean;
        /** 是否启用日志 */
        enableLog?: boolean;
        /** 是否启用详细日志（包含请求/响应数据） */
        verboseLog?: boolean;
        /** 请求超时后的回调 */
        onTimeout?: (config: HttpRequestConfig) => void;
    };

    /**
     * 追踪配置（由公共包自动处理，业务无需配置）
     */
    tracing?: {
        /** 是否启用追踪（默认启用） */
        enabled?: boolean;
        /** requestId 生成器（默认使用 UUID） */
        requestIdGenerator?: () => string;
        /** traceId 生成器（默认使用 UUID） */
        traceIdGenerator?: () => string;
        /** requestId 请求头名称（默认 X-Request-Id） */
        requestIdHeader?: string;
        /** traceId 请求头名称（默认 X-Trace-Id） */
        traceIdHeader?: string;
    };

    /**
     * Token 管理配置
     */
    tokenConfig?: TokenManagerConfig;

    /**
     * 登录页面路径（默认 '/login'）
     */
    loginPath?: string;

    /**
     * 未授权回调（无 Token 时触发）
     */
    onUnauthorized?: () => void;

    /**
     * 路由实例（支持 Vue Router、React Router 等）
     */
    router?: {
        push: (options: { path: string; query?: Record<string, string>,  state?: Record<string, unknown>; }) => void;
    };

    /**
     * 登录配置
     */
    authPaths?: {
        loginPath?: string;
        logoutPath?: string;
        redirectKey?: string;
    };

}


export enum HttpStatus {
    HTTP_200_OK = 200,
    HTTP_400_BAD_REQUEST = 400,
    HTTP_401_UNAUTHORIZED = 401,
    HTTP_403_FORBIDDEN = 403,
    HTTP_404_NOT_FOUND = 404,
    HTTP_500_INTERNAL_SERVER_ERROR = 500
}

/**
 * contentType 枚举类
 */
export enum ContentTypeEnum {
    // json
    JSON = 'application/json;charset=UTF-8',
    // form-data qs
    FORM_URLENCODED = 'application/x-www-form-urlencoded;charset=UTF-8',
    // form-data  upload
    FORM_DATA = 'multipart/form-data',
}

/**
 * @description: request method
 */
export enum RequestMethodEnum {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
}


export interface Result<T> {
    data: T;
    code: string;
    msg: string;
}


export interface Page<T> {
    total: number;
    records: T[];
}


export interface TokenData {
    accessToken: string;
    refreshToken: string;
    /**
     * 过期时间戳（毫秒）
     */
    expiresAt: number;
    /**
     * refreshToken过期时间
     */
    refreshExpiresAt: number;
    /** token 类型（如 Bearer） */
    tokenType?: string;
    /** token 来源（如 password/oauth） */
    grantType?: string;
}


export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
