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
     * 本地触发事件
     */
    private triggerLocal(type: string, data: any, meta: EventMeta): void {
        const handlers = this.eventMap.get(type);
        if (handlers) {
            [...handlers].forEach(handler => {
                try {
                    handler(data, meta);
                } catch (error) {
                    logger.error(`Error in handler for "${type}"`, error);
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
            logger.warn(`Failed to dispatch CustomEvent: ${error}`);
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
                        type: type as string,
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
     * 注册事件处理器
     */
    on<T extends keyof EventMap>(
        type: T,
        handler: EventHandler<EventMap[T]>
    ): () => void;
    on(type: string, handler: EventHandler): () => void;
    on(type: string, handler: EventHandler): () => void {
        if (this.isDestroyed) {
            logger.warn('Cannot register handler after destroy');
            return () => {};
        }

        if (!this.eventMap.has(type)) {
            this.eventMap.set(type, new Set());
        }
        this.eventMap.get(type)!.add(handler);

        return () => {
            this.eventMap.get(type)?.delete(handler);
        };
    }

    /**
     * 移除事件处理器
     */
    off(type: string, handler: EventHandler): void {
        const handlers = this.eventMap.get(type);
        if (handlers) {
            handlers.delete(handler);
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

            // 如果明确启用跨标签页且 BroadcastChannel 可用
            if (crossTab && this.broadcastChannel) {
                logger.debug('Using cross-tab mode for request');
                try {
                    this.broadcastChannel.postMessage({
                        type,
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
                // 本地请求，直接触发 respond 监听器
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
            
            // requestData 可能是 { requestId, data } 格式
            const { requestId, data } = requestData || {};
            
            if (!requestId) {
                logger.warn('Received request without requestId');
                return;
            }
            
            try {
                const result = await handler(data);
                logger.debug(`Respond success for: ${type}`, { requestId });
                this.sendResponse(requestId, { success: true, data: result });
            } catch (error) {
                logger.debug(`Respond error for: ${type}`, { requestId, error });
                this.sendResponse(requestId, {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }

    /**
     * 发送响应
     */
    private sendResponse(requestId: string, response: ResponseData): void {
        logger.debug(`Sending response`, { requestId, response });
        
        // 本地响应，直接处理
        this.handleResponse(requestId, response);
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
        return this.eventMap.get(type)?.size || 0;
    }

    /**
     * 销毁事件总线
     */
    destroy(): void {
        this.isDestroyed = true;

        // 清理所有待处理的请求
        this.pendingRequests.forEach(({ timeout }) => {
            clearTimeout(timeout);
        });
        this.pendingRequests.clear();

        // 关闭 BroadcastChannel
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }

        // 清理事件处理器
        this.eventMap.clear();

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


