
import type { Storage, StorageOptions, StorageItem } from './types';
import { LoggerFactory } from '../utils';
import {consts} from "./constants.ts";

export class CookieStorage implements Storage {
    private logger = LoggerFactory.create('storage-cookie');
    private readonly prefix: string;
    private readonly namespace: string;
    private readonly defaultExpire: number;

    constructor(config: StorageOptions = {}) {
        this.prefix = config.prefix || consts.DEFAULT_COOKIE_PREFIX;
        this.namespace = config.namespace || consts.DEFAULT_COOKIE_NAMESPACE;
        this.defaultExpire = config.defaultExpires || -1;
    }

    private getFullKey(key: string): string {
        return `${this.prefix}::${this.namespace}::${key}`;
    }

    public set<T = unknown>(key: string, data: T, expires?: number): void {
        try {
            const fullKey = this.getFullKey(key);
            const item: StorageItem = {
                data,
                expireAt: expires !== undefined
                    ? Date.now() + expires
                    : (this.defaultExpire === -1 ? this.defaultExpire : Date.now() + this.defaultExpire),
            };

            const value = encodeURIComponent(JSON.stringify(item));
            let cookie = `${fullKey}=${value}`;

            // 设置过期时间
            if (expires !== undefined) {
                const date = new Date();
                date.setTime(date.getTime() + expires);
                cookie += `; expires=${date.toUTCString()}`;
            }

            // 设置路径
            cookie += '; path=/';

            // 设置安全标志（HTTPS）
            if (window.location.protocol === 'https:') {
                cookie += '; secure';
            }

            document.cookie = cookie;
            this.logger.debug('CookieStorage 保存成功', { key: fullKey, expires });
        } catch (error) {
            this.logger.error('CookieStorage 保存失败', { key, error });
            throw error;
        }
    }

    public get<T = unknown>(key: string): T | null {
        try {
            const fullKey = this.getFullKey(key);
            const cookies = document.cookie.split(';');

            for (const cookie of cookies) {
                const [cookieKey, cookieValue] = cookie.trim().split('=');
                if (cookieKey === fullKey) {
                    const item: StorageItem<T> = JSON.parse(decodeURIComponent(cookieValue));

                    if (item.expireAt && item.expireAt === -1) {
                        return item.data;
                    }

                    // 检查过期
                    if (item.expireAt && Date.now() >= item.expireAt) {
                        this.remove(key);
                        return null;
                    }

                    return item.data;
                }
            }

            return null;
        } catch (error) {
            this.logger.error('CookieStorage 获取失败', { key, error });
            return null;
        }
    }

    public remove(key: string): void {
        try {
            const fullKey = this.getFullKey(key);
            // 设置过期时间为过去，触发删除
            document.cookie = `${fullKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
            this.logger.debug('CookieStorage 删除成功', { key });
        } catch (error) {
            this.logger.error('CookieStorage 删除失败', { key, error });
        }
    }

    public has(key: string): boolean {
        return this.get(key) !== null;
    }

    public clear(): void {
        try {
            const cookies = document.cookie.split(';');
            const prefix = this.getFullKey(''); // 获取前缀

            for (const cookie of cookies) {
                const [cookieKey] = cookie.trim().split('=');
                if (cookieKey.startsWith(prefix)) {
                    document.cookie = `${cookieKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
                }
            }
            this.logger.debug('CookieStorage 清空成功');
        } catch (error) {
            this.logger.error('CookieStorage 清空失败', error);
        }
    }

    public size(): number {
        try {
            let totalSize = 0;
            const cookies = document.cookie.split(';');
            const prefix = this.getFullKey('');

            for (const cookie of cookies) {
                const [cookieKey, cookieValue] = cookie.trim().split('=');
                if (cookieKey.startsWith(prefix)) {
                    totalSize += cookieKey.length + (cookieValue?.length || 0);
                }
            }

            return totalSize;
        } catch (error) {
            this.logger.error('计算存储大小失败', error);
            return 0;
        }
    }

}
