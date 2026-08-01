import type {ThemeMode} from "./types.ts";


/**
 * 确保 mode 是有效的 ThemeMode
 */
export function normalizeMode(mode: string | undefined): ThemeMode {
    if (mode === 'light' || mode === 'dark') {
        return mode;
    }
    return 'light';
}
