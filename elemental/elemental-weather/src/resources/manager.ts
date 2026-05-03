
import { LoggerFactory } from "common-tools";
import { AppEvents, eventBus } from "common-tools";
import type { ResourceLoadedData } from "common-tools";

/**
 * 资源管理器（全局资源池）
 * 单例模式，管理所有已加载的资源
 */
class ResourcesManager {

    private static instance: ResourcesManager;
    private Logger = LoggerFactory.create("weather-resources-manager");

    // 资源存储池
    private items: Record<string, any> = {};

    // 加载状态
    private isLoaded = false;
    private loadProgress = 0;

    private constructor() {}

    /**
     * 获取单例实例
     */
    static getInstance(): ResourcesManager {
        if (!ResourcesManager.instance) {
            ResourcesManager.instance = new ResourcesManager();
        }
        return ResourcesManager.instance;
    }

    /**
     * 设置资源
     */
    addItem(id: string, resource: any): void {
        this.items[id] = resource;
        this.Logger.debug(`Resource stored: ${id}`);
    }

    /**
     * 批量设置资源
     */
    addItems(resources: Record<string, any>): void {
        Object.assign(this.items, resources);
        this.Logger.debug(`Batch resources stored: ${Object.keys(resources).length} items`);
    }

    /**
     * 获取资源
     */
    getItem<T = any>(id: string): T | undefined {
        const resource = this.items[id];
        if (!resource) {
            this.Logger.warn(`Resource not found: ${id}`);
        }
        return resource;
    }

    /**
     * 检查资源是否存在
     */
    hasItem(id: string): boolean {
        return id in this.items;
    }

    /**
     * 获取所有资源
     */
    getAllItems(): Record<string, any> {
        return { ...this.items };
    }

    /**
     * 获取资源数量
     */
    getItemCount(): number {
        return Object.keys(this.items).length;
    }

    /**
     * 标记加载完成
     */
    markAsLoaded(totalItems: number): void {
        this.isLoaded = true;
        this.loadProgress = 100;

        const loadedData: ResourceLoadedData = {
            itemsLoaded: totalItems,
            itemsTotal: totalItems,
            percent: 100,
        };

        // 发送资源加载完成事件
        eventBus.emit(AppEvents.RESOURCE_LOADED, loadedData);

        this.Logger.info(`All resources loaded: ${totalItems} items`);
    }

    /**
     * 更新加载进度
     */
    updateProgress(loaded: number, total: number): void {
        this.loadProgress = (loaded / total) * 100;
        this.Logger.debug(`Load progress: ${this.loadProgress.toFixed(2)}% (${loaded}/${total})`);
    }

    /**
     * 检查是否已加载完成
     */
    getIsLoaded(): boolean {
        return this.isLoaded;
    }

    /**
     * 获取加载进度
     */
    getLoadProgress(): number {
        return this.loadProgress;
    }

    /**
     * 清空资源池
     */
    clear(): void {
        this.items = {};
        this.isLoaded = false;
        this.loadProgress = 0;
        this.Logger.info('Resource pool cleared');
    }

    /**
     * 移除特定资源
     */
    removeItem(id: string): void {
        if (id in this.items) {
            delete this.items[id];
            this.Logger.debug(`Resource removed: ${id}`);
        }
    }
}

// 导出单例实例
export const resourcesManager = ResourcesManager.getInstance();

export default ResourcesManager;
