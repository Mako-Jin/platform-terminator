import * as Three from 'three';
import {LoggerFactory} from 'common-tools';
import type {RendererConfig} from './types';
import {sizeManager} from '../../size';
import {BaseCamera} from "../camera";
import type {IObject3DComponent} from '../../types';
import {SceneWrapper} from "../scene";

/**
 * WebGL 渲染器包装类
 * 提供统一的渲染器管理和配置
 */
export class RendererWrapper {
    
    private logger: ReturnType<typeof LoggerFactory.create>;
    private renderer: Three.WebGLRenderer;
    private container: HTMLElement;
    private config: RendererConfig;
    private isEnabled: boolean = false;

    constructor(container: HTMLElement, config: RendererConfig = {}) {
        this.logger = LoggerFactory.create('common-three-core-renderer');
        this.container = container;
        this.config = {
            antialias: true,
            alpha: false,
            pixelRatio: sizeManager.getPixelRatio(),
            shadows: true,
            shadowType: Three.PCFSoftShadowMap,
            outputColorSpace: Three.SRGBColorSpace,
            toneMapping: Three.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            backgroundColor: '#000000',
            backgroundAlpha: 1,
            ...config,
        };

        this.renderer = this.createRenderer();
        this.setupRenderer();
        
        this.logger.info('RendererWrapper created');
    }

    /**
     * 获取渲染器实例
     */
    getRenderer(): Three.WebGLRenderer {
        return this.renderer;
    }

    /**
     * 获取 DOM 元素
     */
    getDomElement(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    /**
     * 启用渲染器
     */
    enable(): void {
        this.isEnabled = true;
        this.logger.info('Renderer enabled');
    }

    /**
     * 禁用渲染器
     */
    disable(): void {
        this.isEnabled = false;
        this.logger.info('Renderer disabled');
    }

    /**
     * 渲染场景
     *
     * @param scene 场景
     * @param camera 相机
     */
    render(scene: Three.Scene | SceneWrapper, camera: Three.Camera | BaseCamera): void {
        if (!this.isEnabled) {
            return;
        }

        // 如果是 SceneWrapper，获取实际的 Three.Scene
        const threeScene = scene instanceof SceneWrapper
            ? scene.getScene()
            : scene;
        
        // 如果是 BaseCamera 包装类，获取实际的 Three.Camera
        const threeCamera = camera instanceof BaseCamera
            ? camera.getCamera()
            : camera;
        
        this.renderer.render(threeScene, threeCamera);
    }

    /**
     * 设置像素比
     *
     * @param ratio 像素比
     */
    setPixelRatio(ratio: number): void {
        this.renderer.setPixelRatio(ratio);
        this.logger.debug(`Pixel ratio set to ${ratio}`);
    }

    /**
     * 获取像素比
     */
    getPixelRatio(): number {
        return this.renderer.getPixelRatio();
    }

    /**
     * 设置尺寸
     *
     * @param width 宽度
     * @param height 高度
     * @param updateStyle 是否更新样式
     */
    setSize(width: number, height: number, updateStyle: boolean = true): void {
        this.renderer.setSize(width, height, updateStyle);
        this.logger.debug(`Size set to ${width}x${height}`);
    }

    /**
     * 响应尺寸变化
     *
     * @param width 宽度
     * @param height 高度
     */
    onResize(width: number, height: number): void {
        this.setSize(width, height, false);
        this.logger.debug(`Resized to ${width}x${height}`);
    }

    /**
     * 设置背景色
     *
     * @param color 颜色值
     * @param alpha 透明度
     */
    setBackgroundColor(color: string | number, alpha: number = 1): void {
        const bgColor = new Three.Color(color);
        this.renderer.setClearColor(bgColor, alpha);
        this.logger.debug(`Background color set to ${color}`);
    }

    /**
     * 启用/禁用阴影
     *
     * @param enabled 是否启用
     */
    setShadows(enabled: boolean): void {
        this.renderer.shadowMap.enabled = enabled;
        this.logger.debug(`Shadows ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * 设置色调映射
     *
     * @param mapping 色调映射类型
     */
    setToneMapping(mapping: Three.ToneMapping): void {
        this.renderer.toneMapping = mapping;
        this.logger.debug(`Tone mapping set to ${mapping}`);
    }

    /**
     * 设置色调映射曝光
     *
     * @param exposure 曝光值
     */
    setToneMappingExposure(exposure: number): void {
        this.renderer.toneMappingExposure = exposure;
        this.logger.debug(`Tone mapping exposure set to ${exposure}`);
    }

    /**
     * 设置物理光源模式
     *
     * @param enabled 是否启用
     */
    setPhysicallyCorrectLights(enabled: boolean): void {
        // Three.js r155+ 已废弃此方法，使用 ToneMapping 替代
        this.logger.warn('setPhysicallyCorrectLights is deprecated in newer Three.js versions');
    }

    /**
     * 清除画布
     *
     * @param color 是否清除颜色
     * @param depth 是否清除深度
     * @param stencil 是否清除模板
     */
    clear(color: boolean = true, depth: boolean = true, stencil: boolean = true): void {
        this.renderer.clear(color, depth, stencil);
    }

    /**
     * 清除颜色
     */
    clearColor(): void {
        this.renderer.clearColor();
    }

    /**
     * 清除深度
     */
    clearDepth(): void {
        this.renderer.clearDepth();
    }

    /**
     * 截取画布为图片
     *
     * @param mimeType MIME 类型
     * @param quality 质量 (0-1)
     */
    toDataURL(mimeType: string = 'image/png', quality: number = 1): string {
        return this.renderer.domElement.toDataURL(mimeType, quality);
    }

    /**
     * 下载截图
     *
     * @param filename 文件名
     * @param mimeType MIME 类型
     * @param quality 质量
     */
    downloadScreenshot(filename: string = 'screenshot.png', mimeType: string = 'image/png', quality: number = 1): void {
        const dataURL = this.toDataURL(mimeType, quality);
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataURL;
        link.click();
        this.logger.info('Screenshot downloaded');
    }

    /**
     * 获取渲染统计信息
     */
    getInfo(): {
        memory: {
            geometries: number;
            textures: number;
        };
        render: {
            calls: number;
            triangles: number;
            points: number;
            lines: number;
        };
    } {
        return this.renderer.info;
    }

    /**
     * 重置渲染统计
     */
    resetInfo(): void {
        this.renderer.info.reset();
    }

    /**
     * 强制上下文丢失
     */
    forceContextLoss(): void {
        const gl = this.renderer.getContext();
        const extension = gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
            this.logger.warn('WebGL context lost');
        }
    }

    /**
     * 恢复上下文
     */
    restoreContext(): void {
        const gl = this.renderer.getContext();
        const extension = gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.restoreContext();
            this.logger.info('WebGL context restored');
        }
    }

    // ==================== Object3DComponent 阴影辅助方法 ====================

    /**
     * 为 Object3DComponent 设置投射阴影
     *
     * @param component 要设置的组件
     * @param castShadow 是否投射阴影
     */
    setCastShadow(component: IObject3DComponent, castShadow: boolean = true): void {
        const root = component.root;
        if (!root) {
            this.logger.debug(`Component ${component.name} has no root object yet, skipping cast shadow setup`);
            return;
        }

        root.traverse((child) => {
            if (child instanceof Three.Mesh) {
                child.castShadow = castShadow;
            }
        });
        this.logger.debug(`Set castShadow=${castShadow} for component ${component.name}`);
    }

    /**
     * 为 Object3DComponent 设置接收阴影
     *
     * @param component 要设置的组件
     * @param receiveShadow 是否接收阴影
     */
    setReceiveShadow(component: IObject3DComponent, receiveShadow: boolean = false): void {
        const root = component.root;
        if (!root) {
            this.logger.debug(`Component ${component.name} has no root object yet, skipping receive shadow setup`);
            return;
        }

        root.traverse((child) => {
            if (child instanceof Three.Mesh) {
                child.receiveShadow = receiveShadow;
            }
        });
        this.logger.debug(`Set receiveShadow=${receiveShadow} for component ${component.name}`);
    }

    /**
     * 同时为 Object3DComponent 设置投射和接收阴影
     *
     * @param component 要设置的组件
     * @param castShadow 是否投射阴影
     * @param receiveShadow 是否接收阴影
     */
    setShadowsForComponent(
        component: IObject3DComponent,
        castShadow: boolean = true,
        receiveShadow: boolean = false
    ): void {
        this.setCastShadow(component, castShadow);
        this.setReceiveShadow(component, receiveShadow);
    }

    /**
     * 批量为多个 Object3DComponent 设置阴影
     *
     * @param components 组件列表
     * @param castShadow 是否投射阴影
     * @param receiveShadow 是否接收阴影
     */
    setShadowsForComponents(
        components: IObject3DComponent[],
        castShadow: boolean = true,
        receiveShadow: boolean = false
    ): void {
        components.forEach(component => {
            this.setShadowsForComponent(component, castShadow, receiveShadow);
        });
        this.logger.debug(`Set shadows for ${components.length} components`);
    }

    /**
     * 递归打印 Object3DComponent 的阴影设置状态
     *
     * @param component 要检查的组件
     */
    logComponentShadowStatus(component: IObject3DComponent): void {
        const root = component.root;
        if (!root) {
            this.logger.debug(`Component ${component.name} has no root object`);
            return;
        }

        this.logger.debug(`Component: ${component.name}`);
        this.logShadowStatus(root, 1);
    }

    /**
     * 递归打印对象的阴影设置状态（内部方法）
     *
     * @param object 要检查的 3D 对象
     * @param indent 缩进级别（用于格式化输出）
     */
    private logShadowStatus(object: Three.Object3D, indent: number = 0): void {
        const prefix = '  '.repeat(indent);
        const name = object.name || object.type;

        if (object instanceof Three.Mesh) {
            this.logger.debug(
                `${prefix}${name}: cast=${object.castShadow}, receive=${object.receiveShadow}`
            );
        } else {
            this.logger.debug(`${prefix}${name}`);
        }

        object.children.forEach(child => {
            this.logShadowStatus(child, indent + 1);
        });
    }

    /**
     * 创建渲染器
     */
    private createRenderer(): Three.WebGLRenderer {
        return new Three.WebGLRenderer({
            antialias: this.config.antialias,
            alpha: this.config.alpha,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance',
        });
    }

    /**
     * 设置渲染器
     */
    private setupRenderer(): void {
        // 设置像素比
        this.renderer.setPixelRatio(this.config.pixelRatio!);

        // 设置初始尺寸
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        this.renderer.setSize(width, height, false);

        // 设置阴影
        if (this.config.shadows) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = this.config.shadowType || Three.PCFSoftShadowMap;
        }

        // 设置输出颜色空间
        if (this.config.outputColorSpace) {
            this.renderer.outputColorSpace = this.config.outputColorSpace as Three.ColorSpace;
        }

        // 设置色调映射
        if (this.config.toneMapping !== undefined) {
            this.renderer.toneMapping = this.config.toneMapping;
            this.renderer.toneMappingExposure = this.config.toneMappingExposure || 1.0;
        }

        // 设置背景色
        if (this.config.backgroundColor) {
            this.setBackgroundColor(
                this.config.backgroundColor,
                this.config.backgroundAlpha || 1
            );
        }

        // 添加 Canvas 到容器
        this.container.appendChild(this.renderer.domElement);

        this.logger.info('Renderer setup completed');
    }

    /**
     * 销毁渲染器
     */
    dispose(): void {
        this.disable();
        
        // 从容器中移除 Canvas
        if (this.renderer.domElement.parentNode === this.container) {
            this.container.removeChild(this.renderer.domElement);
        }

        // 释放渲染器资源
        this.renderer.dispose();
        
        this.logger.info('Renderer disposed');
    }
}

export default RendererWrapper;
