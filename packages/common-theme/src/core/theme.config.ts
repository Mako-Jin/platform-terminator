import type {ThemeId, ThemeConfig} from '../types';
import {LoggerFactory} from "common-tools";


const logger = LoggerFactory.create('common-theme-config');


// 所有主题配置，ID采用 层级_主色 命名
const THEME_PALETTES: Record<ThemeId, ThemeConfig> = {
    // 绿色系
    LOTUS_POND_GREEN: {
        id: 'LOTUS_POND_GREEN',
        light: {
            primary: '#3C3F27',
            secondary: '#937539',
            accent: '#9DA780',
            neutralDark: '#3C3F27',
            neutralLight: '#C5AB71',
            background: '#F8F6EF',
            cardBackground: '#FFFFFF',
            text: '#3C3F27',
            border: '#9DA780',
        },
        dark: {
            primary: '#9DA780',
            secondary: '#937539',
            accent: '#C5AB71',
            neutralDark: '#F8F6EF',
            neutralLight: '#3C3F27',
            background: '#1E1F18',
            cardBackground: '#2D2E24',
            text: '#E8E5D8',
            border: '#5A5745',
        },
    },

    // 紫色系
    WISTERIA_BLUE: {
        id: 'WISTERIA_BLUE',
        light: {
            primary: '#413A4C',
            secondary: '#B3A479',
            accent: '#6F8DB1',
            neutralDark: '#413A4C',
            neutralLight: '#B3A479',
            background: '#F5F4F7',
            cardBackground: '#FFFFFF',
            text: '#413A4C',
            border: '#63576F',
        },
        dark: {
            primary: '#6F8DB1',
            secondary: '#B3A479',
            accent: '#413A4C',
            neutralDark: '#F5F4F7',
            neutralLight: '#413A4C',
            background: '#1C1A21',
            cardBackground: '#2C2933',
            text: '#D1CDDF',
            border: '#63576F',
        },
    },

    // 蓝色系
    NAVY_ROSE: {
        id: 'NAVY_ROSE',
        light: {
            primary: '#242F4D',
            secondary: '#7F606D',
            accent: '#6382AA',
            neutralDark: '#242F4D',
            neutralLight: '#828E99',
            background: '#F3F6F9',
            cardBackground: '#FFFFFF',
            text: '#242F4D',
            border: '#465A66',
        },
        dark: {
            primary: '#6382AA',
            secondary: '#7F606D',
            accent: '#242F4D',
            neutralDark: '#F3F6F9',
            neutralLight: '#242F4D',
            background: '#131824',
            cardBackground: '#212A3A',
            text: '#D0D8E3',
            border: '#465A66',
        },
    },

    // 棕色系
    OCHRE_BROWN: {
        id: 'OCHRE_BROWN',
        light: {
            primary: '#532F1A',
            secondary: '#BE9A62',
            accent: '#796A5D',
            neutralDark: '#532F1A',
            neutralLight: '#BE9A62',
            background: '#F9F4EE',
            cardBackground: '#FFFFFF',
            text: '#532F1A',
            border: '#796A5D',
        },
        dark: {
            primary: '#BE9A62',
            secondary: '#532F1A',
            accent: '#796A5D',
            neutralDark: '#F9F4EE',
            neutralLight: '#532F1A',
            background: '#1E130C',
            cardBackground: '#332217',
            text: '#EDE3D7',
            border: '#796A5D',
        },
    },

    // 翠绿色系
    PINE_GREEN: {
        id: 'PINE_GREEN',
        light: {
            primary: '#25362B',
            secondary: '#56B76A',
            accent: '#3C4061',
            neutralDark: '#25362B',
            neutralLight: '#8E8E99',
            background: '#F2F7F4',
            cardBackground: '#FFFFFF',
            text: '#25362B',
            border: '#276E3D',
        },
        dark: {
            primary: '#56B76A',
            secondary: '#25362B',
            accent: '#3C4061',
            neutralDark: '#F2F7F4',
            neutralLight: '#25362B',
            background: '#111A14',
            cardBackground: '#1E2D23',
            text: '#D4E6DA',
            border: '#276E3D',
        },
    },

    // 红色系
    PEONY_RED: {
        id: 'PEONY_RED',
        light: {
            primary: '#780018',
            secondary: '#DD0022',
            accent: '#FA8095',
            neutralDark: '#333333',
            neutralLight: '#FA8095',
            background: '#FDF4F6',
            cardBackground: '#FFFFFF',
            text: '#333333',
            border: '#AA0033',
        },
        dark: {
            primary: '#DD0022',
            secondary: '#780018',
            accent: '#FA8095',
            neutralDark: '#FDF4F6',
            neutralLight: '#780018',
            background: '#1A0005',
            cardBackground: '#33000B',
            text: '#F5D6DD',
            border: '#AA0033',
        },
    },
};

// 主题查询
export function getThemeById(id: ThemeId): ThemeConfig {
    const theme = THEME_PALETTES[id];
    if (!theme) {
        logger.warn(`未找到主题 "${id}"，使用默认主题`);
        return THEME_PALETTES['LOTUS_POND_GREEN'];
    }
    return theme;
}

// 获取所有可用主题ID
export const AVAILABLE_THEMES = Object.keys(THEME_PALETTES) as ThemeId[];

// 导出所有主题供业务层使用
export { THEME_PALETTES };
