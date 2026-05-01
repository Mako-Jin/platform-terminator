
import type {ThemeColors} from './types';

export const DEFAULT_THEME: ThemeColors = {
    info: { fg: '#00CD00', bg: '#111111', border: '#38bdf8' },
    success: { fg: '#14532d', bg: '#111111', border: '#22c55e' },
    warn: { fg: '#CDCD00', bg: '#111111', border: '#eab308' },
    error: { fg: '#CD0000', bg: '#111111', border: '#ef4444' },
    debug: { fg: '#ffffff', bg: '#111111', border: '#a855f7' },
    perf: { fg: '#164e63', bg: '#111111', border: '#06b6d4' }
};

export const DARK_THEME: ThemeColors = {
    info: { fg: '#7dd3fc', bg: '#1e3a5f', border: '#38bdf8' },
    success: { fg: '#86efac', bg: '#14532d', border: '#22c55e' },
    warn: { fg: '#fde047', bg: '#713f12', border: '#eab308' },
    error: { fg: '#fca5a5', bg: '#7f1d1d', border: '#ef4444' },
    debug: { fg: '#d8b4fe', bg: '#3b0764', border: '#a855f7' },
    perf: { fg: '#67e8f9', bg: '#164e63', border: '#06b6d4' }
};

export const CONTRAST_THEME: ThemeColors = {
    info: { fg: '#ffffff', bg: '#2563eb', border: '#1d4ed8' },
    success: { fg: '#ffffff', bg: '#16a34a', border: '#15803d' },
    warn: { fg: '#ffffff', bg: '#d97706', border: '#b45309' },
    error: { fg: '#ffffff', bg: '#dc2626', border: '#b91c1c' },
    debug: { fg: '#ffffff', bg: '#7c3aed', border: '#6d28d9' },
    perf: { fg: '#ffffff', bg: '#0d9488', border: '#0f766e' }
};
