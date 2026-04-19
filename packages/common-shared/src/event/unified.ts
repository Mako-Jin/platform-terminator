/**
 * 统一事件总线模块
 * 提供应用内、跨标签页、跨应用的统一通信能力
 *
 * 功能特性：
 * - 应用内事件通信（基于内存 Map）
 * - 跨标签页通信（基于 BroadcastChannel）
 * - 请求-响应模式（RPC）
 * - 类型安全的事件定义
 * - 自动清理和内存泄漏防护
 */

import { Logger } from '../utils/logger';
import type {
    EventMeta,
    EventHandler,
    EmitOptions,
    RequestOptions,
    ResponseData,
    PendingRequest,
    BroadcastMessage,
    EventMap
} from './types';
import { AppEvents } from './types';

export { AppEvents };
export type { EventMeta, EventHandler, EmitOptions, RequestOptions, EventMap };

/**
 * 统一事件总线类
 */
export class UnifiedEventBus {
    private static instance: UnifiedEventBus;
    private broadcastChannel: BroadcastChannel | null = null;
    private readonly channelName: string;
    private eventMap: Map<string, Set<EventHandler>> = new Map();
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private requestIdCounter = 0;
    private isDestroyed = false;

    private constructor(channelName: string = 'platform-apps') {
        this.channelName = channelName;
    }

    /**
     * 获取单例实例
     */
    static getInstance(channelName?: string): UnifiedEventBus {
        if (!UnifiedEventBus.instance) {
            UnifiedEventBus.instance = new UnifiedEventBus(channelName);
        }
        return UnifiedEventBus.instance;
    }

    /**
     * 检查 BroadcastChannel 是否支持
     */
    private isBroadcastSupported(): boolean {
        return typeof BroadcastChannel !== 'undefined';
    }

    /**
     * 确保 BroadcastChannel 已初始化（懒加载）
     */
    private ensureBroadcastChannel(): void {
        if (!this.broadcastChannel && !this.isDestroyed && this.isBroadcastSupported()) {
            try {
                this.broadcastChannel = new BroadcastChannel(this.channelName);
                this.setupBroadcastListener();
                Logger.info('EventBus', 'BroadcastChannel initialized');
            } catch (error) {
                Logger.warn('EventBus', `Failed to initialize BroadcastChannel: ${error}`);
            }
        }
    }

    /**
     * 设置 BroadcastChannel 监听器
     */
    private setupBroadcastListener(): void {
        if (!this.broadcastChannel) return;

        this.broadcastChannel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
            const { type, data, source, timestamp, requestId, isResponse } = event.data;

            if (source === window.location.origin && !isResponse) {
                return;
            }

            if (isResponse) {
                if (requestId) {
                    this.handleResponse(requestId, data);
                }
            } else {
                this.triggerLocal(type, data, {
                    source: source || 'cross-tab',
                    timestamp: timestamp || Date.now(),
                    isCrossTab: true,
                });
            }
        };

        this.broadcastChannel.onmessageerror = (event) => {
            Logger.error('EventBus', `BroadcastChannel message error: ${event}`);
        };
    }

    /**
     * 本地触发事件
     */
    private triggerLocal(type: string, data: any, meta: EventMeta): void {
        const handlers = this.eventMap.get(type);
        if (handlers) {
            [...handlers].forEach(handler => {
                try {
                    handler(data, meta);
                } catch (error) {
                    Logger.error('EventBus', `Error in handler for "${type}": ${error}`);
                }
            });
        }

        try {
            const customEvent = new CustomEvent(type, {
                detail: { data, meta },
                bubbles: true,
                composed: true,
            });
            window.dispatchEvent(customEvent);
        } catch (error) {
            Logger.warn('EventBus', `Failed to dispatch CustomEvent: ${error}`);
        }
    }

    /**
     * 处理 RPC 响应
     */
    private handleResponse(requestId: string, responseData: any): void {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
            clearTimeout(pending.timeout);

            const response: ResponseData = responseData;
            if (response.success) {
                pending.resolve(response.data);
            } else {
                pending.reject(new Error(response.error || 'Unknown error'));
            }

            this.pendingRequests.delete(requestId);
        }
    }

    /**
     * 发送事件
     * @example
     * // 使用预定义事件（类型安全）
     * bus.emit(AppEvents.AUTH_LOGIN, { token: 'xxx' });
     *
     * // 使用自定义事件（需要类型断言或扩展 EventMap）
     * bus.emit('my-app:custom' as any, { data: 'test' });
     */
    emit<T extends keyof EventMap>(
        type: T,
        data?: EventMap[T],
        options?: EmitOptions
    ): void;
    emit(type: string, data?: any, options?: EmitOptions): void;
    emit<T extends keyof EventMap>(
        type: T extends string ? T : string,
        data?: any,
        options?: EmitOptions
    ): void {
        if (this.isDestroyed) {
            Logger.warn('EventBus', 'Cannot emit after destroy');
            return;
        }

        const { crossTab = false, source = window.location.origin } = options || {};

        const meta: EventMeta = {
            source,
            timestamp: Date.now(),
            isCrossTab: false,
        };

        this.triggerLocal(type as string, data, meta);

        if (crossTab) {
            this.ensureBroadcastChannel();
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage({
                        type: type as string,
                        data,
                        source: window.location.origin,
                        timestamp: Date.now(),
                        isResponse: false,
                    });
                } catch (error) {
                    Logger.error('EventBus', `Failed to post message: ${error}`);
                }
            }
        }
    }

    /**
     * 监听事件
     * @example
     * // 使用预定义事件
     * bus.on(AppEvents.AUTH_LOGIN, (data) => { ... });
     *
     * // 使用自定义事件
     * bus.on('my-app:custom' as any, (data) => { ... });
     */
    on<T extends keyof EventMap>(
        type: T,
        handler: EventHandler<EventMap[T]>
    ): () => void;
    on(type: string, handler: EventHandler): () => void;
    on<T extends keyof EventMap>(
        type: T extends string ? T : string,
        handler: EventHandler
    ): () => void {
        if (this.isDestroyed) {
            Logger.warn('EventBus', 'Cannot register handler after destroy');
            return () => {};
        }

        const typeStr = type as string;
        if (!this.eventMap.has(typeStr)) {
            this.eventMap.set(typeStr, new Set());
        }
        this.eventMap.get(typeStr)!.add(handler);

        return () => {
            this.eventMap.get(typeStr)?.delete(handler);
        };
    }

    /**
     * 一次性监听
     */
    once<T extends keyof EventMap>(
        type: T,
        handler: EventHandler<EventMap[T]>
    ): () => void;
    once(type: string, handler: EventHandler): () => void;
    once<T extends keyof EventMap>(
        type: T extends string ? T : string,
        handler: EventHandler
    ): () => void {
        let unsubscribed = false;

        const wrapper: EventHandler = (data, meta) => {
            if (!unsubscribed) {
                unsubscribed = true;
                handler(data, meta);
                this.off(type as any, wrapper);
            }
        };

        const unsubscribe = this.on(type as any, wrapper);

        return () => {
            if (!unsubscribed) {
                unsubscribed = true;
                unsubscribe();
            }
        };
    }

    /**
     * 移除监听
     */
    off<T extends keyof EventMap>(type?: T, handler?: EventHandler): void;
    off(type?: string, handler?: EventHandler): void {
        if (type && handler) {
            this.eventMap.get(type as string)?.delete(handler);
        } else if (type) {
            this.eventMap.delete(type as string);
        } else {
            this.eventMap.clear();
        }
    }

    /**
     * 请求-响应模式（RPC）
     */
    async request<T = any, R = any>(
        type: string,
        data?: T,
        options?: RequestOptions
    ): Promise<R> {
        if (this.isDestroyed) {
            throw new Error('[EventBus] Cannot request after destroy');
        }

        const { crossTab = false, source = window.location.origin, timeout = 10000 } = options || {};

        const requestId = `${type}_${Date.now()}_${++this.requestIdCounter}`;

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request "${type}" timeout after ${timeout}ms`));
            }, timeout);

            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                timeout: timeoutId,
            });

            const requestData = {
                requestId,
                data,
                source,
                timestamp: Date.now(),
            };

            try {
                if (crossTab) {
                    this.ensureBroadcastChannel();
                    if (this.broadcastChannel) {
                        this.broadcastChannel.postMessage({
                            type,
                            data: requestData,
                            source,
                            timestamp: Date.now(),
                            isResponse: false,
                            isRequest: true,
                            requestId,
                        });
                    } else {
                        this.triggerLocal(type, requestData, {
                            source,
                            timestamp: Date.now(),
                            requestId,
                        });
                    }
                } else {
                    this.triggerLocal(type, requestData, {
                        source,
                        timestamp: Date.now(),
                        requestId,
                    });
                }
            } catch (error) {
                clearTimeout(timeoutId);
                this.pendingRequests.delete(requestId);
                reject(error);
            }
        });
    }

    /**
     * 响应请求
     */
    respond(requestId: string, data: any, crossTab: boolean = false): void {
        const response: ResponseData = {
            success: true,
            data,
        };

        if (crossTab && this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage({
                    type: '__response__',
                    data: response,
                    requestId,
                    source: window.location.origin,
                    timestamp: Date.now(),
                    isResponse: true,
                });
            } catch (error) {
                Logger.error('EventBus', `Failed to send response: ${error}`);
            }
        } else {
            this.handleResponse(requestId, response);
        }
    }

    /**
     * 响应错误
     */
    respondError(requestId: string, error: string | Error, crossTab: boolean = false): void {
        const errorMsg = error instanceof Error ? error.message : error;
        const response: ResponseData = {
            success: false,
            error: errorMsg,
        };

        if (crossTab && this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage({
                    type: '__response__',
                    data: response,
                    requestId,
                    source: window.location.origin,
                    timestamp: Date.now(),
                    isResponse: true,
                });
            } catch (err) {
                Logger.error('EventBus', `Failed to send error response: ${err}`);
            }
        } else {
            this.handleResponse(requestId, response);
        }
    }

    /**
     * 注册请求处理器（服务端）
     */
    onRequest<T = any, R = any>(
        type: string,
        handler: (data: T, meta: EventMeta) => Promise<R> | R
    ): () => void {
        return this.on(type as any, async (requestData: any, meta?: EventMeta) => {
            if (!requestData || !requestData.requestId) {
                return;
            }

            const { requestId, data } = requestData;

            try {
                const result = await handler(data, meta || { source: 'unknown', timestamp: Date.now() });
                this.respond(requestId, result, meta?.isCrossTab);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                this.respondError(requestId, errorMsg, meta?.isCrossTab);
            }
        });
    }

    /**
     * 获取某个事件的监听器数量（调试用）
     */
    listenerCount(type: string): number {
        return this.eventMap.get(type)?.size || 0;
    }

    /**
     * 获取所有待处理请求数量（调试用）
     */
    pendingRequestCount(): number {
        return this.pendingRequests.size;
    }

    /**
     * 销毁事件总线
     */
    destroy(): void {
        this.isDestroyed = true;

        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }

        this.eventMap.clear();

        this.pendingRequests.forEach((pending) => {
            clearTimeout(pending.timeout);
            pending.reject(new Error('[EventBus] Destroyed'));
        });
        this.pendingRequests.clear();

        Logger.info('EventBus', 'Destroyed');
    }

    /**
     * 重置事件总线（开发环境调试用）
     */
    reset(): void {
        this.destroy();
        this.isDestroyed = false;
        this.requestIdCounter = 0;
        Logger.info('EventBus', 'Reset');
    }
}

export const broadcast = UnifiedEventBus.getInstance();

export default broadcast;


