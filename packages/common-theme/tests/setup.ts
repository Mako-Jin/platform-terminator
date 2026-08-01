/**
 * 测试环境设置
 */

// 如果需要全局 mock，可以在这里配置
beforeEach(() => {
    // 每个测试前的清理工作
});

afterEach(() => {
    // 每个测试后的清理工作
});

// Vitest 全局 Setup 文件
// 在所有测试之前执行的初始化操作

// Mock 浏览器 API（jsdom 环境下部分 API 可能缺失）
if (typeof window !== 'undefined') {
    // 确保 matchMedia 可用
    if (!window.matchMedia) {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    }
}