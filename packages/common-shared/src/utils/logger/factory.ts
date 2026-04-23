import type {
    BannerConfig,
    ConsoleConfig,
    CreditLink,
    KeyValueOptions,
    LoggerLevel,
    TechItem,
    ThemeColors
} from './types';
import {DEFAULT_THEME} from './themes';

export class LoggerFactory {
    private static globalConfig: ConsoleConfig = {};
    private static globalTheme: Partial<ThemeColors> = {};

    /**
     * 设置全局配置（影响所有新创建的 Logger 实例）
     */
    static configure(config: Partial<ConsoleConfig>): void {
        LoggerFactory.globalConfig = { ...LoggerFactory.globalConfig, ...config };
    }

    /**
     * 设置全局主题
     */
    static setTheme(theme: Partial<ThemeColors>): void {
        LoggerFactory.globalTheme = theme;
    }

    /**
     * 设置调试模式（全局）
     */
    static setDebugMode(enabled: boolean): void {
        LoggerFactory.globalConfig.debugMode = enabled;
    }

    // ==================== 工厂方法 ====================

    /**
     * 创建新的 Logger 实例（推荐）
     * @param moduleName - 模块名称，会显示在日志中
     * @param config - 可选的局部配置
     * @example
     * const logger = LoggerFactory.create('AuthService');
     * logger.info('用户登录成功');
     */
    static create(moduleName: string, config?: ConsoleConfig): LoggerInstance {
        return new LoggerInstance(moduleName, config);
    }

    /**
     * 获取单例 Logger（向后兼容）
     * @deprecated 推荐使用 create() 方法
     */
    static getInstance(config?: ConsoleConfig): LoggerInstance {
        if (!(LoggerFactory as any).singleton) {
            (LoggerFactory as any).singleton = new LoggerInstance('Global', config);
        }
        return (LoggerFactory as any).singleton;
    }

    /**
     * 获取全局配置（内部使用）
     */
    static getGlobalConfig(): ConsoleConfig {
        return { ...LoggerFactory.globalConfig };
    }

    /**
     * 获取全局主题（内部使用）
     */
    static getGlobalTheme(): Partial<ThemeColors> {
        return { ...LoggerFactory.globalTheme };
    }
}

/**
 * Logger 实例类
 * 每个模块可以有独立的 Logger 实例
 */
export class LoggerInstance {
    private config: ConsoleConfig;
    private readonly theme: ThemeColors;
    private readonly moduleName: string;

    constructor(moduleName: string = 'App', config?: ConsoleConfig) {
        this.moduleName = moduleName;
        
        // 合并默认配置、全局配置和局部配置
        this.config = {
            showTimestamp: true,
            timestampFormat: 'HH:MM:SS',
            enableGrouping: true,
            maxTableRows: 50,
            debugMode: false,
            ...LoggerFactory.getGlobalConfig(),  // 应用全局配置
            ...config  // 局部配置覆盖全局配置
        };
        
        // 合并主题
        this.theme = { 
            ...DEFAULT_THEME, 
            ...LoggerFactory.getGlobalTheme(),
            ...config?.theme 
        };
    }

    // ==================== 核心样式方法 ====================

    private static css(styles: Record<string, string | number>): string {
        return Object.entries(styles)
            .map(([k, v]) => `${k}:${v}`)
            .join(';');
    }

    private getTimestamp(): string {
        if (!this.config.showTimestamp) return '';

        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');

        if (this.config.timestampFormat === 'YYYY-MM-DD HH:MM:SS') {
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }

        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    private styled(level: LoggerLevel, message: string, data?: any): void {
        const colors = this.theme[level];
        const timestamp = this.getTimestamp();
        const timeStr = timestamp ? ` ${timestamp} ` : ' ';

        const moduleStyle = LoggerInstance.css({
            background: '#1e293b',
            color: '#94a3b8',
            padding: '2px 6px',
            'border-radius': '3px',
            'font-size': '9px',
            'font-weight': '600',
            'margin-right': '4px'
        });

        const tagStyle = LoggerInstance.css({
            background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.border} 100%)`,
            color: colors.fg,
            padding: '3px 10px',
            'border-radius': '4px',
            'font-weight': '700',
            'font-size': '11px',
            'text-transform': 'uppercase',
            'letter-spacing': '0.5px'
        });

        const metaStyle = LoggerInstance.css({
            color: '#64748b',
            'font-size': '10px',
            padding: '0 8px',
            'font-family': 'monospace'
        });

        const msgStyle = LoggerInstance.css({
            color: '#e2e8f0',
            'font-size': '12px',
            'font-weight': '500'
        });

        // 根据是否有数据选择不同的输出方式
        if (data !== undefined && data !== null) {
            console.log(
                `%c${this.moduleName}%c${tagStyle}%c${level.toUpperCase()}%c${timeStr}%c${message}`,
                moduleStyle,
                'padding:0;', // 重置
                tagStyle,
                metaStyle,
                msgStyle,
                data
            );
        } else {
            console.log(
                `%c${this.moduleName}%c${tagStyle}%c${level.toUpperCase()}%c${timeStr}%c${message}`,
                moduleStyle,
                'padding:0;',
                tagStyle,
                metaStyle,
                msgStyle
            );
        }
    }

    /**
     * 信息日志
     */
    info(message: string, data?: any): void {
        this.styled('info', message, data);
    }

    /**
     * 成功日志
     */
    success(message: string, data?: any): void {
        this.styled('success', message, data);
    }

    /**
     * 警告日志
     */
    warn(message: string, data?: any): void {
        this.styled('warn', message, data);
    }

    /**
     * 错误日志
     */
    error(message: string, error?: any): void {
        this.styled('error', message, error);
    }

    /**
     * 调试日志（仅在 debugMode 开启时输出）
     */
    debug(message: string, data?: any): void {
        if (!this.config.debugMode) return;
        this.styled('debug', message, data);
    }

    /**
     * 性能日志
     */
    perf(label: string, value: number, unit: string = 'ms'): void {
        this.styled('perf', `${label}: ${value}${unit}`);
    }

    // ==================== ASCII Art Banner ====================

    async loadAsciiArt(path: string): Promise<string> {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ASCII art from ${path}`);
            }
            return await response.text();
        } catch (error) {
            this.error('Failed to load ASCII art', error);
            return '';
        }
    }

    async showBanner(config: BannerConfig): Promise<void> {
        console.clear();

        let asciiArt = config.customAsciiArt || '';

        if (!asciiArt && config.asciiArtPath) {
            asciiArt = await this.loadAsciiArt(config.asciiArtPath);
        }

        if (asciiArt) {
            const lines = asciiArt.split('\n');
            const gradientColors = [
                '#22d3ee', '#2dd4bf', '#34d399', '#4ade80', '#a3e635',
                '#facc15', '#fb923c', '#f87171', '#fb7185', '#e879f9',
                '#c084fc', '#a78bfa'
            ];

            lines.forEach((line, index) => {
                if (line.trim()) {
                    const color = gradientColors[index % gradientColors.length];
                    console.log(`%c${line}`, LoggerInstance.css({ color, 'font-weight': 'bold', 'font-size': '10px', 'line-height': '1.2' }));
                } else {
                    console.log('');
                }
            });
        } else {
            console.log(`%c✨ ${config.title}`, LoggerInstance.css({ color: '#38bdf8', 'font-size': '20px', 'font-weight': 'bold' }));
        }

        if (config.subtitle) {
            console.log(
                `%c${config.subtitle} %cv${config.version || '1.0.0'}`,
                LoggerInstance.css({ color: '#94a3b8', 'font-size': '14px', 'font-weight': '400', 'padding-left': '4px' }),
                LoggerInstance.css({ color: '#475569', 'font-size': '12px', background: '#1e293b', padding: '2px 8px', 'border-radius': '4px', 'margin-left': '8px' })
            );
        }

        if (config.githubUrl) {
            console.log(
                `%c%c Code on GitHub %c ${config.githubUrl} %c →`,
                LoggerInstance.css({ padding: '4px' }),
                LoggerInstance.css({ background: 'linear-gradient(135deg, #6e5494 0%, #24292e 100%)', color: '#ffffff', 'font-size': '12px', 'font-weight': '700', padding: '6px 12px', 'border-radius': '6px 0 0 6px', 'text-shadow': '0 1px 2px rgba(0,0,0,0.3)' }),
                LoggerInstance.css({ background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)', color: '#58a6ff', 'font-size': '11px', 'font-weight': '500', padding: '6px 14px', 'border-radius': '0', border: '1px solid #30363d' }),
                LoggerInstance.css({ background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)', color: '#ffffff', 'font-size': '12px', 'font-weight': '700', padding: '6px 10px', 'border-radius': '0 6px 6px 0' })
            );
        }

        console.log('');
    }

    // ==================== 格式化输出 ====================

    section(title: string, icon: string = '◆'): void {
        console.log(
            `\n%c ${icon} ${title.toUpperCase()} `,
            LoggerInstance.css({
                background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
                color: '#38bdf8',
                'font-size': '12px',
                'font-weight': '700',
                padding: '6px 16px',
                'border-radius': '4px',
                'border-left': '3px solid #38bdf8',
                'letter-spacing': '1px'
            })
        );
    }

    divider(char: string = '─', length: number = 50): void {
        console.log(
            `%c${char.repeat(length)}`,
            LoggerInstance.css({ color: '#334155', 'font-size': '10px' })
        );
    }

    keyValue(key: string, value: string | number, options: KeyValueOptions = {}): void {
        const { keyColor = '#94a3b8', valueColor = '#67e8f9', indent = 2 } = options;
        const indentStr = ' '.repeat(indent);

        console.log(
            `%c${indentStr}${key}: %c${value}`,
            LoggerInstance.css({ color: keyColor, 'font-size': '11px', 'font-weight': '500' }),
            LoggerInstance.css({ color: valueColor, 'font-size': '11px', 'font-weight': '700' })
        );
    }

    // ==================== 表格输出 ====================

    techTable(items: TechItem[]): void {
        this.section('Tech Stack', '⚡');
        console.table(items.slice(0, this.config.maxTableRows));
    }

    // ==================== 分组输出 ====================

    groupOpen(title: string, icon: string = '📁'): void {
        if (!this.config.enableGrouping) {
            console.log(`\n${icon} ${title}`);
            return;
        }

        console.group(
            `%c ${title}`,
            LoggerInstance.css({
                color: '#f8fafc',
                'font-weight': '700',
                'font-size': '12px',
                background: 'linear-gradient(90deg, #1e3a5f 0%, #0f172a 100%)',
                padding: '6px 14px',
                'border-radius': '4px',
                'border-left': '3px solid #3b82f6'
            })
        );
    }

    group(title: string, callback: () => void, icon: string = '📁'): void {
        if (!this.config.enableGrouping) {
            console.log(`\n${icon} ${title}`);
            callback();
            return;
        }

        console.groupCollapsed(
            `%c ${icon} ${title}`,
            LoggerInstance.css({
                color: '#cbd5e1',
                'font-weight': '600',
                'font-size': '11px',
                background: '#1e293b',
                padding: '4px 12px',
                'border-radius': '4px'
            })
        );

        try {
            callback();
        } finally {
            console.groupEnd();
        }
    }

    groupEnd(): void {
        if (this.config.enableGrouping) {
            console.groupEnd();
        }
    }

    // ==================== 链接和致谢 ====================

    credits(links: CreditLink[]): void {
        this.section('Links & Credits', '🔗');
        links.forEach(({ label, url }) => {
            console.log(
                `%c  ${label}: %c${url}`,
                LoggerInstance.css({ color: '#94a3b8', 'font-size': '11px' }),
                LoggerInstance.css({ color: '#60a5fa', 'font-size': '11px', 'text-decoration': 'underline' })
            );
        });
    }

    clear(): void {
        console.clear();
    }

    reset(): void {
        console.clear();
    }
}

// 导出便捷方法
export const createLogger = LoggerFactory.create;
