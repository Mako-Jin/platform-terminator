import * as Three from 'three';
import type GUI from 'lil-gui';
import {
    type ComponentConfig,
    type DateChangedData,
    datetimeManager,
    type IObject3DComponent,
    Object3DComponent,
    SceneWrapper,
    type SeasonChangedData,
    type TimeChangedData,
    type UpdateParams
} from "common-three";


interface FogColorPresets {
    [season: string]: {
        day: Three.Color;
        night: Three.Color;
    };
}


type EnvTime = 'day' | 'night';


export default class Fog extends Object3DComponent {
    
    private fogNear: number;
    private fogFar: number;
    private fogColors: FogColorPresets;
    private currentSeason: string;
    private envTime: EnvTime;
    
    constructor(scene: SceneWrapper, options: { 
        isDebugMode?: boolean;
        fogNear?: number;
        fogFar?: number;
    } = {}) {
        super(scene, 'Fog', options.isDebugMode);
        
        this.fogNear = options.fogNear ?? 47;
        this.fogFar = options.fogFar ?? 57;
        
        this.fogColors = this.createFogColorPresets();
        this.currentSeason = datetimeManager.getCurrentSeason() || 'spring';
        this.envTime = 'day'; // 默认白天
    }

    /**
     * 初始化阶段 - 创建雾效果
     */
    protected async onInitialize(_config?: ComponentConfig): Promise<void> {
        this.logger.info('[Fog] Initializing...');

        const color = this.getFogColor();
        const threeScene = this.scene.getScene();
        
        threeScene.fog = new Three.Fog(color, this.fogNear, this.fogFar);

        this.logger.info(`[Fog] Initialized with color: ${color.getHexString()}, near: ${this.fogNear}, far: ${this.fogFar}`);
    }

    /**
     * 激活阶段 - 应用配置
     */
    protected onActivate(): void {
        this.logger.info('[Fog] Activating...');
    }

    /**
     * 更新阶段 - 每帧调用（目前不需要）
     */
    protected onUpdate(params: UpdateParams): void {
        // Fog 不需要每帧更新
    }

    /**
     * 失活阶段
     */
    protected onDeactivate(): void {
        this.logger.info('[Fog] Deactivated');
    }

    /**
     * 销毁阶段
     */
    protected onDispose(): void {
        this.logger.info('[Fog] Disposing...');
        
        const threeScene = this.scene.getScene();
        threeScene.fog = null;
    }

    /**
     * ✅ 时间变化监听器 - 每分钟调用
     */
    public onTimeChanged(data: TimeChangedData): void {
        this.logger.debug(`[Fog] Time changed: ${data.currentTime}`);
        this.updateEnvTime();
        this.updateFogColor();
    }

    /**
     * ✅ 日期变化监听器 - 每天午夜调用（可选）
     */
    public onDateChanged(data: DateChangedData): void {
        this.logger.info(`[Fog] Date changed: ${data.currentDate}`);
        if (data.solarTerm) {
            this.logger.info(`[Fog] Solar term: ${data.solarTerm}`);
        }
    }

    /**
     * ✅ 季节变化监听器 - 季节切换时调用
     */
    public onSeasonChanged(data: SeasonChangedData): void {
        this.logger.info(`[Fog] Season changed: ${data.previousSeason} -> ${data.currentSeason} (${data.solarTerm})`);
        this.currentSeason = data.currentSeason;
        this.updateFogColor();
    }

    /**
     * ✅ 配置调试面板（必须实现的抽象方法）
     */
    protected configureDebugPanel(gui: GUI, component: IObject3DComponent): void {
        // 添加基本信息
        gui.add({ name: component.name }, 'name').name('Component').disable();
        gui.add({ initialized: component.isInitialized }, 'initialized').name('Initialized').disable();
        gui.add({ active: component.isActive }, 'active').name('Active').disable();
        gui.add({ visible: component.isVisible }, 'visible').name('Visible').disable();
        
        // 雾相关调试选项
        const threeScene = this.scene.getScene();
        if (threeScene.fog) {
            const fog = threeScene.fog as Three.Fog;  // ✅ 类型断言
            gui.add(fog, 'near', 0, 100, 0.5).name('Fog Near');
            gui.add(fog, 'far', 0, 100, 0.5).name('Fog Far');
            
            const fogColorController = gui.addColor(
                { color: threeScene.fog.color.getHex() }, 
                'color'
            ).name('Fog Color');
            
            fogColorController.onChange((hex: number) => {
                threeScene.fog!.color.setHex(hex);
            });
        }
    }

    /**
     * 创建雾颜色预设
     */
    private createFogColorPresets(): FogColorPresets {
        return {
            spring: {
                day: new Three.Color(0.196, 0.510, 0.804),
                night: new Three.Color(0.0, 0.011, 0.039),
            },
            summer: {
                day: new Three.Color(0.2, 0.5, 0.8),
                night: new Three.Color(0.0, 0.01, 0.04),
            },
            autumn: {
                day: new Three.Color(0.090, 0.392, 0.451),
                night: new Three.Color(0.020, 0.008, 0.012),
            },
            winter: {
                day: new Three.Color(0.6, 0.702, 0.898),
                night: new Three.Color(0.0, 0.007, 0.039),
            },
        };
    }

    /**
     * 获取当前雾颜色
     */
    private getFogColor(): Three.Color {
        const seasonColors = this.fogColors[this.currentSeason];
        if (!seasonColors) {
            this.logger.warn(`[Fog] No color preset for season: ${this.currentSeason}, using spring`);
            return this.fogColors['spring'].day;
        }

        return seasonColors[this.envTime] || seasonColors.day;
    }

    /**
     * 更新时间段（白天/夜晚）
     */
    private updateEnvTime(): void {
        const hour = datetimeManager.getHour();
        this.envTime = (hour >= 6 && hour < 18) ? 'day' : 'night';
    }

    /**
     * 更新雾颜色
     */
    private updateFogColor(): void {
        const threeScene = this.scene.getScene();
        if (!threeScene.fog) return;

        const targetColor = this.getFogColor();
        threeScene.fog.color.copy(targetColor);
        
        this.logger.debug(`[Fog] Color updated to: ${targetColor.getHexString()} (${this.currentSeason} ${this.envTime})`);
    }
}
