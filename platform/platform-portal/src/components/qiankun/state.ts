import {initGlobalState} from 'qiankun';
import {LoggerFactory} from 'common-tools';

const initialState = {
    theme: 'dark',
    locale: 'zh-CN',
    // 天气功能开关
    weatherEnabled: true,
};

type GlobalState = typeof initialState;

const logger = LoggerFactory.create("qiankun");

// 维护一份本地状态副本
let currentState: GlobalState = {...initialState};

export const globalActions = initGlobalState(initialState);

// 监听全局状态变化，同步到本地副本
globalActions.onGlobalStateChange((state) => {
    currentState = {...currentState, ...state};
    logger.info('[Qiankun State] 全局状态变化:', currentState);
}, true);

export const updateGlobalState = (state: Partial<GlobalState>): void => {
    logger.info('[Qiankun State] 更新全局状态:', state);
    globalActions.setGlobalState({
        ...currentState,
        ...state,
    });
};

export const getGlobalState = (): GlobalState => {
    return {...currentState};
};