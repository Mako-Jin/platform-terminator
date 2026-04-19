// tests/utils/logger.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoggerFactory, Logger } from '../../src/utils/logger';

describe('Logger', () => {
    let logger: typeof Logger;

    beforeEach(() => {
        // 每次测试前重新初始化 Logger
        logger = LoggerFactory.reinit({
            showTimestamp: false,
            debugMode: true,
        });
    });

    afterEach(() => {
        // 清理所有 console spy
        vi.restoreAllMocks();
    });

    describe('基本日志方法', () => {
        it('应该能够输出 info 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.info('TEST', 'This is an info message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出 success 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.success('TEST', 'This is a success message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出 warn 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.warn('TEST', 'This is a warning message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出 error 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.error('TEST', 'This is an error message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该在 debugMode 为 true 时输出 debug 日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.debug('TEST', 'This is a debug message');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该在 debugMode 为 false 时不输出 debug 日志', () => {
            // 创建一个新的 Logger 实例，debugMode 为 false
            const debugDisabledLogger = LoggerFactory.reinit({
                showTimestamp: false,
                debugMode: false
            });
            const consoleSpy = vi.spyOn(console, 'log');
            debugDisabledLogger.debug('TEST', 'This should not appear');
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够输出性能日志', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            logger.perf('TEST', 123.45, 'ms');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('配置更新', () => {
        it('应该能够更新配置', () => {
            logger.updateConfig({ debugMode: false });
            const consoleSpy = vi.spyOn(console, 'log');
            logger.debug('TEST', 'Should not appear');
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该能够更新主题', () => {
            expect(() => {
                logger.updateTheme({
                    info: { fg: '#ff0000', bg: '#00ff00', border: '#0000ff' },
                });
            }).not.toThrow();
        });
    });

    describe('格式化输出', () => {
        it('应该能够输出分组', () => {
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
    });

    describe('清理方法', () => {
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
});