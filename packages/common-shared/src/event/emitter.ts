/**
 * 统一事件总线模块
 * 提供应用内、跨标签页、跨应用的统一通信能力
 *
 * 功能特性：
 * - 应用内事件通信（基于内存 Map）
 * - 跨标签页通信（基于 BroadcastChannel）
 * - 请求-响应模式（RPC）
 * - 命名空间支持（支持 "namespace:event" 或 "event.namespace" 格式）
 * - 事件优先级
 * - 类型安全的事件定义
 * - 自动清理和内存泄漏防护
 */

import { LoggerFactory } from '../utils/logger';
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

// 创建模块专用的 logger
const logger = LoggerFactory.create('EventBus');

export { AppEvents };
export type { EventMeta, EventHandler, EmitOptions, RequestOptions, EventMap };

/**
 * 事件优先级枚举
 */
export const enum EventPriority {
    HIGH = 'high',
    NORMAL = 'normal',
    LOW = 'low'
}

/**
 * 带优先级的事件处理器
 */
interface PrioritizedHandler {
    handler: EventHandler;
    priority: EventPriority;
    id: string;
}

/**
 * 事件拦截器
 */
export interface EventInterceptor {
    before?: (type: string, data: any, meta: EventMeta) => boolean | void;
    after?: (type: string, data: any, meta: EventMeta) => void;
}

/**
 * 统一事件总线类
 *
 * 融合了三种事件机制：
 * 1. 简单事件总线（内存-based）
 * 2. 跨标签页通信（BroadcastChannel）
 * 3. 命名空间事件（原 EventEmitter 功能）
 */
export class UnifiedEventBus {
    private static instance: UnifiedEventBus;
    private broadcastChannel: BroadcastChannel | null = null;
    private readonly channelName: string;
    private eventMap: Map<string, Set<PrioritizedHandler>> = new Map();
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private requestIdCounter = 0;
    private isDestroyed = false;
    private interceptors: EventInterceptor[] = [];
    private handlerIdCounter = 0;

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
                logger.info('BroadcastChannel initialized');
            } catch (error) {
                logger.warn(`Failed to initialize BroadcastChannel: ${error}`);
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
            logger.error(`BroadcastChannel message error: ${event}`);
        };
    }

    /**
     * 运行拦截器
     */
    private runInterceptors(type: string, data: any, meta: EventMeta, phase: 'before' | 'after'): boolean {
        for (const interceptor of this.interceptors) {
            if (phase === 'before' && interceptor.before) {
                const result = interceptor.before(type, data, meta);
                if (result === false) {
                    return false;
                }
            } else if (phase === 'after' && interceptor.after) {
                interceptor.after(type, data, meta);
            }
        }
        return true;
    }

    /**
     * 标准化事件名称
     * 支持两种格式：
     * - "namespace:event" （推荐）
     * - "event.namespace" （兼容旧版 EventEmitter）
     */
    private normalizeEventName(name: string): string {
        // 如果包含点号但不包含冒号，说明是旧格式 "event.namespace"
        if (name.includes('.') && !name.includes(':')) {
            const parts = name.split('.');
            return `${parts[1] || 'base'}:${parts[0]}`;
        }
        // 已经是 "namespace:event" 格式或普通格式
        return name;
    }

    /**
     * 本地触发事件
     */
    private triggerLocal(type: string, data: any, meta: EventMeta): void {
        const normalizedType = this.normalizeEventName(type);

        if (!this.runInterceptors(normalizedType, data, meta, 'before')) {
            logger.debug(`Event "${normalizedType}" blocked by interceptor`);
            return;
        }

        const handlers = this.eventMap.get(normalizedType);
        if (handlers) {
            const sortedHandlers = this.sortHandlersByPriority([...handlers]);
            sortedHandlers.forEach(({ handler }) => {
                try {
                    handler(data, meta);
                } catch (error) {
                    logger.error(`Error in handler for "${normalizedType}"`, error);
                }
            });
        }

        try {
            const customEvent = new CustomEvent(normalizedType, {
                detail: { data, meta },
                bubbles: true,
                composed: true,
            });
            window.dispatchEvent(customEvent);
        } catch (error) {
            logger.warn(`Failed to dispatch CustomEvent: ${error}`);
        }

        this.runInterceptors(normalizedType, data, meta, 'after');
    }

    /**
     * 按优先级排序处理器
     */
    private sortHandlersByPriority(handlers: PrioritizedHandler[]): PrioritizedHandler[] {
        const priorityOrder = {
            [EventPriority.HIGH]: 0,
            [EventPriority.NORMAL]: 1,
            [EventPriority.LOW]: 2
        };

        return handlers.sort((a, b) => {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
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
     * // 使用命名空间事件
     * bus.emit('auth:login', { token: 'xxx' });
     *
     * // 兼容旧格式（会自动转换）
     * bus.emit('login.auth', { token: 'xxx' }); // 转换为 auth:login
     *
     * // 跨标签页发送
     * bus.emit('custom:event', { data: 'test' }, { crossTab: true });
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
            logger.warn('Cannot emit after destroy');
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
                        type: this.normalizeEventName(type as string),
                        data,
                        source: window.location.origin,
                        timestamp: Date.now(),
                        isResponse: false,
                    });
                } catch (error) {
                    logger.error(`Failed to post message: ${error}`);
                }
            }
        }
    }

    /**
     * 注册事件处理器（默认优先级）
     */
    on<T extends keyof EventMap>(
        type: T,
        handler: EventHandler<EventMap[T]>
    ): () => void;
    on(type: string, handler: EventHandler): () => void;
    on(type: string, handler: EventHandler): () => void {
        return this.onWithPriority(type, handler, EventPriority.NORMAL);
    }

    /**
     * 注册带优先级的事件处理器
     * @param type 事件类型
     * @param handler 处理器
     * @param priority 优先级
     * @returns 取消监听的函数
     */
    onWithPriority(type: string, handler: EventHandler, priority: EventPriority = EventPriority.NORMAL): () => void {
        if (this.isDestroyed) {
            logger.warn('Cannot register handler after destroy');
            return () => {};
        }

        const normalizedType = this.normalizeEventName(type);
        const handlerId = `handler_${++this.handlerIdCounter}`;
        const prioritizedHandler: PrioritizedHandler = {
            handler,
            priority,
            id: handlerId
        };

        if (!this.eventMap.has(normalizedType)) {
            this.eventMap.set(normalizedType, new Set());
        }
        this.eventMap.get(normalizedType)!.add(prioritizedHandler);

        return () => {
            const handlers = this.eventMap.get(normalizedType);
            if (handlers) {
                handlers.delete(prioritizedHandler);
                if (handlers.size === 0) {
                    this.eventMap.delete(normalizedType);
                }
            }
        };
    }

    /**
     * 移除事件处理器
     */
    off(type: string, handler: EventHandler): void {
        const normalizedType = this.normalizeEventName(type);
        const handlers = this.eventMap.get(normalizedType);
        if (handlers) {
            const toRemove = Array.from(handlers).find(h => h.handler === handler);
            if (toRemove) {
                handlers.delete(toRemove);
                if (handlers.size === 0) {
                    this.eventMap.delete(normalizedType);
                }
            }
        }
    }

    /**
     * 一次性监听
     */
    once<T extends keyof EventMap>(
        type: T,
        handler: EventHandler<EventMap[T]>
    ): () => void;
    once(type: string, handler: EventHandler): () => void;
    once(type: string, handler: EventHandler): () => void {
        const wrapper: EventHandler = (data, meta) => {
            handler(data, meta);
            this.off(type, wrapper);
        };
        return this.on(type, wrapper);
    }

    /**
     * 请求-响应模式（RPC）
     */
    request<T = any, R = any>(
        type: string,
        data?: T,
        options?: RequestOptions
    ): Promise<R> {
        return new Promise((resolve, reject) => {
            if (this.isDestroyed) {
                reject(new Error('EventBus is destroyed'));
                return;
            }

            const { timeout = 5000, crossTab = false } = options || {};
            const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;

            logger.debug(`Request started: ${type}`, { requestId, crossTab });

            const timeoutId = setTimeout(() => {
                logger.warn(`Request timeout: ${type}`, { requestId });
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout: ${type}`));
            }, timeout);

            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                timeout: timeoutId,
            });

            if (crossTab && this.broadcastChannel) {
                logger.debug('Using cross-tab mode for request');
                try {
                    this.broadcastChannel.postMessage({
                        type: this.normalizeEventName(type),
                        data,
                        source: window.location.origin,
                        timestamp: Date.now(),
                        requestId,
                        isResponse: false,
                    });
                } catch (error) {
                    clearTimeout(timeoutId);
                    this.pendingRequests.delete(requestId);
                    reject(error);
                }
            } else {
                logger.debug('Using local mode for request', { eventType: `${type}:request` });
                this.triggerLocal(`${type}:request`, { requestId, data }, {
                    source: window.location.origin,
                    timestamp: Date.now(),
                    isCrossTab: false,
                });
            }
        });
    }

    /**
     * 响应请求（别名方法，与 respond 相同）
     */
    onRequest<T = any>(type: string, handler: (data: T) => Promise<any> | any): () => void {
        return this.respond(type, handler);
    }

    /**
     * 响应请求
     */
    respond<T = any>(type: string, handler: (data: T) => Promise<any> | any): () => void {
        const eventType = `${type}:request`;
        logger.debug(`Respond registered for: ${eventType}`);

        return this.on(eventType, async (requestData, meta) => {
            logger.debug(`Respond received for: ${eventType}`, { requestData });

            const { requestId, data } = requestData || {};

            if (!requestId) {
                logger.warn('Received request without requestId');
                return;
            }

            try {
                const result = await handler(data);
                logger.debug(`Respond success for: ${type}`, { requestId });

                if (meta?.isCrossTab && this.broadcastChannel) {
                    this.broadcastChannel.postMessage({
                        type: `${type}:response`,
                        data: { success: true, data: result },
                        source: window.location.origin,
                        timestamp: Date.now(),
                        requestId,
                        isResponse: true,
                    });
                } else {
                    this.sendResponse(requestId, { success: true, data: result });
                }
            } catch (error) {
                logger.debug(`Respond error for: ${type}`, { requestId, error });

                if (meta?.isCrossTab && this.broadcastChannel) {
                    this.broadcastChannel.postMessage({
                        type: `${type}:response`,
                        data: {
                            success: false,
                            error: error instanceof Error ? error.message : String(error),
                        },
                        source: window.location.origin,
                        timestamp: Date.now(),
                        requestId,
                        isResponse: true,
                    });
                } else {
                    this.sendResponse(requestId, {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        });
    }

    /**
     * 发送响应
     */
    private sendResponse(requestId: string, response: ResponseData): void {
        logger.debug(`Sending response`, { requestId, response });
        this.handleResponse(requestId, response);
    }

    /**
     * 添加事件拦截器
     * @param interceptor 拦截器
     * @returns 移除拦截器的函数
     */
    useInterceptor(interceptor: EventInterceptor): () => void {
        this.interceptors.push(interceptor);
        return () => {
            const index = this.interceptors.indexOf(interceptor);
            if (index > -1) {
                this.interceptors.splice(index, 1);
            }
        };
    }

    /**
     * 批量注册事件监听器
     * @param handlers 事件处理器映射
     * @example
     * bus.batchOn({
     *   'auth:login': (data) => console.log('Login:', data),
     *   'auth:logout': () => console.log('Logout')
     * });
     */
    batchOn(handlers: Record<string, EventHandler>): Array<() => void> {
        return Object.entries(handlers).map(([type, handler]) => {
            return this.on(type, handler);
        });
    }

    /**
     * 获取待处理请求数量
     */
    pendingRequestCount(): number {
        return this.pendingRequests.size;
    }

    /**
     * 获取监听器数量
     */
    listenerCount(type: string): number {
        const normalizedType = this.normalizeEventName(type);
        return this.eventMap.get(normalizedType)?.size || 0;
    }

    /**
     * 获取所有注册的事件类型
     */
    getRegisteredEvents(): string[] {
        return Array.from(this.eventMap.keys());
    }

    /**
     * 清空特定事件的所有监听器
     */
    clearEvent(type: string): void {
        const normalizedType = this.normalizeEventName(type);
        this.eventMap.delete(normalizedType);
    }

    /**
     * 移除所有监听器
     */
    removeAllListeners(type?: string): void {
        if (type) {
            this.clearEvent(type);
        } else {
            this.eventMap.clear();
        }
    }

    /**
     * 销毁事件总线
     */
    destroy(): void {
        this.isDestroyed = true;

        this.pendingRequests.forEach(({ timeout }) => {
            clearTimeout(timeout);
        });
        this.pendingRequests.clear();

        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }

        this.eventMap.clear();
        this.interceptors = [];

        logger.info('Destroyed');
    }

    /**
     * 重置事件总线
     */
    reset(): void {
        this.destroy();
        this.isDestroyed = false;
        logger.info('Reset');
    }
}

// 导出单例实例
export const eventBus = UnifiedEventBus.getInstance();

export default eventBus;
