import {Color} from "three";


export type ConfigValue =
    | number
    | [number, number, number]
    | Color
    | ConfigObject
    | never;


export interface ConfigObject {
    [key: string]: ConfigValue;
}


export interface SettingItems {
    day?: ConfigObject;
    night?: ConfigObject;
}


export interface Settings {
    ground?: SettingItems;
    lighting?: SettingItems;
    grass?: SettingItems;
    bush?: SettingItems;
    rocks?: SettingItems;
    fire?: SettingItems;
    fallingLeaves?: SettingItems;
    windLines?: SettingItems;
    tent?: SettingItems;
    skydome?: SettingItems;
    [key: string]: SettingItems | undefined;
}

