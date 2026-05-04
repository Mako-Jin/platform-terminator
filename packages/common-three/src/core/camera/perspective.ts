
import * as Three from 'three';
import { BaseCamera } from './basic';
import type { CameraConfig } from './types';
import {sizeManager} from "../../size";

/**
 * 透视相机（默认相机类型）
 * 适用于大多数 3D 场景
 */
export class PerspectiveCameraWrapper extends BaseCamera {
    
    private readonly fov: number;
    private readonly near: number;
    private readonly far: number;
    private readonly aspect: number;

    constructor(config: CameraConfig = {}) {
        super('perspective');

        this.fov = config.fov || 75;
        this.near = config.near || 0.1;
        this.far = config.far || 1000;
        this.aspect = sizeManager.getWidth() / sizeManager.getHeight();

        this.camera = new Three.PerspectiveCamera(
            this.fov,
            this.aspect,
            this.near,
            this.far
        );

        // 设置默认位置
        if (config.position) {
            this.setPosition(config.position.x, config.position.y, config.position.z);
        } else {
            this.setPosition(0, 5, 10);
        }

        // 设置默认目标
        if (config.target) {
            this.lookAt(config.target.x, config.target.y, config.target.z);
        } else {
            this.lookAt(0, 0, 0);
        }

        this.logger.info('PerspectiveCamera created');
    }

    update(delta: number, elapsedTime: number): void {
        // 透视相机通常不需要每帧更新
        // 子类可以重写此方法添加自定义逻辑
    }

    onResize(width: number, height: number): void {
        const perspectiveCamera = this.camera as Three.PerspectiveCamera;
        perspectiveCamera.aspect = width / height;
        perspectiveCamera.updateProjectionMatrix();
        this.logger.debug(`Resized to ${width}x${height}`);
    }

    /**
     * 设置 FOV
     */
    setFOV(fov: number): void {
        const perspectiveCamera = this.camera as Three.PerspectiveCamera;
        perspectiveCamera.fov = fov;
        perspectiveCamera.updateProjectionMatrix();
    }

    /**
     * 获取 FOV
     */
    getFOV(): number {
        const perspectiveCamera = this.camera as Three.PerspectiveCamera;
        return perspectiveCamera.fov;
    }
}
