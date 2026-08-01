import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTheme } from '../../src/adapters/vue-use-theme';

// Mock theme-core
vi.mock('../../src/core/theme-core', () => ({
    themeCore: {
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
        subscribe: vi.fn(() => vi.fn()),
        setTheme: vi.fn(),
        setMode: vi.fn(),
        toggleMode: vi.fn(),
        resetToAutoMode: vi.fn(),
    },
}));

// Mock i18n
vi.mock('../../src/i18n', () => ({
    getCurrentLanguage: () => 'zh-CN',
    getThemeName: (id: string) => `Theme-${id}`,
    onLanguageChange: () => vi.fn(),
}));

// Mock Vue
vi.mock('vue', () => ({
    ref: (val: any) => ({ value: val }),
    readonly: (obj: any) => obj,
    computed: (fn: any) => ({ value: fn() }),
    onMounted: vi.fn(),
    onUnmounted: vi.fn(),
}));

describe('useTheme (Vue)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return theme properties', () => {
        const result = useTheme();
        expect(result.themeId.value).toBe('LOTUS_POND_GREEN');
        expect(result.mode.value).toBe('light');
        expect(result.language.value).toBe('zh-CN');
    });

    it('should return action functions', () => {
        const result = useTheme();
        expect(typeof result.setTheme).toBe('function');
        expect(typeof result.setMode).toBe('function');
        expect(typeof result.toggleMode).toBe('function');
        expect(typeof result.resetToAutoMode).toBe('function');
        expect(typeof result.getCSSVars).toBe('function');
    });

    it('should expose readonly refs', () => {
        const result = useTheme();
        expect(result.themeId).toBeDefined();
        expect(result.themeName).toBeDefined();
        expect(result.mode).toBeDefined();
        expect(result.isUserCustomMode).toBeDefined();
        expect(result.language).toBeDefined();
    });
});
