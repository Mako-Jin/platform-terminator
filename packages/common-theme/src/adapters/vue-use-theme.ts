// src/adapters/vue-use-theme.ts
import { ref, onMounted, onUnmounted, readonly, computed } from 'vue';
import { themeCore } from '../core/theme-core';
import { getThemeName, getCurrentLanguage, onLanguageChange } from '../i18n';
import type { ThemeId, ThemeMode } from '../types';

export function useTheme() {
    // 实例级响应式状态（每次调用都独立）
    const state = themeCore.getState();
    const themeId = ref<ThemeId>(state.themeId);
    const mode = ref<ThemeMode>(state.mode);
    const isUserCustomMode = ref<boolean>(state.isUserCustomMode ?? false);
    const language = ref(getCurrentLanguage());

    // 计算属性：主题名称自动响应语言变化
    const themeName = computed(() => getThemeName(themeId.value));

    let themeUnsubscribe: (() => void) | null = null;
    let langUnsubscribe: (() => void) | null = null;

    onMounted(() => {
        // 订阅主题变更
        themeUnsubscribe = themeCore.subscribe((newState) => {
            themeId.value = newState.themeId;
            mode.value = newState.mode;
            isUserCustomMode.value = newState.isUserCustomMode ?? false;
        });

        // 订阅语言变更
        langUnsubscribe = onLanguageChange((lang) => {
            language.value = lang;
        });
    });

    onUnmounted(() => {
        if (themeUnsubscribe) {
            themeUnsubscribe();
            themeUnsubscribe = null;
        }
        if (langUnsubscribe) {
            langUnsubscribe();
            langUnsubscribe = null;
        }
    });

    // 方法
    const setMode = (newMode: ThemeMode, isUserCustom = true) => {
        themeCore.setMode(newMode, isUserCustom);
    };

    const toggleMode = () => {
        themeCore.toggleMode();
    };

    const setTheme = (newThemeId: ThemeId) => {
        themeCore.setTheme(newThemeId);
    };

    const resetToAutoMode = () => {
        themeCore.resetToAutoMode();
    };

    const getCSSVars = () => {
        return themeCore.getCSSVariables();
    };

    return {
        // 响应式数据
        themeId: readonly(themeId),
        themeName: readonly(themeName),
        mode: readonly(mode),
        isUserCustomMode: readonly(isUserCustomMode),
        language: readonly(language),

        // 方法
        setMode,
        toggleMode,
        setTheme,
        resetToAutoMode,
        getCSSVars,
    };
}