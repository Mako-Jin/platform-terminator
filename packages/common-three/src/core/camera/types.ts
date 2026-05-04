

/**
 * 相机类型枚举
 */
export enum CameraType {
    /** 透视相机（默认） */
    PERSPECTIVE = 'perspective',
    /** 正交相机（2D） */
    ORTHOGRAPHIC = 'orthographic',
    /** 第一人称相机 */
    FIRST_PERSON = 'first-person',
}

/**
 * 相机配置
 */
export interface CameraConfig {
    /** 相机类型 */
    type?: CameraType;
    /** FOV（透视相机） */
    fov?: number;
    /** 近裁剪面 */
    near?: number;
    /** 远裁剪面 */
    far?: number;
    /** 位置 */
    position?: { x: number; y: number; z: number };
    /** 目标点 */
    target?: { x: number; y: number; z: number };
    /** 是否启用控制 */
    enableControls?: boolean;
    /** 移动速度（第一人称） */
    moveSpeed?: number;
    /** 鼠标灵敏度（第一人称） */
    mouseSensitivity?: number;
}
