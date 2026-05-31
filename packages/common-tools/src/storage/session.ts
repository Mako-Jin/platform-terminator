
import type { Storage, StorageOptions, StorageItem } from './types';
import { LoggerFactory } from '../utils';
import {consts} from "./constants.ts";

export class SessionStorage implements Storage {

    private logger = LoggerFactory.create('common-tools-storage-session');

    private readonly prefix: string;

    private readonly namespace: string;

    private readonly defaultExpire: number;

    constructor(config: StorageOptions = {}) {
        this.prefix = config.prefix || consts.DEFAULT_SESSION_PREFIX;
        this.namespace = config.namespace || consts.DEFAULT_SESSION_NAMESPACE;
        this.defaultExpire = config.defaultExpires || 0;
    }

    private getFullKey(key: string): string {
        let newKey = "";
        if (this.prefix) {
            newKey = `${this.prefix}::`;
        }
        if (this.namespace) {
            newKey = `${newKey}${this.namespace}::`;
        }
        return newKey ? `${newKey}${key}` : key;
    }

    public set<T = unknown>(key: string, data: T, expires?: number): void {
        const fullKey = this.getFullKey(key);
        const expire = expires !== undefined
            ? Date.now() + expires
            : this.defaultExpire === 0 ? 0 : Date.now() + this.defaultExpire;

        const item: StorageItem = {
            data: JSON.stringify(data),
            expireAt: expire,
        };

        const value = JSON.stringify(item);
        sessionStorage.setItem(fullKey, value);
    }

    public get<T = unknown>(key: string): T | null {
        try {
            const fullKey = this.getFullKey(key);
            const value = sessionStorage.getItem(fullKey);

            if (!value) {
                return null;
            }

            const item: StorageItem = JSON.parse(value);

            if (item.expireAt && item.expireAt === 0) {
                return item.data as T;
            }

            if (item.expireAt && Date.now() >= item.expireAt) {
                this.remove(key);
                return null;
            }
            return item.data as T;
        } catch (error) {
            this.logger.error('SessionStorage 获取失败', { key, error });
            return null;
        }
    }

    public remove(key: string): void {
        try {
            const fullKey = this.getFullKey(key);
            sessionStorage.removeItem(fullKey);
            this.logger.debug('SessionStorage 删除成功', { key });
        } catch (error) {
            this.logger.error('SessionStorage 删除失败', { key, error });
        }
    }

    public has(key: string): boolean {
        return this.get(key) !== null;
    }

    public clear(): void {
        try {
            const keys = Object.keys(sessionStorage);
            const prefix = `${this.prefix}${this.namespace}:`;

            keys.forEach((key) => {
                if (key.startsWith(prefix)) {
                    sessionStorage.removeItem(key);
                }
            });
            this.logger.debug('SessionStorage 清空成功');
        } catch (error) {
            this.logger.error('SessionStorage 清空失败', error);
        }
    }

}
