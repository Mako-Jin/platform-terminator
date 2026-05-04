

import { LoggerFactory } from 'common-tools';
import { BaseCamera } from './basic';
import { PerspectiveCameraWrapper } from './perspective';
import { OrthographicCameraWrapper } from './orthographic';
import { FirstPersonCamera } from './firstperson';
import type { CameraConfig } from './types';
import { CameraType } from './types';
import * as Three from 'three';


/**
 * 相机管理器（单例）
 * 管理场景中的相机切换
 */
export class CameraManager {

    private static instance: CameraManager | null = null;
    private logger = LoggerFactory.create('camera-manager');

    private cameras: Map<CameraType, BaseCamera> = new Map();
    private activeCamera: BaseCamera | null = null;
    private activeType: CameraType | null = null;

    private constructor() {}

    /**
     * 获取单例实例
     */
    static getInstance(): CameraManager {
        if (!CameraManager.instance) {
            CameraManager.instance = new CameraManager();
        }
        return CameraManager.instance;
    }

    /**
     * 创建并注册相机
     *
     * @param type 相机类型
     * @param config 相机配置
     */
    createCamera(type: CameraType, config: CameraConfig = {}): BaseCamera {
        let camera: BaseCamera;

        switch (type) {
            case CameraType.PERSPECTIVE:
                camera = new PerspectiveCameraWrapper(config);
                break;
            case CameraType.ORTHOGRAPHIC:
                camera = new OrthographicCameraWrapper(config);
                break;
            case CameraType.FIRST_PERSON:
                camera = new FirstPersonCamera(config);
                break;
            default:
                throw new Error(`Unknown camera type: ${type}`);
        }

        this.cameras.set(type, camera);
        this.logger.info(`Created ${type} camera`);

        // 如果是第一个相机，自动激活
        if (!this.activeCamera) {
            this.switchCamera(type);
        }

        return camera;
    }

    /**
     * 切换相机
     *
     * @param type 相机类型
     */
    switchCamera(type: CameraType): void {
        const camera = this.cameras.get(type);

        if (!camera) {
            this.logger.error(`Camera type ${type} not found`);
            return;
        }

        // 禁用当前相机
        if (this.activeCamera) {
            this.activeCamera.disable();
        }

        // 激活新相机
        this.activeCamera = camera;
        this.activeType = type;
        this.activeCamera.enable();

        this.logger.info(`Switched to ${type} camera`);
    }

    /**
     * 获取当前相机
     */
    getActiveCamera(): BaseCamera | null {
        return this.activeCamera;
    }

    /**
     * 获取当前相机类型
     */
    getActiveCameraType(): CameraType | null {
        return this.activeType;
    }

    /**
     * 获取 Three.js 相机实例
     */
    getThreeCamera(): Three.Camera | null {
        return this.activeCamera?.getCamera() || null;
    }

    /**
     * 更新当前相机
     */
    update(delta: number, elapsedTime: number): void {
        if (this.activeCamera) {
            this.activeCamera.update(delta, elapsedTime);
        }
    }

    /**
     * 响应尺寸变化
     */
    onResize(width: number, height: number): void {
        this.cameras.forEach(camera => {
            camera.onResize(width, height);
        });
        this.logger.debug(`All cameras resized to ${width}x${height}`);
    }

    /**
     * 移除相机
     */
    removeCamera(type: CameraType): void {
        const camera = this.cameras.get(type);
        if (camera) {
            camera.dispose();
            this.cameras.delete(type);
            this.logger.info(`Removed ${type} camera`);

            // 如果移除的是当前相机，切换到下一个
            if (this.activeType === type) {
                const nextCamera = this.cameras.values().next().value;
                if (nextCamera) {
                    this.activeCamera = nextCamera;
                    this.activeCamera.enable();
                } else {
                    this.activeCamera = null;
                    this.activeType = null;
                }
            }
        }
    }

    /**
     * 销毁所有相机
     */
    dispose(): void {
        this.cameras.forEach(camera => camera.dispose());
        this.cameras.clear();
        this.activeCamera = null;
        this.activeType = null;
        this.logger.info('Camera manager disposed');
    }
}

// 导出单例实例
export const cameraManager = CameraManager.getInstance();

export default CameraManager;
