
// 判断是否是debug模式
export const isDebugMode = new URLSearchParams(window.location.search).get('mode') === 'debug';

