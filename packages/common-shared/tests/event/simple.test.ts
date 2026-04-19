
// tests/event/simple.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, eventBus } from '../../src';

describe('EventBus (Simple)', () => {
    let bus: EventBus;

    beforeEach(() => {
        bus = EventBus.getInstance();
        bus.removeAllListeners();
    });

    describe('on()', () => {
        it('应该能够注册事件监听器', () => {
            const handler = vi.fn();
            const unsubscribe = bus.on('test:event', handler);

            expect(unsubscribe).toBeDefined();
            expect(typeof unsubscribe).toBe('function');
        });

        it('应该能够在事件触发时调用处理器', () => {
            const handler = vi.fn();
            const testData = { name: '测试数据' };

            bus.on('test:event', handler);
            bus.emit('test:event', testData);

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(testData);
        });

        it('应该能够处理多个监听器', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            bus.on('test:multi', handler1);
            bus.on('test:multi', handler2);
            bus.emit('test:multi', 'data');

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });
    });

    describe('off()', () => {
        it('应该能够移除特定的监听器', () => {
            const handler = vi.fn();
            bus.on('test:remove', handler);
            bus.off('test:remove', handler);
            bus.emit('test:remove');

            expect(handler).not.toHaveBeenCalled();
        });

        it('不应该影响其他监听器', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            bus.on('test:keep', handler1);
            bus.on('test:keep', handler2);
            bus.off('test:keep', handler1);
            bus.emit('test:keep');

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledTimes(1);
        });
    });

    describe('once()', () => {
        it('应该只触发一次', () => {
            const handler = vi.fn();
            bus.once('test:once', handler);

            bus.emit('test:once', 'first');
            bus.emit('test:once', 'second');

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith('first');
        });
    });

    describe('emit()', () => {
        it('应该能够发送不带数据的事件', () => {
            const handler = vi.fn();
            bus.on('test:no-data', handler);
            bus.emit('test:no-data');

            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('应该能够发送各种类型的数据', () => {
            const handler = vi.fn();
            bus.on('test:any-data', handler);

            bus.emit('test:any-data', 'string');
            bus.emit('test:any-data', 123);
            bus.emit('test:any-data', { key: 'value' });
            bus.emit('test:any-data', [1, 2, 3]);

            expect(handler).toHaveBeenCalledTimes(4);
        });

        it('应该在处理器抛出错误时不影响其他处理器', () => {
            const errorHandler = vi.fn(() => { throw new Error('Test error'); });
            const normalHandler = vi.fn();

            bus.on('test:error', errorHandler);
            bus.on('test:error', normalHandler);

            expect(() => bus.emit('test:error')).not.toThrow();
            expect(normalHandler).toHaveBeenCalledTimes(1);
        });
    });

    describe('removeAllListeners()', () => {
        it('应该能够移除所有监听器', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            bus.on('test:all1', handler1);
            bus.on('test:all2', handler2);
            bus.removeAllListeners();

            bus.emit('test:all1');
            bus.emit('test:all2');

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });

        it('应该能够移除特定事件的所有监听器', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            bus.on('test:specific1', handler1);
            bus.on('test:specific2', handler2);
            bus.removeAllListeners('test:specific1');

            bus.emit('test:specific1');
            bus.emit('test:specific2');

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledTimes(1);
        });
    });

    describe('listenerCount()', () => {
        it('应该返回正确的监听器数量', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            expect(bus.listenerCount('test:count')).toBe(0);

            bus.on('test:count', handler1);
            expect(bus.listenerCount('test:count')).toBe(1);

            bus.on('test:count', handler2);
            expect(bus.listenerCount('test:count')).toBe(2);

            bus.off('test:count', handler1);
            expect(bus.listenerCount('test:count')).toBe(1);
        });
    });

    describe('destroy()', () => {
        it('应该清空所有监听器', () => {
            const handler = vi.fn();
            bus.on('test:destroy', handler);
            bus.destroy();

            expect(bus.listenerCount('test:destroy')).toBe(0);
        });
    });

    describe('单例模式', () => {
        it('应该始终返回同一个实例', () => {
            const instance1 = EventBus.getInstance();
            const instance2 = EventBus.getInstance();

            expect(instance1).toBe(instance2);
        });
    });
});

describe('eventBus 单例导出', () => {
    it('导出的 eventBus 应该是 EventBus 的实例', () => {
        expect(eventBus).toBeInstanceOf(EventBus);
    });
});

