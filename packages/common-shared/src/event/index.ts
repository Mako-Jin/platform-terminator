/**
 * 事件总线模块
 *
 * 统一的事件总线系统，融合了三种事件机制：
 * 1. 简单事件总线（内存-based）
 * 2. 跨标签页通信（BroadcastChannel）
 * 3. 命名空间事件支持
 */

// 类型导出
export type * from './types';

export { AppEvents } from './types';
export type {
    EventMeta,
    EventHandler,
    EmitOptions,
    RequestOptions,
    ResponseData,
    EventInterceptor
} from './types';

// 统一事件总线（唯一推荐）
export {
    UnifiedEventBus,
    EventPriority,
    eventBus
} from './emitter';

// 默认导出
export { eventBus as default } from './emitter';
