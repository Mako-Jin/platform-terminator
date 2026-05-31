
import type { Storage, StorageOptions  } from './types';
import {StorageType} from './types';
import { LocalStorage } from './local';
import { SessionStorage } from './session';
import { CookieStorage } from './cookie';

/**
 * 创建存储实例
 * @param type 存储类型
 * @param config 配置
 * @returns 存储实例
 */
export const createStorage = (type: StorageType, config: StorageOptions = {}): Storage => {
    switch (type) {
        case StorageType.LOCAL:
            return new LocalStorage(config);
        case StorageType.SESSION:
            return new SessionStorage(config);
        case StorageType.COOKIE:
            return new CookieStorage(config);
        default:
            throw new Error(`不支持的存储类型: ${type}`);
    }
};

// 导出默认实例
export const localStorage = new LocalStorage();
export const sessionStorage = new SessionStorage();
export const cookieStorage = new CookieStorage();

// 导出类型和枚举
export { StorageType };

// 导出所有类
export { LocalStorage, SessionStorage, CookieStorage };
