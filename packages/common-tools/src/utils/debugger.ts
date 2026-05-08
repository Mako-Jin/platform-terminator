/**
 * Debug 模式配置接口
 */
export interface DebugModeConfig {
    /** 生产环境域名匹配规则（支持字符串和正则表达式） */
    productionHostnamePatterns?: (string | RegExp)[];
}

const DEFAULT_PRODUCTION_PATTERNS: (string | RegExp)[] = []
/**
 * 默认生产环境域名匹配规则
 * 支持:
 * - 精确匹配: 'example.com'
 * - 通配符匹配: '*.example.com' (匹配所有子域名)
 * - 正则表达式: /\.example\.com$/ (匹配 example.com 及其子域名)
 * 默认生产环境域名配置
    /\.example\.com$/, // 匹配所有子域名
];

/**
 * 当前配置的生产环境域名匹配规则
 */
let productionHostnamePatterns: (string | RegExp)[] = [...DEFAULT_PRODUCTION_PATTERNS];

/**
 * ✅ 配置生产环境域名匹配规则
 *
 * @param patterns 域名匹配规则数组，支持字符串和正则表达式
 * - 字符串: 精确匹配或通配符匹配 ('*.example.com')
 * - 正则: 自定义匹配规则 (/\.example\.com$/)
 *
 * @example
 *
 * ```
 * configureProductionHostnames(['example.com', /\.example\.com$/]);
 * ```
 */
export function configureProductionHostnames(patterns: (string | RegExp)[]): void {
    productionHostnamePatterns = [...patterns];
}

/**
 * ✅ 获取当前是否为 Debug 模式
 *
 * 判断逻辑（优先级从高到低）:
 * 1. URL 参数 ?mode=debug
 * 2. 环境变量 import.meta.env.MODE === 'development' 且 hostname 为 localhost
 *
 * @returns 是否为 Debug 模式
 */
export function isDebugMode(): boolean {
    // 方法1: 检查 URL 参数 ?mode=debug
    const urlParams = new URLSearchParams(window.location.search);
    const urlDebugMode = urlParams.get('mode') === 'debug';

    if (urlDebugMode) {
        return true;
    }

    // 方法2: 检查环境变量 + hostname
    try {
        const envDebugMode = (import.meta as any)?.env?.MODE === 'development';

        if (envDebugMode) {
            const hostname = window.location.hostname;
            const allowedHostnames = ['localhost', '127.0.0.1'];
            return allowedHostnames.includes(hostname);
        }
    } catch (error) {
        // 在非 Vite 环境中,import.meta 可能不可用
        console.warn('[isDebugMode] Failed to check environment mode:', error);
    }

    return false;
}

/**
 * ✅ 检查是否允许启用 Debug 模式（安全检查）
 *
 * @returns 是否允许启用 Debug 模式
 */
export function canEnableDebugMode(): boolean {
    const hostname = window.location.hostname;
    return !productionHostnamePatterns.some(pattern => {
        if (typeof pattern === 'string') {
            return pattern === hostname || pattern.endsWith('*') && hostname.endsWith(pattern.slice(0, -1));
        }
        return pattern.test(hostname);
    });
}

/**
 * ✅ 获取当前 hostname
 */
export function getCurrentHostname(): string {
    return window.location.hostname;
}

