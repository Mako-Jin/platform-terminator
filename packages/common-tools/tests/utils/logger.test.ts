// tests/utils/logger.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoggerFactory, LoggerInstance } from '../../src/utils/logger';

describe('Logger', () => {
    describe('工厂方法', () => {
        it('应该能够创建新的 Logger 实例', () => {
            const logger = LoggerFactory.create('TestModule');
            expect(logger).toBeInstanceOf(LoggerInstance);
        });

        it('应该能够为不同模块创建独立的 Logger 实例', () => {
            const logger1 = LoggerFactory.create('Module1');
            const logger2 = LoggerFactory.create('Module2');
            expect(logger1).not.toBe(logger2);
        });

        it('应该能够获取单例 Logger（向后兼容）', () => {
            const logger1 = LoggerFactory.getInstance();
            const logger2 = LoggerFactory.getInstance();
            expect(logger1).toBe(logger2);
        });
    });

    describe('全局配置', () => {
        beforeEach(() => {
            // 重置全局配置
            LoggerFactory.configure({});
            LoggerFactory.setTheme({});
        });

        it('应该能够设置全局配置', () => {
            // 先设置全局 debugMode
            LoggerFactory.configure({
                debugMode: true,
                showTimestamp: false,
            });

            // 创建新实例时会继承全局配置
            const logger = LoggerFactory.create('TestModule');
            const consoleSpy = vi.spyOn(console, 'log');
            
            // debugMode 为 true，应该输出
            logger.debug('Debug message');
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        it('应该能够设置全局调试模式', () => {
            LoggerFactory.setDebugMode(true);
            
            const logger = LoggerFactory.create('TestModule');
            const consoleSpy = vi.spyOn(console, 'log');
            
            logger.debug('Debug message');
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        it('应该能够设置全局主题', () => {
            expect(() => {
                LoggerFactory.setTheme({
                    info: { fg: '#ff0000', bg: '#00ff00', border: '#0000ff' },
                });
            }).not.toThrow();
        });
    });

    describe('基本日志方法', () => {
        let logger: LoggerInstance;

        beforeEach(() => {
            logger = LoggerFactory.create('TestModule', {
                showTimestamp: false,
                debugMode: true,
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('应该能够输出 info 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.info('This is an info message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出 success 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.success('This is a success message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出 warn 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.warn('This is a warning message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出 error 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.error('This is an error message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出带数据的日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            const testData = { userId: '123', action: 'login' };
            logger.info('User action', testData);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该在 debugMode 为 true 时输出 debug 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.debug('This is a debug message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该在 debugMode 为 false 时不输出 debug 日志', () => {
            const debugDisabledLogger = LoggerFactory.create('TestModule', {
                showTimestamp: false,
                debugMode: false,
            });
            
            const consoleSpy = vi.spyOn(console, 'log');
            debugDisabledLogger.debug('This should not appear');
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出性能日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.perf('Render time', 123.45, 'ms');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('时间戳功能', () => {
        it('应该在 showTimestamp 为 true 时显示时间戳', () => {
            const logger = LoggerFactory.create('TestModule', {
                showTimestamp: true,
                timestampFormat: 'HH:MM:SS',
            });
            
            const consoleSpy = vi.spyOn(console, 'log');
            logger.info('Message with timestamp');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该在 showTimestamp 为 false 时不显示时间戳', () => {
            const logger = LoggerFactory.create('TestModule', {
                showTimestamp: false,
            });
            
            const consoleSpy = vi.spyOn(console, 'log');
            logger.info('Message without timestamp');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('格式化输出', () => {
        let logger: LoggerInstance;

        beforeEach(() => {
            logger = LoggerFactory.create('TestModule', {
                showTimestamp: false,
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('应该能够输出分组标题', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.section('Test Section', '◆');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出分隔线', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.divider('─', 50);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出键值对', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.keyValue('Key', 'Value');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出自定义样式的键值对', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.keyValue('Custom Key', 'Custom Value', {
                keyColor: '#ff0000',
                valueColor: '#00ff00',
                indent: 4,
            });
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出技术栈表格', () => {
            const consoleSpy = vi.spyOn(console, 'table');
            const techItems = [
                { Layer: 'Frontend', Technology: 'React', Version: '18.0' },
                { Layer: 'Build', Technology: 'Vite', Version: '5.0' },
            ];
            logger.techTable(techItems);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('分组输出', () => {
        let logger: LoggerInstance;

        beforeEach(() => {
            logger = LoggerFactory.create('TestModule', {
                enableGrouping: true,
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('应该能够打开分组', () => {
            const consoleSpy = vi.spyOn(console, 'group');
            logger.groupOpen('Test Group', '📁');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够执行分组回调', () => {
            const consoleSpy = vi.spyOn(console, 'groupCollapsed');
            const callbackSpy = vi.fn();
            
            logger.group('Test Group', callbackSpy, '📁');
            
            expect(consoleSpy).toHaveBeenCalled();
            expect(callbackSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        it('应该在 enableGrouping 为 false 时不使用分组', () => {
            const noGroupLogger = LoggerFactory.create('TestModule', {
                enableGrouping: false,
            });
            
            const groupSpy = vi.spyOn(console, 'groupCollapsed');
            const logSpy = vi.spyOn(console, 'log');
            const callbackSpy = vi.fn();
            
            noGroupLogger.group('Test Group', callbackSpy);
            
            expect(groupSpy).not.toHaveBeenCalled();
            expect(logSpy).toHaveBeenCalled();
            expect(callbackSpy).toHaveBeenCalled();
            
            groupSpy.mockRestore();
            logSpy.mockRestore();
        });
    });

    describe('清理方法', () => {
        let logger: LoggerInstance;

        beforeEach(() => {
            logger = LoggerFactory.create('TestModule');
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('应该能够清空控制台', () => {
            const consoleSpy = vi.spyOn(console, 'clear');
            logger.clear();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够重置 Logger', () => {
            const consoleSpy = vi.spyOn(console, 'clear');
            logger.reset();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('ASCII Art Banner', () => {
        let logger: LoggerInstance;

        beforeEach(() => {
            logger = LoggerFactory.create('TestModule');
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('应该能够加载 ASCII Art', async () => {
            const mockArt = '  ___  \n / _ \\ \n| | | |\n| |_| |\n \\___/ ';
            
            (globalThis as any).fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(mockArt),
                } as Response)
            );

            const art = await logger.loadAsciiArt('/test/banner.txt');
            expect(art).toBe(mockArt);
            expect((globalThis as any).fetch).toHaveBeenCalledWith('/test/banner.txt');
            
            vi.restoreAllMocks();
        });

        it('应该在加载失败时返回空字符串', async () => {
            (globalThis as any).fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                } as Response)
            );

            const art = await logger.loadAsciiArt('/test/not-found.txt');
            expect(art).toBe('');
            
            vi.restoreAllMocks();
        });

        it('应该能够显示 Banner', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            const clearSpy = vi.spyOn(console, 'clear');
            
            await logger.showBanner({
                title: 'Test App',
                subtitle: 'A test application',
                version: '1.0.0',
            });
            
            expect(clearSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
            clearSpy.mockRestore();
        });

        it('应该能够显示带 GitHub 链接的 Banner', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            
            await logger.showBanner({
                title: 'Test App',
                githubUrl: 'https://github.com/test/repo',
            });
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('Credits 输出', () => {
        let logger: LoggerInstance;

        beforeEach(() => {
            logger = LoggerFactory.create('TestModule');
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('应该能够输出致谢链接', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            const links = [
                { label: 'GitHub', url: 'https://github.com/test' },
                { label: 'Docs', url: 'https://docs.test.com' },
            ];
            
            logger.credits(links);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('模块隔离', () => {
        it('不同模块的 Logger 应该独立工作', () => {
            const logger1 = LoggerFactory.create('Module1', { debugMode: true });
            const logger2 = LoggerFactory.create('Module2', { debugMode: false });
            
            const consoleSpy = vi.spyOn(console, 'log');
            
            logger1.debug('From Module1');
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            
            logger2.debug('From Module2');
            expect(consoleSpy).toHaveBeenCalledTimes(1); // Module2 的 debug 不应该输出
            
            consoleSpy.mockRestore();
        });
    });
});
