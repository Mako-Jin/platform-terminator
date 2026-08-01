import type { ThemeId } from '../types';
import {AppEvents, eventBus, type EventMap, localStorage, LoggerFactory} from "common-tools";

/** 支持的语言类型 */
export type Language = 'zh-CN' | 'en-US';

/** 主题名称翻译映射 */
type ThemeNameMap = Record<ThemeId, string>;

const LANG_STORAGE_KEY = "sts-system-lang";

type LocaleChangePayload = EventMap[typeof AppEvents.SYSTEM_LOCALE_CHANGE] & {
    locale: Language;
};

const logger = LoggerFactory.create("common-theme-i18n");

/** 完整的语言包 */
interface LanguagePack {
    locale: Language;
    themeNames: ThemeNameMap;
    labels: {
        light: string;
        dark: string;
        system: string;
        auto: string;
        custom: string;
    };
}

// 中文语言包
const ZH_CN: LanguagePack = {
    locale: 'zh-CN',
    themeNames: {
        LOTUS_POND_GREEN: '青荷森绿',
        WISTERIA_BLUE: '紫藤雾蓝',
        NAVY_ROSE: '藏青蔷薇',
        OCHRE_BROWN: '橙木',
        PINE_GREEN: '翠影松青',
        PEONY_RED: '朱砂牡丹红',
    },
    labels: {
        light: '亮色',
        dark: '暗色',
        system: '跟随系统',
        auto: '自动',
        custom: '自定义',
    },
};

// 英文语言包
const EN_US: LanguagePack = {
    locale: 'en-US',
    themeNames: {
        LOTUS_POND_GREEN: 'Lotus Pond Green',
        WISTERIA_BLUE: 'Wisteria Blue',
        NAVY_ROSE: 'Navy Rose',
        OCHRE_BROWN: 'Ochre Brown',
        PINE_GREEN: 'Pine Green',
        PEONY_RED: 'Peony Red',
    },
    labels: {
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        auto: 'Auto',
        custom: 'Custom',
    },
};

// 语言包映射
const LANGUAGE_PACKS: Record<Language, LanguagePack> = {
    'zh-CN': ZH_CN,
    'en-US': EN_US,
};

// 当前语言（可动态切换）
let currentLanguage: Language = 'zh-CN';

/** 获取当前语言 */
export function getCurrentLanguage(): Language {
    return currentLanguage;
}

/** 设置当前语言 */
export function setCurrentLanguage(lang: Language): void {
    currentLanguage = lang;
    // 触发语言变更事件
    languageChangeListeners.forEach(fn => fn(lang));
}

/** 获取当前语言包 */
export function getLanguagePack(): LanguagePack {
    return LANGUAGE_PACKS[currentLanguage];
}

/** 获取主题名称 */
export function getThemeName(themeId: ThemeId): string {
    const pack = getLanguagePack();
    return pack.themeNames[themeId] || themeId;
}

/** 获取标签翻译 */
export function t(key: keyof LanguagePack['labels']): string {
    const pack = getLanguagePack();
    return pack.labels[key] || key;
}

/** 语言变更监听器 */
const languageChangeListeners: ((lang: Language) => void)[] = [];

/** 订阅语言变更 */
export function onLanguageChange(listener: (lang: Language) => void): () => void {
    languageChangeListeners.push(listener);
    return () => {
        const index = languageChangeListeners.indexOf(listener);
        if (index > -1) languageChangeListeners.splice(index, 1);
    };
}

const isBrowser = typeof window !== 'undefined';

/** 检测浏览器语言 */
export function detectBrowserLanguage(): Language {
    if (!isBrowser) return 'zh-CN';
    const lang = (navigator?.language as string) || 'zh-CN';
    return lang.startsWith('zh') ? 'zh-CN' : 'en-US';
}

/** 从存储恢复语言偏好 */
export function getStoredLanguage(): Language | null {
    try {
        return localStorage.get<Language>(LANG_STORAGE_KEY);
    } catch (err) {
        logger.warn('读取语言偏好失败', err);
        return null;
    }
}

/** 存储语言偏好 */
export function setStoredLanguage(lang: Language): void {
    try {
        localStorage.set(LANG_STORAGE_KEY, lang);
    } catch (err) {
        logger.error('保存语言偏好失败', err);
    }
}

/**
 * 监听全局事件总线的语言变化，用于跨标签页同步
 */
export function bindCrossTabSync(): () => void {
    return eventBus.on(AppEvents.SYSTEM_LOCALE_CHANGE, (payload: LocaleChangePayload) => {
        if (payload?.locale && payload.locale !== currentLanguage) {
            currentLanguage = payload.locale as Language;
            languageChangeListeners.forEach((fn) => fn(currentLanguage));
            logger.debug(`跨标签页同步语言: ${currentLanguage}`);
        }
    });
}

/** 初始化语言（从存储或浏览器检测） */
export function initLanguage(): Language {
    const stored = getStoredLanguage();
    const lang = stored || detectBrowserLanguage();
    setCurrentLanguage(lang);
    setStoredLanguage(lang);
    return lang;
}