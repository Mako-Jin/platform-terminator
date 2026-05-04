import {LoggerFactory} from 'common-tools';

/**
 * 时钟管理器
 * 基于 THREE.Clock，提供统一的时间增量管理
 */
export class ClockManager {
    
    private static instance: ClockManager;
    private logger: ReturnType<typeof LoggerFactory.create>;
    
    private startTime: number = 0;
    private previousTime: number = 0;
    private elapsedTime: number = 0;
    private delta: number = 0;
    private isRunning: boolean = false;
    
    // 帧率统计
    private frameCount: number = 0;
    private fps: number = 0;
    private lastFpsUpdate: number = 0;
    private fpsInterval: number = 1000; // 每秒更新一次 FPS
    
    // Delta 限制（防止卡顿后跳变）
    private maxDelta: number = 0.1; // 最大 100ms
    
    // 回调列表
    private updateCallbacks: Array<(delta: number, elapsedTime: number) => void> = [];
    
    constructor() {
        if (ClockManager.instance) {
            return ClockManager.instance;
        }
        
        this.logger = LoggerFactory.create('clock');
        ClockManager.instance = this;
        
        this.logger.info('ClockManager created');
    }

    /**
     * 获取单例实例
     */
    static getInstance(): ClockManager {
        if (!ClockManager.instance) {
            ClockManager.instance = new ClockManager();
        }
        return ClockManager.instance;
    }

    /**
     * 启动时钟
     */
    start(): void {
        if (this.isRunning) {
            this.logger.warn('Clock is already running');
            return;
        }

        const now = performance.now();
        this.startTime = now;
        this.previousTime = now;
        this.elapsedTime = 0;
        this.delta = 0;
        this.isRunning = true;
        this.frameCount = 0;
        this.lastFpsUpdate = now;

        this.tick();
        this.logger.info('Clock started');
    }

    /**
     * 停止时钟
     */
    stop(): void {
        this.isRunning = false;
        this.logger.info('Clock stopped');
    }

    /**
     * 重置时钟
     */
    reset(): void {
        const now = performance.now();
        this.startTime = now;
        this.previousTime = now;
        this.elapsedTime = 0;
        this.delta = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.lastFpsUpdate = now;
        
        this.logger.info('Clock reset');
    }

    /**
     * 注册更新回调
     * 
     * @param callback 回调函数 (delta, elapsedTime) => void
     * @returns 取消订阅函数
     */
    onUpdate(callback: (delta: number, elapsedTime: number) => void): () => void {
        this.updateCallbacks.push(callback);
        
        // 返回取消订阅函数
        return () => {
            const index = this.updateCallbacks.indexOf(callback);
            if (index > -1) {
                this.updateCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * 移除更新回调
     * 
     * @param callback 要移除的回调函数
     */
    offUpdate(callback: (delta: number, elapsedTime: number) => void): void {
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    }

    /**
     * 获取时间增量（秒）
     */
    getDelta(): number {
        return this.delta;
    }

    /**
     * 获取累计时间（秒）
     */
    getElapsedTime(): number {
        return this.elapsedTime;
    }

    /**
     * 获取当前 FPS
     */
    getFPS(): number {
        return this.fps;
    }

    /**
     * 获取帧数
     */
    getFrameCount(): number {
        return this.frameCount;
    }

    /**
     * 检查是否在运行
     */
    isClockRunning(): boolean {
        return this.isRunning;
    }

    /**
     * 时钟滴答（内部方法）
     */
    private tick(): void {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        
        // 计算 delta（限制最大值防止卡顿）
        this.delta = Math.min(
            (currentTime - this.previousTime) / 1000,
            this.maxDelta
        );
        
        this.previousTime = currentTime;
        this.elapsedTime = (currentTime - this.startTime) / 1000;
        
        // 更新帧计数
        this.frameCount++;
        
        // 更新 FPS
        if (currentTime - this.lastFpsUpdate >= this.fpsInterval) {
            this.fps = Math.round(
                (this.frameCount * 1000) / (currentTime - this.lastFpsUpdate)
            );
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
        
        // 调用所有回调
        this.updateCallbacks.forEach(callback => {
            try {
                callback(this.delta, this.elapsedTime);
            } catch (error) {
                this.logger.error('Error in update callback:', error);
            }
        });
        
        // 下一帧
        requestAnimationFrame(() => this.tick());
    }

    /**
     * 设置最大 delta 值
     * 
     * @param maxDelta 最大 delta（秒）
     */
    setMaxDelta(maxDelta: number): void {
        this.maxDelta = maxDelta;
        this.logger.debug(`Max delta set to ${maxDelta}s`);
    }

    /**
     * 获取最大 delta 值
     */
    getMaxDelta(): number {
        return this.maxDelta;
    }

    /**
     * 销毁时钟
     */
    dispose(): void {
        this.stop();
        // ✅ 使用 length = 0 清空数组
        this.updateCallbacks.length = 0;
        this.logger.info('ClockManager disposed');
    }
}

// 导出单例
export const clockManager = ClockManager.getInstance();

export default ClockManager;
