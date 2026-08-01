import {useState, useEffect, useCallback} from 'react';
import { themeCore } from '../core/theme-core';
import type { ThemeId, ThemeMode } from '../types';
import { getThemeName, getCurrentLanguage, onLanguageChange } from '../i18n';

export function useTheme() {
    const [state, setState] = useState(() => themeCore.getState());
    const [language, setLanguage] = useState(() => getCurrentLanguage());

    useEffect(() => {
        const unsubscribeTheme = themeCore.subscribe((newState) => {
            setState(newState);
        });

        const unsubscribeLang = onLanguageChange((lang) => {
            setLanguage(lang);
        });

        return () => {
            unsubscribeTheme();
            unsubscribeLang();
        };
    }, []);

    // 当前主题名称（自动根据当前语言返回）
    const themeName = getThemeName(state.themeId);

    const setMode = useCallback((mode: ThemeMode) => {
        themeCore.setMode(mode);
    }, []);

    const toggleMode = useCallback(() => {
        themeCore.toggleMode();
    }, []);

    const setTheme = useCallback((themeId: ThemeId) => {
        themeCore.setTheme(themeId);
    }, []);

    const resetToAutoMode = useCallback(() => {
        themeCore.resetToAutoMode();
    }, []);

    const getCSSVars = useCallback(() => {
        return themeCore.getCSSVariables();
    }, []);

    return {
        themeId: state.themeId,
        themeName,
        mode: state.mode,
        isUserCustomMode: state.isUserCustomMode ?? false,
        language,
        setMode,
        toggleMode,
        setTheme,
        resetToAutoMode,
        getCSSVars,
    };
}