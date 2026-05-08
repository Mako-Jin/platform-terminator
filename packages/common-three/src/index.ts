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
    ImportantDateConfig,
    SeasonChangedData,
    SeasonType,
    TimeOfDayType,
} from './datetimes';

export {
    SEASON_DISPLAY_NAMES,
    SEASON_ICONS,
    TIME_OF_DAY_DISPLAY_NAMES,
    TIME_OF_DAY_ICONS,
    AVAILABLE_SEASONS
} from './datetimes';

export type { DebugConfig } from './debugger';

export type { SizeChangedData } from './size';

// 核心类导出
export { Object3DComponent } from './core';

export { DateTimeManager, datetimeManager } from './datetimes';

export { ClockManager, clockManager } from './clock';

export { DebugPanelManager, debugPanel } from './debugger';

export { SizeManager, sizeManager } from './size';

// 相机导出
export { CameraType } from './core';
export { CameraManager, cameraManager } from './core';
export { PerspectiveCameraWrapper } from './core';
export { OrthographicCameraWrapper } from './core';
export { FirstPersonCamera } from './core';
export { BaseCamera } from './core';

// 渲染器导出
export type { RendererConfig } from './core';
export { RendererWrapper } from './core';

// 场景导出
export { SceneWrapper } from './core';
export type { SceneConfig } from './core';

// 默认导出
export { Object3DComponent as default } from './core';
