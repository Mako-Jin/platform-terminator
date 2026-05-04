

import * as Three from 'three';
import { LoggerFactory } from 'common-tools';


/**
 * 相机抽象基类
 * 提供通用的相机功能
 */
export abstract class BaseCamera {
    
    protected logger: ReturnType<typeof LoggerFactory.create>;
    protected camera!: Three.Camera;
    protected isEnabled: boolean = false;
    
    protected constructor(name: string) {
        this.logger = LoggerFactory.create(`camera-${name.toLowerCase()}`);
    }

    /**
     * 获取相机实例
     */
    getCamera(): Three.Camera {
        return this.camera;
    }

    /**
     * 设置位置
     */
    setPosition(x: number, y: number, z: number): void {
        this.camera.position.set(x, y, z);
    }

    /**
     * 看向目标点
     */
    lookAt(x: number, y: number, z: number): void {
        this.camera.lookAt(x, y, z);
    }

    /**
     * 启用相机
     */
    enable(): void {
        this.isEnabled = true;
        this.logger.info('Camera enabled');
    }

    /**
     * 禁用相机
     */
    disable(): void {
        this.isEnabled = false;
        this.logger.info('Camera disabled');
    }

    /**
     * 更新相机（每帧调用）
     */
    abstract update(delta: number, elapsedTime: number): void;

    /**
     * 响应尺寸变化
     */
    abstract onResize(width: number, height: number): void;

    /**
     * 销毁相机
     */
    dispose(): void {
        this.disable();
        this.logger.info('Camera disposed');
    }
}
