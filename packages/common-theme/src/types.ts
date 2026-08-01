
// 业务层定义角色，公共包只提供主题ID
export type ThemeId =
    | 'LOTUS_POND_GREEN'
    | 'WISTERIA_BLUE'
    | 'NAVY_ROSE'
    | 'OCHRE_BROWN'
    | 'PINE_GREEN'
    | 'PEONY_RED';

/** 明暗模式类型 */
export type ThemeMode = 'light' | 'dark';

/** 单个主题配色变量集合 */
export interface ThemePalette {
    primary: string;
    secondary: string;
    accent: string;
    neutralDark: string;
    neutralLight: string;
    background: string;
    cardBackground: string;
    text: string;
    border: string;
}

export interface ThemeConfig {
    id: ThemeId;
    light: ThemePalette;
    dark: ThemePalette;
}

/** 主题核心状态 */
export interface ThemeState {
    themeId: ThemeId;
    mode: ThemeMode;
    /** true = 用户手动选择过模式 */
    isUserCustomMode?: boolean;
}

/** 主题变更回调函数 */
export type ThemeListener = (state: ThemeState) => void;
