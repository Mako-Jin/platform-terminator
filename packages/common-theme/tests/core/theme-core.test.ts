import { describe, it, expect, beforeEach, vi } from 'vitest';
import { themeCore } from '../../src';
import type {ThemeId, ThemeState} from "../../src";

// Mock common-tools before importing theme-core
vi.mock('common-tools', () => {
    return {
        LoggerFactory: {
            create: () => ({
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                debug: vi.fn(),
            }),
        },
        localStorage: {
            _data: {} as Record<string, any>,
            get(key: string) {
                return this._data[key] ?? null;
            },
            set(key: string, value: any) {
                this._data[key] = value;
            },
            remove(key: string) {
                delete this._data[key];
            },
        },
        eventBus: {
            _handlers: new Map<string, Set<Function>>(),
            on(event: string, handler: Function) {
                if (!this._handlers.has(event)) {
                    this._handlers.set(event, new Set());
                }
                this._handlers.get(event)!.add(handler);
                return () => this._handlers.get(event)?.delete(handler);
            },
            emit(event: string, payload: any, _options?: any) {
                this._handlers.get(event)?.forEach(fn => fn(payload));
            },
        },
        AppEvents: {
            SYSTEM_THEME_CHANGE: 'system:theme:change',
        },
    };
});

describe('themeCore', () => {
    beforeEach(() => {
        themeCore.isInitialized = false;
        themeCore.currentThemeId = 'LOTUS_POND_GREEN' as ThemeId;
        themeCore.currentMode = 'light';
        themeCore.isUserCustomMode = false;
    });

    describe('initial state', () => {
        it('should have default theme ID as LOTUS_POND_GREEN', () => {
            expect(themeCore.getThemeId()).toBe('LOTUS_POND_GREEN');
        });

        it('should have default mode as light', () => {
            expect(themeCore.getMode()).toBe('light');
        });

        it('should return correct initial state', () => {
            const state = themeCore.getState();
            expect(state.themeId).toBe('LOTUS_POND_GREEN');
            expect(state.mode).toBe('light');
            expect(state.isUserCustomMode).toBe(false);
        });
    });

    describe('getThemeConfig', () => {
        it('should return the theme config for current theme', () => {
            const config = themeCore.getThemeConfig();
            expect(config.id).toBe('LOTUS_POND_GREEN');
            expect(config.light).toBeDefined();
            expect(config.dark).toBeDefined();
        });
    });

    describe('setTheme', () => {
        it('should change the current theme ID', () => {
            themeCore.setTheme('NAVY_ROSE');
            expect(themeCore.getThemeId()).toBe('NAVY_ROSE');
        });

        it('should not change mode when switching theme', () => {
            themeCore.setMode('dark');
            themeCore.setTheme('WISTERIA_BLUE');
            expect(themeCore.getMode()).toBe('dark');
        });

        it('should notify subscribers on theme change', () => {
            const states: any[] = [];
            themeCore.subscribe(s => states.push(s));
            themeCore.setTheme('PEONY_RED');
            expect(states.length).toBeGreaterThanOrEqual(2); // initial + change
            expect(states[states.length - 1].themeId).toBe('PEONY_RED');
        });
    });

    describe('setMode', () => {
        it('should change mode to dark', () => {
            themeCore.setMode('dark');
            expect(themeCore.getMode()).toBe('dark');
        });

        it('should change mode to light', () => {
            themeCore.setMode('dark');
            themeCore.setMode('light');
            expect(themeCore.getMode()).toBe('light');
        });

        it('should set isUserCustomMode to true by default', () => {
            themeCore.setMode('dark');
            expect(themeCore.isUserCustomMode).toBe(true);
        });

        it('should respect isUserCustom parameter', () => {
            themeCore.setMode('dark', false);
            expect(themeCore.isUserCustomMode).toBe(false);
        });
    });

    describe('toggleMode', () => {
        it('should toggle from light to dark', () => {
            themeCore.currentMode = 'light';
            themeCore.toggleMode();
            expect(themeCore.getMode()).toBe('dark');
        });

        it('should toggle from dark to light', () => {
            themeCore.currentMode = 'dark';
            themeCore.toggleMode();
            expect(themeCore.getMode()).toBe('light');
        });

        it('should set isUserCustomMode to true', () => {
            themeCore.toggleMode();
            expect(themeCore.isUserCustomMode).toBe(true);
        });
    });

    describe('resetToAutoMode', () => {
        it('should set isUserCustomMode to false', () => {
            themeCore.setMode('dark');
            themeCore.resetToAutoMode();
            expect(themeCore.isUserCustomMode).toBe(false);
        });

        it('should set mode based on time', () => {
            themeCore.setMode('dark');
            themeCore.resetToAutoMode();
            const hours = new Date().getHours();
            const expectedMode = hours >= 6 && hours < 18 ? 'light' : 'dark';
            expect(themeCore.getMode()).toBe(expectedMode);
        });
    });

    describe('subscribe', () => {
        it('should immediately call subscriber with current state', () => {
            let received: ThemeState = {};
            themeCore.subscribe(state => { received = state; });
            expect(received).toBeDefined();
            expect(received?.themeId).toBe('LOTUS_POND_GREEN');
        });

        it('should return an unsubscribe function', () => {
            let count = 0;
            const unsub = themeCore.subscribe(() => count++);
            expect(count).toBe(1); // initial call
            themeCore.setTheme('NAVY_ROSE');
            expect(count).toBe(2);
            unsub();
            themeCore.setTheme('WISTERIA_BLUE');
            expect(count).toBe(2); // no change after unsub
        });
    });

    describe('init', () => {
        it('should only initialize once', () => {
            themeCore.isInitialized = true;
            const prevId = themeCore.currentThemeId;
            themeCore.init();
            expect(themeCore.currentThemeId).toBe(prevId);
        });

        it('should set isInitialized to true after init', () => {
            themeCore.init();
            expect(themeCore.isInitialized).toBe(true);
        });
    });

    describe('getCSSVariables', () => {
        it('should return an object with expected keys', () => {
            const vars = themeCore.getCSSVariables();
            expect(vars).toHaveProperty('primary');
            expect(vars).toHaveProperty('secondary');
            expect(vars).toHaveProperty('accent');
            expect(vars).toHaveProperty('neutralDark');
            expect(vars).toHaveProperty('neutralLight');
            expect(vars).toHaveProperty('background');
            expect(vars).toHaveProperty('cardBackground');
            expect(vars).toHaveProperty('text');
            expect(vars).toHaveProperty('border');
        });
    });
});
