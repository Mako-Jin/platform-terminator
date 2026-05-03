/**
 * Object3D 组件系统导出
 */
// 接口和类型
export {
    type ComponentConfig,
    type UpdateParams,
    type ResourceDependencies
} from './types';

export type { IObject3DComponent } from './types';

// 抽象基类
// export { Object3DComponent } from './types';

export { DebugPanelManager, debugPanel, type DebugConfig } from './debugger';

// 默认导出基类
export { default } from './core';