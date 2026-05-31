import type {Storage, StorageItem, StorageOptions} from "./types.ts";
import {LoggerFactory} from "../utils";
import {consts} from "./constants.ts";


export class LocalStorage implements Storage {

    private logger = LoggerFactory.create('common-tools-storage-local');

    private readonly namespace: string;

    private readonly prefix: string;

    private readonly defaultExpires: number;

    constructor(options: StorageOptions = {}) {
        this.namespace = options.namespace || consts.DEFAULT_LOCAL_NAMESPACE;
        this.prefix = options.prefix || consts.DEFAULT_LOCAL_PREFIX;
        this.defaultExpires = options.defaultExpires || 0;
    }

    private getKey(key: string): string {
        let newKey = "";
        if (this.prefix) {
            newKey = `${this.prefix}::`;
        }
        if (this.namespace) {
            newKey = `${newKey}${this.namespace}::`;
        }
        return newKey ? `${newKey}${key}` : key;
    }

    has(key: string): boolean {
        return localStorage.getItem(this.getKey(key)) !== null;
    }

    isExpired(key: string): boolean {
        const item = localStorage.getItem(this.getKey(key));
        if (!item) return true;

        try {
            const parsed: StorageItem = JSON.parse(item);
            if (parsed.expireAt && parsed.expireAt === 0) {
                return false;
            }
            if (parsed.expireAt && Date.now() >= parsed.expireAt) {
                this.remove(key);
                return true;
            }
        } catch {
            localStorage.removeItem(key);
        }
        return false;
    }

    set<T = unknown>(key: string, value: T, expires?: number): void {
        const storageKey = this.getKey(key);
        const expiresAt = expires || this.defaultExpires === 0 ? 0 : Date.now() + this.defaultExpires;

        const item: StorageItem = {
            data: value,
            expireAt: expiresAt ? Date.now() + expiresAt : 0,
        };
        try {
            localStorage.setItem(storageKey, JSON.stringify(item));
        } catch (error) {
            this.logger.error('LocalStorage 保存失败', { key, error });

            // localStorage 满了时清除过期数据后重试
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                this.logger.warn('LocalStorage 配额已满，清理过期数据...');
                this.clearExpired();

                try {
                    localStorage.setItem(storageKey, JSON.stringify(item));
                } catch (retryError) {
                    this.logger.error('清理后仍然保存失败', retryError);
                    throw new Error('LocalStorage 空间不足，请清理浏览器数据');
                }
            } else {
                throw error;
            }
        }
    }

    private clearExpired(): void {
        const now = Date.now();
        const keys = Object.keys(localStorage);
        const prefix = `${this.prefix}::${this.namespace}::`;
        let cleanedCount = 0;

        keys.forEach((key) => {
            if (key.startsWith(prefix)) {
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        const item: StorageItem = JSON.parse(value);
                        if (item.expireAt && item.expireAt !== 0 && item.expireAt <= now) {
                            localStorage.removeItem(key);
                            cleanedCount++;
                        }
                    }
                } catch {
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            }
        });
        this.logger.info(`清理了 ${cleanedCount} 条过期数据`);
    }

    get<T = unknown>(key: string): T | null {
        const storageKey = this.getKey(key);
        const item = localStorage.getItem(storageKey);

        if (!item) {
            return null;
        }

        try {
            const parsed: StorageItem = JSON.parse(item);

            if (parsed.expireAt && parsed.expireAt === 0) {
                return parsed.data as T;
            }

            // 检查过期
            if (parsed.expireAt && Date.now() >= parsed.expireAt) {
                this.remove(key);
                return null;
            }

            return parsed.data as T;
        } catch {
            return null;
        }
    }

    remove(key: string): void {
        localStorage.removeItem(this.getKey(key));
    }

    clear(): void {
        // 如果有前缀，只清除前缀相关的项
        if (this.prefix) {
            const fullPrefix = `${this.prefix}::${this.namespace}::`;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(fullPrefix)) {
                    localStorage.removeItem(key);
                }
            }
        } else {
            localStorage.clear();
        }
    }

}
