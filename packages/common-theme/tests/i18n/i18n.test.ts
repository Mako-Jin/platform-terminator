import { describe, it, expect, beforeEach } from 'vitest';
import {
    getCurrentLanguage,
    setCurrentLanguage,
    getLanguagePack,
    getThemeName,
    t,
    onLanguageChange,
    initLanguage,
} from '../../src';

// Mock browser language detection
Object.defineProperty(navigator, 'language', {
    configurable: true,
    value: 'zh-CN',
});

describe('i18n', () => {
    beforeEach(() => {
        // Reset to default
        setCurrentLanguage('zh-CN');
    });

    describe('getCurrentLanguage / setCurrentLanguage', () => {
        it('should default to zh-CN', () => {
            expect(getCurrentLanguage()).toBe('zh-CN');
        });

        it('should switch to en-US', () => {
            setCurrentLanguage('en-US');
            expect(getCurrentLanguage()).toBe('en-US');
        });

        it('should switch back to zh-CN', () => {
            setCurrentLanguage('en-US');
            setCurrentLanguage('zh-CN');
            expect(getCurrentLanguage()).toBe('zh-CN');
        });
    });

    describe('getLanguagePack', () => {
        it('should return Chinese pack when zh-CN', () => {
            setCurrentLanguage('zh-CN');
            const pack = getLanguagePack();
            expect(pack.locale).toBe('zh-CN');
            expect(pack.themeNames.LOTUS_POND_GREEN).toBe('青荷森绿');
        });

        it('should return English pack when en-US', () => {
            setCurrentLanguage('en-US');
            const pack = getLanguagePack();
            expect(pack.locale).toBe('en-US');
            expect(pack.themeNames.LOTUS_POND_GREEN).toBe('Lotus Pond Green');
        });
    });

    describe('getThemeName', () => {
        it('should return Chinese theme name', () => {
            setCurrentLanguage('zh-CN');
            expect(getThemeName('NAVY_ROSE')).toBe('藏青蔷薇');
        });

        it('should return English theme name', () => {
            setCurrentLanguage('en-US');
            expect(getThemeName('NAVY_ROSE')).toBe('Navy Rose');
        });

        it('should fall back to theme ID for unknown theme', () => {
            expect(getThemeName('UNKNOWN' as any)).toBe('UNKNOWN');
        });
    });

    describe('t', () => {
        it('should return Chinese labels', () => {
            setCurrentLanguage('zh-CN');
            expect(t('light')).toBe('亮色');
            expect(t('dark')).toBe('暗色');
            expect(t('system')).toBe('跟随系统');
            expect(t('auto')).toBe('自动');
            expect(t('custom')).toBe('自定义');
        });

        it('should return English labels', () => {
            setCurrentLanguage('en-US');
            expect(t('light')).toBe('Light');
            expect(t('dark')).toBe('Dark');
            expect(t('system')).toBe('System');
            expect(t('auto')).toBe('Auto');
            expect(t('custom')).toBe('Custom');
        });
    });

    describe('onLanguageChange', () => {
        it('should notify listener on language change', () => {
            let received: string | null = null;
            onLanguageChange(lang => { received = lang; });
            setCurrentLanguage('en-US');
            expect(received).toBe('en-US');
        });

        it('should return unsubscribe function', () => {
            let count = 0;
            const unsub = onLanguageChange(() => count++);
            setCurrentLanguage('en-US');
            expect(count).toBe(1);
            setCurrentLanguage('zh-CN');
            expect(count).toBe(2);
            unsub();
            setCurrentLanguage('en-US');
            expect(count).toBe(2); // not incremented
        });
    });

    describe('initLanguage', () => {
        it('should return a language', () => {
            const lang = initLanguage();
            expect(['zh-CN', 'en-US']).toContain(lang);
        });
    });
});
