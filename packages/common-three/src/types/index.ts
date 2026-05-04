/**
 * Object3D 组件统一接口
 * 定义所有 3D 组件的完整生命周期
 */

import * as Three from 'three';
import type {TimeChangedData} from "../datetimes/types.ts";
import type {DateChangedData} from "../date";

/**
 * 组件初始化配置
 */
export interface ComponentConfig {
    /** 是否启用调试模式 */
    isDebugMode?: boolean;
    /** 组件名称 */
    name?: string;
    /** 自定义参数 */
    [key: string]: any;
}

/**
 * 组件更新参数
 */
export interface UpdateParams {
    /** 时间增量（秒） */
    delta: number;
    /** 累计时间（秒） */
    elapsedTime: number;
}

/**
 * 资源依赖接口
 */
export interface ResourceDependencies {
    /** 必需的资源 ID 列表 */
    required?: string[];
    /** 可选的资源 ID 列表 */
    optional?: string[];
}

/**
 * Object3D 组件统一接口
 * 实现模板方法模式，定义完整的生命周期
 */
export interface IObject3DComponent {
    /**
     * 组件名称
     */
    readonly name: string;

    /**
     * 根对象（可选，用于添加到场景）
     */
    readonly root?: Three.Object3D | null;

    /**
     * 是否已初始化
     */
    readonly isInitialized: boolean;

    /**
     * 是否已激活
     */
    readonly isActive: boolean;

    /**
     * 是否可见
     */
    readonly isVisible: boolean;

    /**
     * 【生命周期 1】初始化阶段
     * 执行一次性初始化操作（异步）
     * - 加载资源
     * - 创建几何体/材质
     * - 设置事件监听器
     *
     * @param config 初始化配置
     */
    initialize(config?: ComponentConfig): Promise<void>;

    /**
     * 【生命周期 2】激活阶段
     * 将组件添加到场景中，开始参与渲染
     */
    activate(): void;

    /**
     * 【生命周期 3】更新阶段
     * 每帧调用，处理动画和逻辑更新
     *
     * @param params 更新参数
     */
    update(params: UpdateParams): void;

    /**
     * 【生命周期 4】失活阶段
     * 从场景中移除组件，停止渲染但保留状态
     */
    deactivate(): void;

    /**
     * 【生命周期 5】销毁阶段
     * 清理所有资源，释放内存
     */
    dispose(): void;

    /**
     * 显示组件
     */
    show(): void;

    /**
     * 隐藏组件
     */
    hide(): void;

    /**
     * 时间变化回调
     * 当时间每分钟更新时调用，子类可实现此方法来响应时间变化
     *
     * @param data 时间变化数据
     */
    onTimeChanged?(data: TimeChangedData): void;

    /**
     * 日期变化回调
     * 当日期变化时调用（每天午夜），子类可实现此方法来响应日期/节日变化
     *
     * @param data 日期变化数据
     */
    onDateChanged?(data: DateChangedData): void;

    /**
     * 获取资源依赖信息
     */
    getResourceDependencies?(): ResourceDependencies;

    /**
     * 调整大小（响应式）
     *
     * @param width 宽度
     * @param height 高度
     */
    onResize?(width: number, height: number): void;

    /**
     * 时间变化回调
     * 当时间每分钟更新时调用，子类可实现此方法来响应时间变化
     *
     * @param data 时间变化数据
     */
    onTimeChanged?(data: TimeChangedData): void;
}
