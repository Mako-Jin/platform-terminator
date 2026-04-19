// tests/event/unified.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UnifiedEventBus, AppEvents } from '../../src/event/unified';

describe('UnifiedEventBus', () => {
    let bus: UnifiedEventBus;

    beforeEach(() => {
        // 每次测试前重置
        if (bus) {
            bus.destroy();
        }
        bus = UnifiedEventBus.getInstance(`test-channel-${Date.now()}`);
    });

    afterEach(() => {
        // 每个测试后清理
        if (bus) {
            bus.destroy();
        }
        // 重置单例，确保下一个测试获取新实例
        (UnifiedEventBus as any).instance = null;
    });

    describe('基本事件功能', () => {
        it('应该能够注册和触发事件', () => {
            const handler = vi.fn();
            const testData = { user: '张三' };

            bus.on(AppEvents.AUTH_LOGIN, handler);
            bus.emit(AppEvents.AUTH_LOGIN, testData);

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(testData, expect.objectContaining({
                source: window.location.origin,
                timestamp: expect.any(Number),
            }));
        });

        it('应该能够取消监听', () => {
            const handler = vi.fn();
            const unsubscribe = bus.on(AppEvents.USER_INFO_UPDATE, handler);

            unsubscribe();
            bus.emit(AppEvents.USER_INFO_UPDATE, {});

            expect(handler).not.toHaveBeenCalled();
        });

        it('应该支持 once 一次性监听', () => {
            const handler = vi.fn();
            bus.once(AppEvents.ROUTE_CHANGE, handler);

            bus.emit(AppEvents.ROUTE_CHANGE, { path: '/home' });
            bus.emit(AppEvents.ROUTE_CHANGE, { path: '/about' });

            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe('事件元数据', () => {
        it('应该提供正确的事件元数据', () => {
            const handler = vi.fn();

            bus.on(AppEvents.SYSTEM_THEME_CHANGE, handler);
            bus.emit(AppEvents.SYSTEM_THEME_CHANGE, { theme: 'dark' });

            expect(handler).toHaveBeenCalled();
            const meta = handler.mock.calls[0][1];
            expect(meta).toMatchObject({
                source: window.location.origin,
                timestamp: expect.any(Number),
                isCrossTab: false,
            });
        });
    });

    describe('请求-响应模式 (RPC)', () => {
        it('应该能够处理请求和响应', async () => {
            const mockUserData = { id: '123', name: '李四' };

            // 注册请求处理器
            bus.onRequest('auth:getUser', async (data) => {
                expect(data).toEqual({ userId: '123' });
                return mockUserData;
            });

            // 发送请求
            const result = await bus.request('auth:getUser', { userId: '123' });

            expect(result).toEqual(mockUserData);
        });

        it('应该能够处理请求错误', async () => {
            bus.onRequest('test:error', () => {
                throw new Error('处理失败');
            });

            await expect(bus.request('test:error', {})).rejects.toThrow('处理失败');
        });

        it('应该支持请求超时', async () => {
            bus.onRequest('test:timeout', () => {
                return new Promise((resolve) => setTimeout(resolve, 1000));
            });

            await expect(
                bus.request('test:timeout', {}, {timeout: 100})
            ).rejects.toThrow(/timeout/);
        });
    });

    describe('调试方法', () => {
        it('应该能够获取监听器数量', () => {
            const handler = vi.fn();
            bus.on('test:count', handler);

            expect(bus.listenerCount('test:count')).toBe(1);
            expect(bus.pendingRequestCount()).toBe(0);
        });
    });

    describe('生命周期', () => {
        it('销毁后应该拒绝新的操作', () => {
            bus.destroy();

            const handler = vi.fn();
            bus.on('test:after-destroy', handler);
            bus.emit('test:after-destroy');

            expect(handler).not.toHaveBeenCalled();
        });

        it('应该能够重置', () => {
            const handler = vi.fn();
            bus.on('test:reset', handler);

            bus.reset();

            expect(bus.listenerCount('test:reset')).toBe(0);
        });
    });

    describe('单例模式', () => {
        it('应该返回同一个实例', () => {
            const instance1 = UnifiedEventBus.getInstance('test');
            const instance2 = UnifiedEventBus.getInstance('test');

            expect(instance1).toBe(instance2);
        });
    });
});

// describe('broadcast 导出', () => {
//     it('导出的 broadcast 应该是 UnifiedEventBus 的实例', () => {
//         expect(broadcast).toBeInstanceOf(UnifiedEventBus);
//     });
// });

describe('AppEvents 常量', () => {
    it('应该包含所有预定义的事件类型', () => {
        expect(AppEvents.AUTH_LOGIN).toBe('auth:login');
        expect(AppEvents.AUTH_LOGOUT).toBe('auth:logout');
        expect(AppEvents.USER_INFO_UPDATE).toBe('user:info:update');
        expect(AppEvents.SYSTEM_THEME_CHANGE).toBe('system:theme:change');
        expect(AppEvents.ROUTE_CHANGE).toBe('route:change');
    });
});