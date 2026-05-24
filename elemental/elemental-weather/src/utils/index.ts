
export * from './math';
export * from './haptics';


/**
 * 检测是否在 qiankun 微应用环境中运行
 * @returns true 表示在 qiankun 环境中，false 表示独立运行
 */
export const isQiankunEnvironment = (): boolean => {
    return !!(window as unknown as { __POWERED_BY_QIANKUN__: boolean }).__POWERED_BY_QIANKUN__;
};
