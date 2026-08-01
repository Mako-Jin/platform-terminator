
// 类型导出
export * from './types';

// 核心API
export { themeCore } from './core/theme-core';

// 配置工具
export { getThemeById, AVAILABLE_THEMES, THEME_PALETTES } from './core/theme.config';

// 国际化
export {
    getCurrentLanguage,
    setCurrentLanguage,
    getLanguagePack,
    getThemeName,
    t,
    onLanguageChange,
    detectBrowserLanguage,
    initLanguage,
} from './i18n';

// 适配器
export { useTheme as useReactTheme } from './adapters/react-use-theme';
export { useTheme as useVueTheme } from './adapters/vue-use-theme';
