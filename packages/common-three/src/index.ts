/**
 * Common Three - Three.js 共享库
 * 提供统一的 Object3D 组件生命周期管理和调试工具
 */

// 类型导出
export type {
    IObject3DComponent,
    ComponentConfig,
    UpdateParams,
    ResourceDependencies
} from './types';

export type { 
    TimeChangedData, 
    DateChangedData, 
    FestivalConfig, 
    ImportantDateConfig 
} from './datetimes';

export type { DebugConfig } from './debugger';

export type { SizeChangedData } from './size';

// 核心类导出
export { Object3DComponent } from './core';

export { DateTimeManager, datetimeManager } from './datetimes';

export { DebugPanelManager, debugPanel } from './debugger';

export { SizeManager, sizeManager } from './size';

// 相机导出
export { CameraManager, cameraManager } from './core/camera';
export { PerspectiveCameraWrapper } from './core/camera';
export { OrthographicCameraWrapper } from './core/camera';
export { FirstPersonCamera } from './core/camera';
export { BaseCamera } from './core/camera';

// 默认导出
export { default } from './core';