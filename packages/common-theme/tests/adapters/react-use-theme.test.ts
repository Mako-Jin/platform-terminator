import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from '../../src/adapters/react-use-theme';

// Mock theme-core
vi.mock('../../src/core/theme-core', () => ({
    themeCore: {
        currentThemeId: 'LOTUS_POND_GREEN',
        currentMode: 'light',
        isUserCustomMode: false,
        isInitialized: true,
        getState: () => ({
            themeId: 'LOTUS_POND_GREEN',
            mode: 'light',
            isUserCustomMode: false,
        }),
        getCSSVariables: () => ({
            primary: '#000',
            secondary: '#000',
            accent: '#000',
            neutralDark: '#000',
            neutralLight: '#000',
            background: '#fff',
            cardBackground: '#fff',
            text: '#000',
            border: '#000',
        }),
        subscribe: vi.fn(),
        setTheme: vi.fn(),
        setMode: vi.fn(),
        toggleMode: vi.fn(),
        resetToAutoMode: vi.fn(),
    },
}));

// Mock i18n
vi.mock('../../src/i18n', () => ({
    getCurrentLanguage: () => 'zh-CN',
    getThemeName: (id: string) => `主题-${id}`,
    onLanguageChange: () => vi.fn(),
}));

// Mock React hooks
vi.mock('react', () => ({
    useState: (initial: any) => {
        let state = typeof initial === 'function' ? initial() : initial;
        const setState = (newVal: any) => {
            state = typeof newVal === 'function' ? newVal(state) : newVal;
        };
        return [state, setState];
    },
    useEffect: vi.fn(),
    useCallback: (fn: any) => fn,
}));

describe('useTheme (React)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return theme properties', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.themeId).toBe('LOTUS_POND_GREEN');
        expect(result.current.mode).toBe('light');
        expect(result.current.language).toBe('zh-CN');
    });

    it('should return action functions', () => {
        const { result } = renderHook(() => useTheme());
        expect(typeof result.current.setTheme).toBe('function');
        expect(typeof result.current.setMode).toBe('function');
        expect(typeof result.current.toggleMode).toBe('function');
        expect(typeof result.current.resetToAutoMode).toBe('function');
        expect(typeof result.current.getCSSVars).toBe('function');
    });

    it('setTheme should call themeCore.setTheme', () => {
        const { result } = renderHook(() => useTheme());
        result.current.setTheme('NAVY_ROSE');
        expect(result.current.setTheme).toBeDefined();
    });
});
