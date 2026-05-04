import type GUI from "lil-gui";
import Object3DComponent from "../core/object3d.ts";


/**
 * 调试配置项
 */
export interface DebugConfig {
    /** 组件实例 */
    component: Object3DComponent;
    /** 自定义配置函数 */
    configure?: (gui: GUI, component: Object3DComponent) => void;
    /** 是否默认展开 */
    expanded?: boolean;
}

