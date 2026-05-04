

import * as Three from 'three';
import { BaseCamera } from './basic';
import type { CameraConfig } from './types';
import {sizeManager} from "../../size";

/**
 * 正交相机（2D 相机）
 * 适用于 2D 场景、UI、等距视图
 */
export class OrthographicCameraWrapper extends BaseCamera {
    
    private left: number;
    private right: number;
    private top: number;
    private bottom: number;
    private near: number;
    private far: number;
    private zoom: number;

    constructor(config: CameraConfig = {}) {
        super('orthographic');

        const width = sizeManager.getWidth();
        const height = sizeManager.getHeight();

        this.left = -width / 2;
        this.right = width / 2;
        this.top = height / 2;
        this.bottom = -height / 2;
        this.near = config.near || 0.1;
        this.far = config.far || 1000;
        this.zoom = 1;

        this.camera = new Three.OrthographicCamera(
            this.left,
            this.right,
            this.top,
            this.bottom,
            this.near,
            this.far
        );

        // 设置默认位置（正上方俯视）
        if (config.position) {
            this.setPosition(config.position.x, config.position.y, config.position.z);
        } else {
            this.setPosition(0, 0, 10);
        }

        // 设置默认目标
        if (config.target) {
            this.lookAt(config.target.x, config.target.y, config.target.z);
        } else {
            this.lookAt(0, 0, 0);
        }

        this.logger.info('OrthographicCamera created');
    }

    update(delta: number, elapsedTime: number): void {
        // 正交相机通常不需要每帧更新
    }

    onResize(width: number, height: number): void {
        const orthographicCamera = this.camera as Three.OrthographicCamera;
        
        // 保持宽高比
        const aspect = width / height;
        const frustumHeight = this.top - this.bottom;
        const frustumWidth = frustumHeight * aspect;

        orthographicCamera.left = -frustumWidth / 2;
        orthographicCamera.right = frustumWidth / 2;
        orthographicCamera.top = this.top;
        orthographicCamera.bottom = this.bottom;

        orthographicCamera.updateProjectionMatrix();
        this.logger.debug(`Resized to ${width}x${height}`);
    }

    /**
     * 设置缩放
     */
    setZoom(zoom: number): void {
        const orthographicCamera = this.camera as Three.OrthographicCamera;
        orthographicCamera.zoom = zoom;
        orthographicCamera.updateProjectionMatrix();
    }

    /**
     * 获取缩放
     */
    getZoom(): number {
        const orthographicCamera = this.camera as Three.OrthographicCamera;
        return orthographicCamera.zoom;
    }
}
