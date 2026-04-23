import { LoggerFactory } from '../utils/logger';

const logger = LoggerFactory.create('common-storage');

// 存储项接口
interface StorageItem<T = any> {
  data: T;
  expire?: number; // 过期时间戳
}

// 存储配置
interface StorageOptions {
  namespace?: string; // 命名空间，避免冲突
  prefix?: string;    // 前缀
}

/**
 * 本地存储封装（LocalStorage）
 * 支持自动 JSON 序列化/反序列化、过期时间、命名空间
 */
class LocalStorage {

  private readonly namespace: string;
  private readonly prefix: string;

  constructor(options: StorageOptions = {}) {
    this.namespace = options.namespace || 'platform-local';
    this.prefix = options.prefix ? `${options.prefix}:` : 'sts-yaocode-local';
  }

  /**
   * 生成完整的 key
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${this.namespace}:${key}`;
  }

  /**
   * 保存数据
   * @param key - 键名
   * @param data - 数据（任意类型）
   * @param expireSeconds - 过期时间（秒），0 或 undefined 表示永不过期
   */
  public set<T = any>(key: string, data: T, expireSeconds?: number): void {
    try {
      const fullKey = this.getFullKey(key);
      const item: StorageItem<T> = {
        data,
        expire: expireSeconds ? Date.now() + expireSeconds * 1000 : undefined,
      };

      const value = JSON.stringify(item);
      window.localStorage.setItem(fullKey, value);

      logger.debug('LocalStorage 保存成功', { key: fullKey, expireSeconds });
    } catch (error) {
      logger.error('LocalStorage 保存失败', { key, error });

      // localStorage 满了时清除过期数据后重试
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        logger.warn('LocalStorage 配额已满，清理过期数据...');
        this.clearExpired();

        try {
          const fullKey = this.getFullKey(key);
          const item: StorageItem<T> = {
            data,
            expire: expireSeconds ? Date.now() + expireSeconds * 1000 : undefined,
          };
          window.localStorage.setItem(fullKey, JSON.stringify(item));
          logger.success('清理后保存成功', { key });
        } catch (retryError) {
          logger.error('清理后仍然保存失败', retryError);
          throw new Error('LocalStorage 空间不足，请清理浏览器数据');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 获取数据
   * @param key - 键名
   * @returns 数据，不存在或已过期返回 null
   */
  public get<T = any>(key: string): T | null {
    try {
      const fullKey = this.getFullKey(key);
      const value = window.localStorage.getItem(fullKey);

      if (!value) {
        return null;
      }

      const item: StorageItem<T> = JSON.parse(value);

      // 检查是否过期
      if (item.expire && Date.now() > item.expire) {
        logger.debug('数据已过期，自动删除', { key: fullKey });
        this.remove(key);
        return null;
      }

      return item.data;
    } catch (error) {
      logger.error('LocalStorage 读取失败', { key, error });
      return null;
    }
  }

  /**
   * 删除数据
   * @param key - 键名
   */
  public remove(key: string): void {
    try {
      const fullKey = this.getFullKey(key);
      window.localStorage.removeItem(fullKey);
      logger.debug('LocalStorage 删除成功', { key: fullKey });
    } catch (error) {
      logger.error('LocalStorage 删除失败', { key, error });
    }
  }

  /**
   * 清空所有数据（当前命名空间）
   */
  public clear(): void {
    try {
      const keys = Object.keys(window.localStorage);
      const prefix = `${this.prefix}${this.namespace}:`;

      keys.forEach((key) => {
        if (key.startsWith(prefix)) {
          window.localStorage.removeItem(key);
        }
      });

      logger.info('LocalStorage 清空成功', { namespace: this.namespace });
    } catch (error) {
      logger.error('LocalStorage 清空失败', error);
    }
  }

  /**
   * 清除所有过期数据
   */
  public clearExpired(): void {
    try {
      const keys = Object.keys(window.localStorage);
      const prefix = `${this.prefix}${this.namespace}:`;
      let clearedCount = 0;

      keys.forEach((key) => {
        if (key.startsWith(prefix)) {
          try {
            const value = window.localStorage.getItem(key);
            if (value) {
              const item: StorageItem = JSON.parse(value);
              if (item.expire && Date.now() > item.expire) {
                window.localStorage.removeItem(key);
                clearedCount++;
              }
            }
          } catch {
            // 解析失败的数据也删除
            window.localStorage.removeItem(key);
            clearedCount++;
          }
        }
      });

      if (clearedCount > 0) {
        logger.info('清理过期数据完成', { count: clearedCount });
      }
    } catch (error) {
      logger.error('清理过期数据失败', error);
    }
  }

  /**
   * 检查键是否存在
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 获取所有键名
   */
  public keys(): string[] {
    try {
      const keys = Object.keys(window.localStorage);
      const prefix = `${this.prefix}${this.namespace}:`;

      return keys
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.replace(prefix, ''));
    } catch (error) {
      logger.error('获取键名列表失败', error);
      return [];
    }
  }

  /**
   * 获取存储大小（字节）
   */
  public size(): number {
    try {
      let totalSize = 0;
      const keys = Object.keys(window.localStorage);
      const prefix = `${this.prefix}${this.namespace}:`;

      keys.forEach((key) => {
        if (key.startsWith(prefix)) {
          const value = window.localStorage.getItem(key);
          if (value) {
            totalSize += value.length * 2; // UTF-16 每个字符 2 字节
          }
        }
      });

      return totalSize;
    } catch (error) {
      logger.error('计算存储大小失败', error);
      return 0;
    }
  }
}

/**
 * 会话存储封装（SessionStorage）
 * 会话级别存储，关闭浏览器后自动清除
 */
class SessionStorage {
  private readonly namespace: string;
  private readonly prefix: string;

  constructor(options: StorageOptions = {}) {
    this.namespace = options.namespace || 'platform-session';
    this.prefix = options.prefix ? `${options.prefix}:` : 'sts-yaocode-session';
  }

  /**
   * 生成完整的 key
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${this.namespace}:${key}`;
  }

  /**
   * 保存数据
   */
  public set<T = any>(key: string, data: T): void {
    try {
      const fullKey = this.getFullKey(key);
      const value = JSON.stringify(data);
      window.sessionStorage.setItem(fullKey, value);
      logger.debug('SessionStorage 保存成功', { key: fullKey });
    } catch (error) {
      logger.error('SessionStorage 保存失败', { key, error });
      throw error;
    }
  }

  /**
   * 获取数据
   */
  public get<T = any>(key: string): T | null {
    try {
      const fullKey = this.getFullKey(key);
      const value = window.sessionStorage.getItem(fullKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      logger.error('SessionStorage 读取失败', { key, error });
      return null;
    }
  }

  /**
   * 删除数据
   */
  public remove(key: string): void {
    try {
      const fullKey = this.getFullKey(key);
      window.sessionStorage.removeItem(fullKey);
      logger.debug('SessionStorage 删除成功', { key: fullKey });
    } catch (error) {
      logger.error('SessionStorage 删除失败', { key, error });
    }
  }

  /**
   * 清空所有数据
   */
  public clear(): void {
    try {
      const keys = Object.keys(window.sessionStorage);
      const prefix = `${this.prefix}${this.namespace}:`;

      keys.forEach((key) => {
        if (key.startsWith(prefix)) {
          window.sessionStorage.removeItem(key);
        }
      });

      logger.info('SessionStorage 清空成功', { namespace: this.namespace });
    } catch (error) {
      logger.error('SessionStorage 清空失败', error);
    }
  }

  /**
   * 检查键是否存在
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// 导出默认实例
export const storage = new LocalStorage();
export const session = new SessionStorage();

// 导出类（用于自定义实例）
export { LocalStorage, SessionStorage };
export type { StorageOptions, StorageItem };
