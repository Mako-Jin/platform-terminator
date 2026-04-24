import { initGlobalState } from 'qiankun';
import { LoggerFactory } from 'common-shared';

const initialState = {
    theme: 'dark',
    locale: 'zh-CN',
};

const Logger = LoggerFactory.create("qiankun");

export const globalActions = initGlobalState(initialState);

export const updateGlobalState = (state: Partial<typeof initialState>): void => {
    Logger.info('[Qiankun State] 更新全局状态:', state);
    const currentState = globalActions.getGlobalState();
    globalActions.setGlobalState({
        ...currentState,
        ...state,
    });
};

export const getGlobalState = (): typeof initialState => {
    return globalActions.getGlobalState();
};
