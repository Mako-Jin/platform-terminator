import {LoggerFactory} from "common-tools";

/**
 * 资源管理器（全局资源池）
 * 单例模式，管理所有已加载的资源
 */
export class ResourcesManager {

    private logger = LoggerFactory.create("common-three-resources-manager");

    private static instance: ResourcesManager;

    // ✅ 按类型分类的资源存储（动态创建，不限制类型）
    private itemsByType: Map<string, Map<string, any>> = new Map();

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
     * ✅ 按类型设置资源（唯一推荐的存储方式）
     * @param id 资源ID
     * @param type 资源类型
     * @param resource 资源对象
     */
    addItemByType<T = any>(id: string, type: string, resource: T): void {
        // ✅ 如果该类型不存在，动态创建 Map
        let typeMap = this.itemsByType.get(type);
        if (!typeMap) {
            typeMap = new Map();
            this.itemsByType.set(type, typeMap);
            this.logger.debug(`Created new resource type category: ${type}`);
        }
        
        typeMap.set(id, resource);
        this.logger.debug(`Resource stored by type [${type}]: ${id}`);
    }

    /**
     * ✅ 根据 ID 获取单个资源（遍历所有类型查找）
     * @param id 资源ID
     * @returns 资源对象，未找到返回 undefined
     */
    getItemById<T = any>(id: string): T | undefined {
        for (const typeMap of this.itemsByType.values()) {
            if (typeMap.has(id)) {
                return typeMap.get(id) as T;
            }
        }
        return undefined;
    }

    /**
     * ✅ 按类型获取所有资源
     * @param type 资源类型
     * @returns 该类型的所有资源 Map，如果类型不存在返回空 Map
     */
    getItemsByType<T = any>(type: string): Map<string, T> {
        return (this.itemsByType.get(type) || new Map()) as Map<string, T>;
    }

    /**
     * ✅ 按类型获取资源ID列表
     * @param type 资源类型
     * @returns 该类型的所有资源ID数组
     */
    getIdsByType(type: string): string[] {
        const typeMap = this.itemsByType.get(type);
        return typeMap ? Array.from(typeMap.keys()) : [];
    }

    /**
     * ✅ 检查资源是否已加载（遍历所有类型）
     */
    hasItem(id: string): boolean {
        for (const typeMap of this.itemsByType.values()) {
            if (typeMap.has(id)) {
                return true;
            }
        }
        return false;
    }

    /**
     * ✅ 获取某类型资源的数量
     */
    getCountByType(type: string): number {
        return this.itemsByType.get(type)?.size || 0;
    }

    /**
     * ✅ 获取所有资源总数
     */
    getTotalCount(): number {
        let total = 0;
        this.itemsByType.forEach(map => {
            total += map.size;
        });
        return total;
    }

    /**
     * ✅ 获取所有已注册的资源类型
     */
    getResourceTypes(): string[] {
        return Array.from(this.itemsByType.keys());
    }

    /**
     * ✅ 检查某个类型是否存在
     */
    hasType(type: string): boolean {
        return this.itemsByType.has(type);
    }

    /**
     * 标记加载完成
     */
    markAsLoaded(totalItems: number): void {
        this.isLoaded = true;
        this.loadProgress = 100;
        
        // ✅ 输出各类型资源统计
        const stats: Record<string, number> = {};
        this.itemsByType.forEach((map, type) => {
            stats[type] = map.size;
        });
        
        this.logger.info(`All resources loaded: ${totalItems} items`, stats);
    }

    /**
     * ✅ 清空所有资源
     */
    clear(): void {
        this.itemsByType.forEach(map => map.clear());
        this.itemsByType.clear();
        this.isLoaded = false;
        this.loadProgress = 0;
        this.logger.info('All resources cleared');
    }

}

// 导出单例实例
export const resourcesManager = ResourcesManager.getInstance();
