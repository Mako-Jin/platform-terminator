
import type {
    ConsoleConfig,
    BannerConfig,
    TechItem,
    CreditLink,
    KeyValueOptions,
    LoggerLevel,
    ThemeColors
} from './types';
import { DEFAULT_THEME } from './themes';

export class LoggerFactory {
    private static instance: LoggerFactory;
    private config: ConsoleConfig;
    private theme: ThemeColors;
    private asciiArtCache: Map<string, string> = new Map();

    private constructor(config: ConsoleConfig = {}) {
        this.config = {
            showTimestamp: true,
            timestampFormat: 'HH:MM:SS',
            enableGrouping: true,
            maxTableRows: 50,
            debugMode: false,
            ...config
        };
        this.theme = { ...DEFAULT_THEME, ...config.theme };
    }

    static getInstance(config?: ConsoleConfig): LoggerFactory {
        if (!LoggerFactory.instance) {
            LoggerFactory.instance = new LoggerFactory(config);
        }
        return LoggerFactory.instance;
    }

    static reinit(config?: ConsoleConfig): LoggerFactory {
        LoggerFactory.instance = new LoggerFactory(config);
        return LoggerFactory.instance;
    }

    // ==================== 配置方法 ====================

    updateConfig(config: Partial<ConsoleConfig>): void {
        this.config = { ...this.config, ...config };
    }

    updateTheme(theme: Partial<ThemeColors>): void {
        this.theme = { ...this.theme, ...theme };
    }

    setDebugMode(enabled: boolean): void {
        this.config.debugMode = enabled;
    }

    // ==================== 核心样式方法 ====================

    private css(styles: Record<string, string | number>): string {
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

    private styled(level: LoggerLevel, label: string, message: string): void {
        const colors = this.theme[level];
        const timestamp = this.getTimestamp();
        const timeStr = timestamp ? ` ${timestamp} ` : ' ';

        const tagStyle = this.css({
            background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.border} 100%)`,
            color: colors.fg,
            padding: '3px 10px',
            'border-radius': '4px',
            'font-weight': '700',
            'font-size': '11px',
            'text-transform': 'uppercase',
            'letter-spacing': '0.5px'
        });

        const metaStyle = this.css({
            color: '#64748b',
            'font-size': '10px',
            padding: '0 8px',
            'font-family': 'monospace'
        });

        const msgStyle = this.css({
            color: '#e2e8f0',
            'font-size': '12px',
            'font-weight': '500'
        });

        console.log(`%c${label}%c${timeStr}%c${message}`, tagStyle, metaStyle, msgStyle);
    }

    // ==================== 公共日志方法 ====================

    info(label: string, message: string): void {
        this.styled('info', label, message);
    }

    success(label: string, message: string): void {
        this.styled('success', label, message);
    }

    warn(label: string, message: string): void {
        this.styled('warn', label, message);
    }

    error(label: string, message: string): void {
        this.styled('error', label, message);
    }

    debug(label: string, message: string): void {
        if (!this.config.debugMode) return;
        this.styled('debug', label, message);
    }

    perf(label: string, value: number, unit: string = 'ms'): void {
        this.styled('perf', 'PERF', `${label}: ${value}${unit}`);
    }

    // ==================== ASCII Art Banner ====================

    async loadAsciiArt(path: string): Promise<string> {
        if (this.asciiArtCache.has(path)) {
            return this.asciiArtCache.get(path)!;
        }

        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load ASCII art from ${path}`);
            const art = await response.text();
            this.asciiArtCache.set(path, art);
            return art;
        } catch (error) {
            console.error('Failed to load ASCII art:', error);
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
            // 支持多行颜色渐变的 ASCII 艺术
            const lines = asciiArt.split('\n');
            const gradientColors = [
                '#22d3ee', '#2dd4bf', '#34d399', '#4ade80', '#a3e635',
                '#facc15', '#fb923c', '#f87171', '#fb7185', '#e879f9',
                '#c084fc', '#a78bfa'
            ];

            lines.forEach((line, index) => {
                if (line.trim()) {
                    const color = gradientColors[index % gradientColors.length];
                    console.log(`%c${line}`, this.css({ color, 'font-weight': 'bold', 'font-size': '10px', 'line-height': '1.2' }));
                } else {
                    console.log('');
                }
            });
        } else {
            // 默认简单 Banner
            console.log(`%c✨ ${config.title}`, this.css({ color: '#38bdf8', 'font-size': '20px', 'font-weight': 'bold' }));
        }

        // 显示副标题和版本
        if (config.subtitle) {
            console.log(
                `%c${config.subtitle} %cv${config.version || '1.0.0'}`,
                this.css({ color: '#94a3b8', 'font-size': '14px', 'font-weight': '400', 'padding-left': '4px' }),
                this.css({ color: '#475569', 'font-size': '12px', background: '#1e293b', padding: '2px 8px', 'border-radius': '4px', 'margin-left': '8px' })
            );
        }

        // 显示 GitHub 链接
        if (config.githubUrl) {
            console.log(
                `%c%c Code on GitHub %c ${config.githubUrl} %c →`,
                this.css({ padding: '4px' }),
                this.css({ background: 'linear-gradient(135deg, #6e5494 0%, #24292e 100%)', color: '#ffffff', 'font-size': '12px', 'font-weight': '700', padding: '6px 12px', 'border-radius': '6px 0 0 6px', 'text-shadow': '0 1px 2px rgba(0,0,0,0.3)' }),
                this.css({ background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)', color: '#58a6ff', 'font-size': '11px', 'font-weight': '500', padding: '6px 14px', 'border-radius': '0', border: '1px solid #30363d' }),
                this.css({ background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)', color: '#ffffff', 'font-size': '12px', 'font-weight': '700', padding: '6px 10px', 'border-radius': '0 6px 6px 0' })
            );
        }

        console.log('');
    }

    // ==================== 格式化输出 ====================

    section(title: string, icon: string = '◆'): void {
        console.log(
            `\n%c ${icon} ${title.toUpperCase()} `,
            this.css({
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
            this.css({ color: '#334155', 'font-size': '10px' })
        );
    }

    keyValue(key: string, value: string | number, options: KeyValueOptions = {}): void {
        const { keyColor = '#94a3b8', valueColor = '#67e8f9', indent = 2 } = options;
        const indentStr = ' '.repeat(indent);

        console.log(
            `%c${indentStr}${key}: %c${value}`,
            this.css({ color: keyColor, 'font-size': '11px', 'font-weight': '500' }),
            this.css({ color: valueColor, 'font-size': '11px', 'font-weight': '700' })
        );
    }

    // ==================== 表格输出 ====================

    techTable(items: TechItem[]): void {
        this.section('Tech Stack', '⚡');

        const rows = items.slice(0, this.config.maxTableRows);
        console.table(rows);
    }

    // ==================== 分组输出 ====================

    groupOpen(title: string, icon: string = '📁'): void {
        if (!this.config.enableGrouping) {
            console.log(`\n${icon} ${title}`);
            return;
        }

        console.group(
            `%c ${title}`,
            this.css({
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
            this.css({
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
                this.css({ color: '#94a3b8', 'font-size': '11px' }),
                this.css({ color: '#60a5fa', 'font-size': '11px', 'text-decoration': 'underline' })
            );
        });
    }

    // ==================== 环境变量读取 ====================

    static getEnvConfig(): Partial<ConsoleConfig> {
        // 从 Vite 环境变量读取
        const debugMode = import.meta.env?.VITE_CONSOLE_DEBUG === 'true';
        const showTimestamp = import.meta.env?.VITE_CONSOLE_TIMESTAMP !== 'false';
        const timestampFormat = import.meta.env?.VITE_CONSOLE_TIMESTAMP_FORMAT as 'HH:MM:SS' | 'YYYY-MM-DD HH:MM:SS' || 'HH:MM:SS';

        return {
            debugMode,
            showTimestamp,
            timestampFormat
        };
    }

    static getEnvBannerConfig(): Partial<BannerConfig> {
        return {
            title: import.meta.env?.VITE_APP_TITLE || 'Application',
            subtitle: import.meta.env?.VITE_APP_DESCRIPTION,
            version: import.meta.env?.VITE_APP_VERSION,
            githubUrl: import.meta.env?.VITE_GITHUB_URL,
            asciiArtPath: import.meta.env?.VITE_ASCII_ART_PATH || '/ascii/banner.txt'
        };
    }

    // ==================== 清理 ====================

    clear(): void {
        console.clear();
    }

    reset(): void {
        console.clear();
        this.asciiArtCache.clear();
    }
}

// 导出单例实例
export const Logger = LoggerFactory.getInstance();