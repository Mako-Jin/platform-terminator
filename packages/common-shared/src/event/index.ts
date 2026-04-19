/**
 * 事件总线模块
 * 提供多种跨应用通信方式
 *
 * 导出两种实现：
 * - EventBus: 基于内存的简单实现（同窗口通信）
 * - UnifiedEventBus: 统一事件总线（支持跨标签页、RPC）
 */

// 类型导出
export type {
    EventMeta,
    EventHandler,
    EmitOptions,
    RequestOptions,
    ResponseData,
    EventMap,
} from './types';

export { AppEvents } from './types';

// 简单事件总线（基于内存）
export { EventBus, eventBus } from './simple';

// 统一事件总线（支持跨标签页）
export { broadcast } from './unified';
export { default as UnifiedEventBus } from './unified';


