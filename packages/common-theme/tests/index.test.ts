import { describe, it, expect } from 'vitest';

describe('common-theme barrel exports', () => {
    it('should export themeCore', async () => {
        const mod = await import('../src/index');
        expect(mod.themeCore).toBeDefined();
        expect(typeof mod.themeCore.getState).toBe('function');
    });

    it('should export AVAILABLE_THEMES', async () => {
        const mod = await import('../src/index');
        expect(mod.AVAILABLE_THEMES).toBeDefined();
        expect(Array.isArray(mod.AVAILABLE_THEMES)).toBe(true);
        expect(mod.AVAILABLE_THEMES.length).toBeGreaterThan(0);
    });

    it('should export i18n functions', async () => {
        const mod = await import('../src/index');
        expect(typeof mod.getCurrentLanguage).toBe('function');
        expect(typeof mod.setCurrentLanguage).toBe('function');
        expect(typeof mod.getLanguagePack).toBe('function');
        expect(typeof mod.getThemeName).toBe('function');
        expect(typeof mod.t).toBe('function');
        expect(typeof mod.onLanguageChange).toBe('function');
        expect(typeof mod.initLanguage).toBe('function');
    });

    it('should export adapter hooks', async () => {
        const mod = await import('../src/index');
        expect(typeof mod.useReactTheme).toBe('function');
        expect(typeof mod.useVueTheme).toBe('function');
    });
});
