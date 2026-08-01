import { describe, it, expect } from 'vitest';
import { getThemeById, AVAILABLE_THEMES, THEME_PALETTES } from '../../src/core/theme.config';
import type { ThemeId } from '../../src/types';

describe('theme.config', () => {
    describe('AVAILABLE_THEMES', () => {
        it('should contain 6 theme IDs', () => {
            expect(AVAILABLE_THEMES).toHaveLength(6);
        });

        it('should include all expected theme IDs', () => {
            expect(AVAILABLE_THEMES).toContain('LOTUS_POND_GREEN');
            expect(AVAILABLE_THEMES).toContain('WISTERIA_BLUE');
            expect(AVAILABLE_THEMES).toContain('NAVY_ROSE');
            expect(AVAILABLE_THEMES).toContain('OCHRE_BROWN');
            expect(AVAILABLE_THEMES).toContain('PINE_GREEN');
            expect(AVAILABLE_THEMES).toContain('PEONY_RED');
        });
    });

    describe('THEME_PALETTES', () => {
        it('should have all theme IDs as keys', () => {
            for (const id of AVAILABLE_THEMES) {
                expect(THEME_PALETTES[id]).toBeDefined();
            }
        });

        it('each theme should have id, light, and dark', () => {
            for (const id of AVAILABLE_THEMES) {
                const theme = THEME_PALETTES[id];
                expect(theme.id).toBe(id);
                expect(theme.light).toBeDefined();
                expect(theme.dark).toBeDefined();
            }
        });

        it('each palette should have all required color fields', () => {
            const requiredFields = [
                'primary', 'secondary', 'accent', 'neutralDark',
                'neutralLight', 'background', 'cardBackground',
                'text', 'border',
            ] as const;

            for (const id of AVAILABLE_THEMES) {
                const theme = THEME_PALETTES[id];
                for (const mode of ['light', 'dark'] as const) {
                    for (const field of requiredFields) {
                        expect(theme[mode][field]).toBeDefined();
                        expect(typeof theme[mode][field]).toBe('string');
                        expect(theme[mode][field].startsWith('#')).toBe(true);
                    }
                }
            }
        });
    });

    describe('getThemeById', () => {
        it('should return the correct theme for a valid ID', () => {
            const theme = getThemeById('LOTUS_POND_GREEN');
            expect(theme.id).toBe('LOTUS_POND_GREEN');
            expect(theme.light.primary).toBeDefined();
        });

        it('should fall back to LOTUS_POND_GREEN for an unknown ID', () => {
            const theme = getThemeById('UNKNOWN_THEME' as ThemeId);
            expect(theme.id).toBe('LOTUS_POND_GREEN');
        });

        it('should return the same reference for the same ID', () => {
            const t1 = getThemeById('NAVY_ROSE');
            const t2 = getThemeById('NAVY_ROSE');
            expect(t1).toBe(t2);
        });
    });
});
