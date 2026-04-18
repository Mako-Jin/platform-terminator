

export type LoggerLevel = 'info' | 'success' | 'warn' | 'error' | 'debug' | 'perf';

export interface ColorScheme {
    fg: string;
    bg: string;
    border: string;
}


export interface ColorScheme {
    fg: string;
    bg: string;
    border: string;
}

export interface ThemeColors {
    info: ColorScheme;
    success: ColorScheme;
    warn: ColorScheme;
    error: ColorScheme;
    debug: ColorScheme;
    perf: ColorScheme;
}

export interface BannerConfig {
    title: string;
    subtitle?: string;
    version?: string;
    githubUrl?: string;
    asciiArtPath?: string;  // ASCII 艺术字文件路径
    customAsciiArt?: string; // 或直接传入 ASCII 字符串
}

export interface ConsoleConfig {
    theme?: Partial<ThemeColors>;
    showTimestamp?: boolean;
    timestampFormat?: 'HH:MM:SS' | 'YYYY-MM-DD HH:MM:SS';
    enableGrouping?: boolean;
    maxTableRows?: number;
    debugMode?: boolean;
}

export interface TechItem {
    Layer: string;
    Technology: string;
    Details?: string;
}

export interface CreditLink {
    label: string;
    url: string;
}

export interface KeyValueOptions {
    keyColor?: string;
    valueColor?: string;
    indent?: number;
}
