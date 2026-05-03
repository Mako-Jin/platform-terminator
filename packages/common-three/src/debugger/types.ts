import type {IObject3DComponent} from "../types";
import type GUI from "lil-gui";


/**
 * 调试配置项
 */
export interface DebugConfig {
    /** 组件实例 */
    component: IObject3DComponent;
    /** 自定义配置函数 */
    configure?: (gui: GUI, component: IObject3DComponent) => void;
    /** 是否默认展开 */
    expanded?: boolean;
}

