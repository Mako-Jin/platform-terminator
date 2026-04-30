/**
 * 事件总线类型定义
 */

/**
 * 事件元数据
 */
export interface EventMeta {
    source: string;
    timestamp: number;
    isCrossTab?: boolean;
    requestId?: string;
}

/**
 * 事件处理器
 */
export type EventHandler<T = any> = (data: T, meta?: EventMeta) => void;

/**
 * 发送选项
 */
export interface EmitOptions {
    crossTab?: boolean;
    source?: string;
}

/**
 * 请求选项
 */
export interface RequestOptions extends EmitOptions {
    timeout?: number;
}

/**
 * 响应数据结构
 */
export interface ResponseData<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * 待处理请求
 */
export interface PendingRequest {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    timeout: ReturnType<typeof setTimeout>;
}

/**
 * BroadcastChannel 消息
 */
export interface BroadcastMessage {
    type: string;
    data: any;
    source: string;
    timestamp: number;
    isResponse?: boolean;
    isRequest?: boolean;
    requestId?: string;
}

/**
 * 应用事件常量
 */
export const AppEvents = {
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_TOKEN_REFRESH: 'auth:token:refresh',
    AUTH_PERMISSION_CHANGE: 'auth:permission:change',
    USER_INFO_UPDATE: 'user:info:update',
    USER_AVATAR_UPDATE: 'user:avatar:update',
    SYSTEM_THEME_CHANGE: 'system:theme:change',
    SYSTEM_LOCALE_CHANGE: 'system:locale:change',
    ROUTE_CHANGE: 'route:change',
    ROUTE_BEFORE_CHANGE: 'route:before:change',
    NOTIFICATION_SHOW: 'notification:show',
    NOTIFICATION_COUNT_UPDATE: 'notification:count:update',
    SUB_APP_LOADED: 'sub-app:loaded',
    SUB_APP_UNLOADED: 'sub-app:unloaded',
    SUB_APP_ERROR: 'sub-app:error',
    RESOURCE_PROGRESS: 'resource:progress',
    RESOURCE_LOADED: 'resource:loaded',
    RESOURCE_ERROR: 'resource:error',
} as const;

/**
 * 资源进度数据
 */
export interface ResourceProgressData {
    id: string;
    itemsLoaded: number;
    itemsTotal: number;
    percent: number;
}

/**
 * 资源加载完成数据
 */
export interface ResourceLoadedData {
    itemsLoaded: number;
    itemsTotal: number;
    percent: number;
}

/**
 * 资源错误数据
 */
export interface ResourceErrorData {
    id: string;
    url: string;
    itemsLoaded: number;
    itemsTotal: number;
}

/**
 * 事件映射表
 * 可以通过模块合并来扩展此接口
 */
export interface EventMap {
    [AppEvents.AUTH_LOGIN]: any;
    [AppEvents.AUTH_LOGOUT]: undefined;
    [AppEvents.AUTH_TOKEN_REFRESH]: { token: string };
    [AppEvents.AUTH_PERMISSION_CHANGE]: { permissions: string[] };
    [AppEvents.USER_INFO_UPDATE]: any;
    [AppEvents.USER_AVATAR_UPDATE]: { avatarUrl: string };
    [AppEvents.SYSTEM_THEME_CHANGE]: { theme: 'light' | 'dark' | 'auto' };
    [AppEvents.SYSTEM_LOCALE_CHANGE]: { locale: string };
    [AppEvents.ROUTE_CHANGE]: { path: string; query?: Record<string, any> };
    [AppEvents.ROUTE_BEFORE_CHANGE]: { from: string; to: string };
    [AppEvents.NOTIFICATION_SHOW]: { message: string; type?: 'success' | 'error' | 'warning' | 'info' };
    [AppEvents.NOTIFICATION_COUNT_UPDATE]: { count: number };
    [AppEvents.SUB_APP_LOADED]: { appName: string };
    [AppEvents.SUB_APP_UNLOADED]: { appName: string };
    [AppEvents.SUB_APP_ERROR]: { appName: string; error: string };
    [AppEvents.RESOURCE_PROGRESS]: ResourceProgressData;
    [AppEvents.RESOURCE_LOADED]: ResourceLoadedData;
    [AppEvents.RESOURCE_ERROR]: ResourceErrorData;
}

/**
 * 事件拦截器
 */
export interface EventInterceptor {
    before?: (type: string, data: any, meta: EventMeta) => boolean | void;
    after?: (type: string, data: any, meta: EventMeta) => void;
}

/**
 * 批量事件处理器映射
 */
export type BatchEventHandlers = Record<string, EventHandler>;
