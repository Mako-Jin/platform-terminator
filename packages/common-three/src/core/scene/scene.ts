
import * as Three from 'three';
import { LoggerFactory } from 'common-tools';
import type { SceneConfig } from './types';
import type { IObject3DComponent } from '../../types';

/**
 * 场景包装类
 * 提供统一的场景管理和配置
 */
export class SceneWrapper {
    
    private logger: ReturnType<typeof LoggerFactory.create>;
    private scene: Three.Scene;
    private config: SceneConfig;
    private components: Map<string, IObject3DComponent> = new Map();
    private ambientLight: Three.AmbientLight | null = null;

    constructor(config: SceneConfig = {}) {
        this.logger = LoggerFactory.create('scene');
        this.config = {
            backgroundColor: '#000000',
            backgroundAlpha: 1,
            fog: false,
            fogColor: '#ffffff',
            fogNear: 1,
            fogFar: 1000,
            fogExp2: false,
            fogDensity: 0.02,
            ambientLightColor: '#ffffff',
            ambientLightIntensity: 0.5,
            autoAddLights: true,
            ...config,
        };

        this.scene = this.createScene();
        this.setupScene();
        
        this.logger.info('SceneWrapper created');
    }

    /**
     * 获取场景实例
     */
    getScene(): Three.Scene {
        return this.scene;
    }

    /**
     * 设置背景色
     *
     * @param color 颜色值
     * @param alpha 透明度
     */
    setBackgroundColor(color: string | number, alpha: number = 1): void {
        this.scene.background = new Three.Color(color);
        this.logger.debug(`Background color set to ${color}`);
    }

    /**
     * 启用/禁用雾效
     *
     * @param enabled 是否启用
     */
    setFog(enabled: boolean): void {
        if (enabled) {
            if (this.config.fogExp2) {
                // 指数雾
                this.scene.fog = new Three.FogExp2(
                    new Three.Color(this.config.fogColor!),
                    this.config.fogDensity!
                );
            } else {
                // 线性雾
                this.scene.fog = new Three.Fog(
                    new Three.Color(this.config.fogColor!),
                    this.config.fogNear!,
                    this.config.fogFar!
                );
            }
            this.logger.debug('Fog enabled');
        } else {
            this.scene.fog = null;
            this.logger.debug('Fog disabled');
        }
    }

    /**
     * 设置雾效参数
     *
     * @param color 雾效颜色
     * @param near 近距（线性雾）
     * @param far 远距（线性雾）
     * @param density 密度（指数雾）
     */
    setFogParams(
        color?: string | number,
        near?: number,
        far?: number,
        density?: number
    ): void {
        if (color !== undefined) {
            this.config.fogColor = color;
        }
        if (near !== undefined) {
            this.config.fogNear = near;
        }
        if (far !== undefined) {
            this.config.fogFar = far;
        }
        if (density !== undefined) {
            this.config.fogDensity = density;
        }

        // 重新应用雾效
        if (this.scene.fog) {
            this.setFog(true);
        }

        this.logger.debug('Fog params updated');
    }

    /**
     * 添加组件到场景
     *
     * @param component 要添加的组件
     */
    addComponent(component: IObject3DComponent): void {
        const name = component.name;
        
        if (this.components.has(name)) {
            this.logger.warn(`Component ${name} already exists, replacing...`);
            this.removeComponent(name);
        }

        this.components.set(name, component);
        
        // 如果组件已激活，添加到场景
        if (component.isActive && component.root) {
            this.scene.add(component.root);
        }

        this.logger.debug(`Component ${name} added to scene`);
    }

    /**
     * 从场景移除组件
     *
     * @param name 组件名称
     */
    removeComponent(name: string): void {
        const component = this.components.get(name);
        
        if (!component) {
            this.logger.warn(`Component ${name} not found`);
            return;
        }

        // 从场景中移除
        if (component.root) {
            this.scene.remove(component.root);
        }

        this.components.delete(name);
        this.logger.debug(`Component ${name} removed from scene`);
    }

    /**
     * 获取组件
     *
     * @param name 组件名称
     */
    getComponent(name: string): IObject3DComponent | undefined {
        return this.components.get(name);
    }

    /**
     * 获取所有组件
     */
    getAllComponents(): Map<string, IObject3DComponent> {
        return new Map(this.components);
    }

    /**
     * 获取组件数量
     */
    getComponentCount(): number {
        return this.components.size;
    }

    /**
     * 检查组件是否存在
     *
     * @param name 组件名称
     */
    hasComponent(name: string): boolean {
        return this.components.has(name);
    }

    /**
     * 清空所有组件
     */
    clearComponents(): void {
        this.components.forEach((component, name) => {
            if (component.root) {
                this.scene.remove(component.root);
            }
        });
        this.components.clear();
        this.logger.info('All components cleared');
    }

    /**
     * 添加 Three.js 对象到场景
     *
     * @param object 要添加的对象
     */
    addObject(object: Three.Object3D): void {
        this.scene.add(object);
        this.logger.debug(`Object ${object.name || 'unnamed'} added to scene`);
    }

    /**
     * 从场景移除 Three.js 对象
     *
     * @param object 要移除的对象
     */
    removeObject(object: Three.Object3D): void {
        this.scene.remove(object);
        this.logger.debug(`Object ${object.name || 'unnamed'} removed from scene`);
    }

    /**
     * 设置环境光
     *
     * @param color 颜色
     * @param intensity 强度
     */
    setAmbientLight(color: string | number, intensity: number): void {
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
        }

        this.ambientLight = new Three.AmbientLight(
            new Three.Color(color),
            intensity
        );
        this.scene.add(this.ambientLight);
        this.logger.debug(`Ambient light set to ${color}, intensity ${intensity}`);
    }

    /**
     * 移除环境光
     */
    removeAmbientLight(): void {
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight = null;
            this.logger.debug('Ambient light removed');
        }
    }

    /**
     * 获取环境光
     */
    getAmbientLight(): Three.AmbientLight | null {
        return this.ambientLight;
    }

    /**
     * 添加方向光
     *
     * @param color 颜色
     * @param intensity 强度
     * @param position 位置
     */
    addDirectionalLight(
        color: string | number = '#ffffff',
        intensity: number = 1,
        position: { x: number; y: number; z: number } = { x: 10, y: 10, z: 10 }
    ): Three.DirectionalLight {
        const light = new Three.DirectionalLight(
            new Three.Color(color),
            intensity
        );
        light.position.set(position.x, position.y, position.z);
        this.scene.add(light);
        this.logger.debug('Directional light added');
        return light;
    }

    /**
     * 添加点光源
     *
     * @param color 颜色
     * @param intensity 强度
     * @param distance 距离
     * @param position 位置
     */
    addPointLight(
        color: string | number = '#ffffff',
        intensity: number = 1,
        distance: number = 100,
        position: { x: number; y: number; z: number } = { x: 0, y: 5, z: 0 }
    ): Three.PointLight {
        const light = new Three.PointLight(
            new Three.Color(color),
            intensity,
            distance
        );
        light.position.set(position.x, position.y, position.z);
        this.scene.add(light);
        this.logger.debug('Point light added');
        return light;
    }

    /**
     * 添加聚光灯
     *
     * @param color 颜色
     * @param intensity 强度
     * @param angle 角度
     * @param penumbra 边缘柔和度
     * @param position 位置
     * @param target 目标点
     */
    addSpotLight(
        color: string | number = '#ffffff',
        intensity: number = 1,
        angle: number = Math.PI / 3,
        penumbra: number = 0.5,
        position: { x: number; y: number; z: number } = { x: 0, y: 10, z: 0 },
        target: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
    ): Three.SpotLight {
        const light = new Three.SpotLight(
            new Three.Color(color),
            intensity,
            undefined,
            angle,
            penumbra
        );
        light.position.set(position.x, position.y, position.z);
        light.target.position.set(target.x, target.y, target.z);
        this.scene.add(light);
        this.scene.add(light.target);
        this.logger.debug('Spot light added');
        return light;
    }

    /**
     * 添加半球光
     *
     * @param skyColor 天空颜色
     * @param groundColor 地面颜色
     * @param intensity 强度
     * @param position 位置
     */
    addHemisphereLight(
        skyColor: string | number = '#ffffff',
        groundColor: string | number = '#444444',
        intensity: number = 0.5,
        position: { x: number; y: number; z: number } = { x: 0, y: 10, z: 0 }
    ): Three.HemisphereLight {
        const light = new Three.HemisphereLight(
            new Three.Color(skyColor),
            new Three.Color(groundColor),
            intensity
        );
        light.position.set(position.x, position.y, position.z);
        this.scene.add(light);
        this.logger.debug('Hemisphere light added');
        return light;
    }

    /**
     * 遍历场景中的所有对象
     *
     * @param callback 回调函数
     */
    traverse(callback: (object: Three.Object3D) => void): void {
        this.scene.traverse(callback);
    }

    /**
     * 根据名称查找对象
     *
     * @param name 对象名称
     */
    getObjectByName(name: string): Three.Object3D | undefined {
        return this.scene.getObjectByName(name);
    }

    /**
     * 获取场景中对象数量
     */
    getObjectCount(): number {
        let count = 0;
        this.scene.traverse(() => count++);
        return count;
    }

    /**
     * 打印场景结构
     */
    logSceneStructure(): void {
        this.logger.debug('=== Scene Structure ===');
        this.logObjectStructure(this.scene, 0);
        this.logger.debug('=======================');
    }

    /**
     * 递归打印对象结构（内部方法）
     */
    private logObjectStructure(object: Three.Object3D, indent: number): void {
        const prefix = '  '.repeat(indent);
        const name = object.name || object.type;
        const childrenCount = object.children.length;
        
        this.logger.debug(`${prefix}${name} (${childrenCount} children)`);

        object.children.forEach(child => {
            this.logObjectStructure(child, indent + 1);
        });
    }

    /**
     * 创建场景
     */
    private createScene(): Three.Scene {
        return new Three.Scene();
    }

    /**
     * 设置场景
     */
    private setupScene(): void {
        // 设置背景色
        this.setBackgroundColor(
            this.config.backgroundColor!,
            this.config.backgroundAlpha!
        );

        // 设置雾效
        if (this.config.fog) {
            this.setFog(true);
        }

        // 自动添加默认灯光
        if (this.config.autoAddLights) {
            this.setAmbientLight(
                this.config.ambientLightColor!,
                this.config.ambientLightIntensity!
            );
        }

        this.logger.info('Scene setup completed');
    }

    /**
     * 销毁场景
     */
    dispose(): void {
        // 清理所有组件
        this.components.forEach(component => {
            component.dispose();
        });
        this.components.clear();

        // 清理灯光
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight = null;
        }

        // 清理场景
        while (this.scene.children.length > 0) {
            const child = this.scene.children[0];
            this.scene.remove(child);
            
            // 清理几何体和材质
            if (child instanceof Three.Mesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material?.dispose();
                }
            }
        }

        this.logger.info('Scene disposed');
    }
}

export default SceneWrapper;
