import type { ThemeId, ThemeMode, ThemeConfig, ThemeState, ThemeListener } from '../types';
import { getThemeById, AVAILABLE_THEMES } from './theme.config';
import {normalizeMode} from "../utils.ts";
import {LoggerFactory, localStorage, eventBus, AppEvents, type EventMap} from "common-tools";

const listeners: ThemeListener[] = [];
const isBrowser = typeof window !== 'undefined';

const DEFAULT_THEME_ID: ThemeId = 'LOTUS_POND_GREEN' as ThemeId;
const STORAGE_KEY = 'theme_preference';

const logger = LoggerFactory.create('common-theme-core');

type ThemeChangePayload = Omit<EventMap[typeof AppEvents.SYSTEM_THEME_CHANGE], 'theme'> & {
    theme: ThemeId;
    mode: ThemeMode;
    isUserCustomMode?: boolean;
};

function isValidThemeId(id: string): id is ThemeId {
    return AVAILABLE_THEMES.includes(id as ThemeId);
}

function getDefaultModeByTime(): ThemeMode {
    const hours = new Date().getHours();
    return hours >= 6 && hours < 18 ? 'light' : 'dark';
}

function getStoredPreference(): Partial<ThemeState> | null {
    try {
        return localStorage.get<Partial<ThemeState>>(STORAGE_KEY);
    } catch (err) {
        logger.warn('读取主题偏好失败', err);
        return null;
    }
}

function setStoredPreference(pref: Partial<ThemeState>) {
    try {
        localStorage.set(STORAGE_KEY, { ...getStoredPreference(), ...pref });
    } catch (err) {
        logger.error('保存主题偏好失败', err);
    }
}

function applyTheme(theme: ThemeConfig, mode: ThemeMode) {
    if (!isBrowser || !document?.documentElement) return;
    const palette = mode === 'light' ? theme.light : theme.dark;
    const root = document.documentElement.style;

    root.setProperty('--color-primary', palette.primary);
    root.setProperty('--color-secondary', palette.secondary);
    root.setProperty('--color-accent', palette.accent);
    root.setProperty('--color-neutral-dark', palette.neutralDark);
    root.setProperty('--color-neutral-light', palette.neutralLight);
    root.setProperty('--color-background', palette.background);
    root.setProperty('--color-card-bg', palette.cardBackground);
    root.setProperty('--color-text', palette.text);
    root.setProperty('--color-border', palette.border);

    document.documentElement.setAttribute('data-theme-id', theme.id);
    document.documentElement.setAttribute('data-theme-mode', mode);
}

export const themeCore = {
    currentThemeId: DEFAULT_THEME_ID,
    currentMode: 'light' as ThemeMode,
    isUserCustomMode: false,
    isInitialized: false,

    // 初始化：恢复用户主题 + 明暗偏好
    init(): void {
        if (this.isInitialized) {
            return;
        }
        if (!isBrowser) {
            // SSR 环境下跳过 DOM 操作，但仍设置初始状态
            this.currentThemeId = DEFAULT_THEME_ID;
            this.currentMode = 'light';
            this.isInitialized = true;
            return;
        }
        const pref = getStoredPreference();
        const savedThemeId = pref?.themeId;
        this.currentThemeId = savedThemeId && AVAILABLE_THEMES.includes(savedThemeId)
                ? savedThemeId
                : DEFAULT_THEME_ID;
        if (pref) {
            // 用户有存储偏好，优先使用
            this.currentMode = normalizeMode(pref.mode);
            this.isUserCustomMode = pref.isUserCustomMode ?? true;
        } else {
            // 用户无偏好，根据时间自动选择
            this.currentMode = getDefaultModeByTime();
            this.isUserCustomMode = false;
        }
        // 应用默认主题
        const theme = getThemeById(this.currentThemeId);
        applyTheme(theme, this.currentMode);
        // 初始化完成后，向全局事件总线广播当前状态（便于其他标签页同步）
        eventBus.emit(
            AppEvents.SYSTEM_THEME_CHANGE,
            {
                theme: this.currentThemeId,
                mode: this.currentMode,
                isUserCustomMode: this.isUserCustomMode,
            },
            { crossTab: true },
        );
        logger.info(
            `初始化完成: theme=${this.currentThemeId}, mode=${this.currentMode}, userCustom=${this.isUserCustomMode}`,
        );
        this.isInitialized = true;
    },

    /**
     * 监听全局事件总线的主题变化，用于跨标签页同步
     */
    bindCrossTabSync(): () => void {
        return eventBus.on(
            AppEvents.SYSTEM_THEME_CHANGE,
            (payload: ThemeChangePayload) => {
                if (!payload || payload.theme == null) {
                    return;
                }
                const themeId = payload.theme as ThemeId;
                const mode = normalizeMode(payload.mode);
                // 避免重复应用
                if (
                    themeId === this.currentThemeId &&
                    mode === this.currentMode
                ) {
                    return;
                }
                this.currentThemeId = themeId;
                this.currentMode = mode;
                this.isUserCustomMode =
                    typeof payload.isUserCustomMode === 'boolean'
                        ? payload.isUserCustomMode
                        : this.isUserCustomMode;
                const theme = getThemeById(themeId);
                applyTheme(theme, mode);
                this._notifyListeners();
                logger.debug(`跨标签页同步主题: ${themeId}/${mode}`);
            },
        );
    },

    // 核心方法：设置主题（由业务层调用）
    setTheme(themeId: ThemeId): void {
        if (!isValidThemeId(themeId)) {
            logger.warn(`[ThemeCore] 无效主题 "${themeId}"，使用默认主题`);
            themeId = DEFAULT_THEME_ID;
        }
        this.currentThemeId = themeId;
        const theme = getThemeById(this.currentThemeId);
        applyTheme(theme, this.currentMode);
        // 持久化 themeId
        setStoredPreference({ themeId: this.currentThemeId });
        // 广播主题变更事件（跨标签页同步）
        eventBus.emit(
            AppEvents.SYSTEM_THEME_CHANGE,
            {
                theme: themeId,
                mode: this.currentMode,
                isUserCustomMode: this.isUserCustomMode,
            },
            { crossTab: true },
        );
        logger.info(`切换主题: ${themeId}`);
        this._notifyListeners();
    },

    // 切换明暗模式
    setMode(mode: ThemeMode, isUserCustom: boolean = true): void {
        this.currentMode = mode;
        this.isUserCustomMode = isUserCustom;
        // 保存到本地存储
        setStoredPreference({
            themeId: this.currentThemeId,
            mode: this.currentMode,
            isUserCustomMode: this.isUserCustomMode,
        });

        const theme = getThemeById(this.currentThemeId);
        applyTheme(theme, mode);
        eventBus.emit(
            AppEvents.SYSTEM_THEME_CHANGE,
            {
                theme: this.currentThemeId,
                mode,
                isUserCustomMode: this.isUserCustomMode,
            },
            { crossTab: true },
        );
        logger.info(`切换模式: ${mode}`);
        this._notifyListeners();
    },

    // 切换明暗
    toggleMode(): void {
        const newMode = this.currentMode === 'light' ? 'dark' : 'light';
        this.setMode(newMode, true);
    },

    // 重置为系统自动模式（清除用户自定义标记）
    resetToAutoMode(): void {
        this.isUserCustomMode = false;
        const autoMode = getDefaultModeByTime();
        this.currentMode = autoMode;

        // 清除存储或标记为非自定义
        setStoredPreference({
            mode: autoMode,
            isUserCustomMode: false,
        } as ThemeState);

        const theme = getThemeById(this.currentThemeId);
        applyTheme(theme, autoMode);
        eventBus.emit(
            AppEvents.SYSTEM_THEME_CHANGE,
            {
                theme: this.currentThemeId,
                mode: autoMode,
                isUserCustomMode: false,
            },
            { crossTab: true },
        );
        logger.info(`重置为自动模式: ${autoMode}`);
        this._notifyListeners();
    },

    // 获取当前模式
    getMode(): ThemeMode {
        return this.currentMode;
    },

    // 获取当前主题ID
    getThemeId(): ThemeId {
        return this.currentThemeId;
    },

    // 获取当前主题完整配置
    getThemeConfig(): ThemeConfig {
        return getThemeById(this.currentThemeId);
    },

    // 获取当前CSS变量值
    getCSSVariables(): Record<string, string> {
        if (!isBrowser) {
            return {};
        }
        const style = getComputedStyle(document.documentElement);
        return {
            primary: style.getPropertyValue('--color-primary').trim(),
            secondary: style.getPropertyValue('--color-secondary').trim(),
            accent: style.getPropertyValue('--color-accent').trim(),
            neutralDark: style.getPropertyValue('--color-neutral-dark').trim(),
            neutralLight: style.getPropertyValue('--color-neutral-light').trim(),
            background: style.getPropertyValue('--color-background').trim(),
            cardBackground: style.getPropertyValue('--color-card-bg').trim(),
            text: style.getPropertyValue('--color-text').trim(),
            border: style.getPropertyValue('--color-border').trim(),
        };
    },

    // 获取当前状态（用于订阅初始值）
    getState(): ThemeState {
        return {
            themeId: this.currentThemeId,
            mode: this.currentMode,
            isUserCustomMode: this.isUserCustomMode,
        };
    },

    // 订阅主题变更
    subscribe(listener: ThemeListener): () => void {
        listeners.push(listener);
        // 立即推送当前状态
        listener(this.getState());
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) listeners.splice(index, 1);
        };
    },

    // 内部方法：通知所有监听器
    _notifyListeners(): void {
        const state = this.getState();
        listeners.forEach(fn => fn(state));
    },
};