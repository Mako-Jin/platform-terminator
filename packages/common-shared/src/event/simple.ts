/**
 * 基于内存的简单事件总线
 * 适用于同窗口内的事件通信
 */

import { Logger } from '../utils/logger';

type EventCallback = (data?: any) => void;

/**
 * 简单事件总线类
 * 基于 Map 实现的发布订阅模式
 */
export class EventBus {
    private static instance: EventBus;
    private listeners: Map<string, Set<EventCallback>> = new Map();

    private constructor() {}

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * 发送事件
     */
    emit(eventName: string, data?: any): void {
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
            [...callbacks].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    Logger.error('EventBus', `Error in event "${eventName}": ${error}`);
                }
            });
        }
    }

    /**
     * 监听事件
     * @returns 取消监听的函数
     */
    on(eventName: string, handler: EventCallback): () => void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName)!.add(handler);

        return () => {
            this.listeners.get(eventName)?.delete(handler);
        };
    }

    /**
     * 移除监听
     */
    off(event: string, callback: EventCallback): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const have = callbacks.has(callback);
            if (have) {
                callbacks.delete(callback);
            }
        }
    }

    /**
     * 一次性监听
     */
    once(eventName: string, handler: EventCallback): () => void {
        const wrapper = (data?: any) => {
            handler(data);
            this.off(eventName, wrapper);
        };
        return this.on(eventName, wrapper);
    }

    /**
     * 移除所有监听
     */
    removeAllListeners(eventName?: string): void {
        if (eventName) {
            this.listeners.delete(eventName);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * 获取监听器数量（调试用）
     */
    listenerCount(eventName: string): number {
        return this.listeners.get(eventName)?.size || 0;
    }

    /**
     * 销毁事件总线
     */
    destroy(): void {
        this.listeners.clear();
        Logger.info('EventBus', 'Destroyed');
    }
}

export const eventBus = EventBus.getInstance();

export default eventBus;

