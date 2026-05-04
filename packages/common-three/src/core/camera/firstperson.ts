
import * as Three from 'three';
import { BaseCamera } from './basic';
import type { CameraConfig } from './types';
import {sizeManager} from "../../size";


/**
 * 第一人称相机
 * 支持 WASD 移动和鼠标视角控制
 */
export class FirstPersonCamera extends BaseCamera {
    
    private moveSpeed: number;
    private mouseSensitivity: number;
    private pitch: number = 0; // 上下角度
    private yaw: number = 0;   // 左右角度
    
    // 按键状态
    private keys: { [key: string]: boolean } = {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false,
        shift: false,
    };

    // 指针锁定状态
    private isPointerLocked: boolean = false;

    constructor(config: CameraConfig = {}) {
        super('first-person');

        this.moveSpeed = config.moveSpeed || 5;
        this.mouseSensitivity = config.mouseSensitivity || 0.002;

        this.camera = new Three.PerspectiveCamera(
            config.fov || 75,
            sizeManager.getWidth() / sizeManager.getHeight(),
            config.near || 0.1,
            config.far || 1000
        );

        // 设置默认位置（人眼高度）
        if (config.position) {
            this.setPosition(config.position.x, config.position.y, config.position.z);
        } else {
            this.setPosition(0, 1.7, 5); // 1.7m 是人眼平均高度
        }

        this.setupEventListeners();
        this.logger.info('FirstPersonCamera created');
    }

    update(delta: number, elapsedTime: number): void {
        if (!this.isEnabled) return;

        this.handleMovement(delta);
        this.updateRotation();
    }

    onResize(width: number, height: number): void {
        const perspectiveCamera = this.camera as Three.PerspectiveCamera;
        perspectiveCamera.aspect = width / height;
        perspectiveCamera.updateProjectionMatrix();
    }

    /**
     * 设置移动速度
     */
    setMoveSpeed(speed: number): void {
        this.moveSpeed = speed;
    }

    /**
     * 设置鼠标灵敏度
     */
    setMouseSensitivity(sensitivity: number): void {
        this.mouseSensitivity = sensitivity;
    }

    /**
     * 跳转到指定位置
     */
    teleport(x: number, y: number, z: number): void {
        this.setPosition(x, y, z);
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 键盘按下
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        // 键盘释放
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });

        // 鼠标移动
        document.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });

        // 点击锁定指针
        document.addEventListener('click', () => {
            if (!this.isPointerLocked && this.isEnabled) {
                document.body.requestPointerLock();
            }
        });

        // 指针锁定状态变化
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === document.body;
        });
    }

    /**
     * 处理键盘按下
     */
    private handleKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        
        if (key in this.keys) {
            this.keys[key] = true;
        }
        
        if (event.code === 'Space') {
            this.keys.space = true;
        }
        if (event.key === 'Shift') {
            this.keys.shift = true;
        }
    }

    /**
     * 处理键盘释放
     */
    private handleKeyUp(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        
        if (key in this.keys) {
            this.keys[key] = false;
        }
        
        if (event.code === 'Space') {
            this.keys.space = false;
        }
        if (event.key === 'Shift') {
            this.keys.shift = false;
        }
    }

    /**
     * 处理鼠标移动
     */
    private handleMouseMove(event: MouseEvent): void {
        if (!this.isPointerLocked || !this.isEnabled) return;

        this.yaw -= event.movementX * this.mouseSensitivity;
        this.pitch -= event.movementY * this.mouseSensitivity;

        // 限制上下视角（-90° 到 90°）
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }

    /**
     * 处理移动
     */
    private handleMovement(delta: number): void {
        const speed = this.keys.shift ? this.moveSpeed * 2 : this.moveSpeed;
        const direction = new Three.Vector3();

        // 获取相机的前方向和右方向
        const forward = new Three.Vector3();
        const right = new Three.Vector3();

        this.camera.getWorldDirection(forward);
        forward.y = 0; // 保持在水平面
        forward.normalize();

        right.crossVectors(forward, this.camera.up).normalize();

        // WASD 移动
        if (this.keys.w) {
            direction.add(forward);
        }
        if (this.keys.s) {
            direction.sub(forward);
        }
        if (this.keys.d) {
            direction.add(right);
        }
        if (this.keys.a) {
            direction.sub(right);
        }

        // 空格上升，Ctrl 下降
        if (this.keys.space) {
            this.camera.position.y += speed * delta;
        }

        // 应用移动
        if (direction.length() > 0) {
            direction.normalize().multiplyScalar(speed * delta);
            this.camera.position.add(direction);
        }
    }

    /**
     * 更新旋转
     */
    private updateRotation(): void {
        // 使用欧拉角设置相机旋转
        this.camera.rotation.order = 'YXZ'; // 重要：先 Y 后 X
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
    }

    dispose(): void {
        super.dispose();
        // 清理事件监听器（如果需要）
    }
}
