import { LoggerFactory } from "common-tools";
import SeasonManager from "/@/manager/SeasonManager";


export default class LightningButtonUI {

    private logger = LoggerFactory.create("LightningButtonUI");

    private onStrikeCallback: (() => void) | null = null;
    private seasonManager: SeasonManager;

    private wrapper: HTMLDivElement | null = null;
    private button: HTMLButtonElement | null = null;

    private isVisible: boolean = false;
    private currentSeason: string = '';

    constructor(onStrike: () => void) {
        this.onStrikeCallback = onStrike;
        this.seasonManager = SeasonManager.getInstance();

        this.init();
        this.setupSeasonListener();

        this.logger.info("LightningButtonUI initialized");
    }

    /**
     * 初始化 UI
     */
    private init(): void {
        // 创建包装器
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'lightning-btn-wrapper';

        // 创建按钮
        this.button = document.createElement('button');
        this.button.id = 'lightning-strike';
        this.button.className = 'control-btn lightning-btn';
        this.button.title = 'Strike Lightning';

        // 创建闪电图标
        const icon = document.createElement('i');
        icon.className = 'fas fa-bolt';
        this.button.appendChild(icon);

        // 创建电弧效果
        const arcs = document.createElement('div');
        arcs.className = 'electric-arcs';
        arcs.innerHTML = `
            <span class="arc arc-1"></span>
            <span class="arc arc-2"></span>
            <span class="arc arc-3"></span>
            <span class="arc arc-4"></span>
        `;

        this.wrapper.appendChild(this.button);
        this.wrapper.appendChild(arcs);

        // 添加到控制面板
        const controlPanel = this.getOrCreateControlPanel();
        const musicControl = document.getElementById('music-control');

        if (musicControl && musicControl.parentElement === controlPanel) {
            controlPanel.insertBefore(this.wrapper, musicControl);
        } else {
            controlPanel.appendChild(this.wrapper);
        }

        // 绑定点击事件
        this.handleClick = this.handleClick.bind(this);
        this.button.addEventListener('click', this.handleClick);

        // 根据当前季节更新可见性
        this.currentSeason = this.seasonManager.season;
        this.updateVisibility(this.currentSeason);

        this.logger.debug("Lightning button created");
    }

    /**
     * 获取或创建控制面板
     */
    private getOrCreateControlPanel(): HTMLElement {
        let panel = document.getElementById('control-panel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'control-panel';
            panel.className = 'control-panel';
            document.body.appendChild(panel);
        }

        return panel;
    }

    /**
     * 设置季节监听器
     */
    private setupSeasonListener(): void {
        this.handleSeasonChange = this.handleSeasonChange.bind(this);
        this.seasonManager.onSeasonChange(this.handleSeasonChange);
    }

    /**
     * 处理季节变化
     */
    private handleSeasonChange(data: { season: string; previousSeason: string; timestamp: number }): void {
        this.currentSeason = data.season;
        this.updateVisibility(this.currentSeason);
    }

    /**
     * 更新可见性
     */
    private updateVisibility(season: string): void {
        const shouldShow = season === 'rainy';

        if (shouldShow && !this.isVisible) {
            this.show();
        } else if (!shouldShow && this.isVisible) {
            this.hide();
        }
    }

    /**
     * 显示按钮
     */
    show(): void {
        if (this.wrapper) {
            this.isVisible = true;
            this.wrapper.classList.add('show');
            this.logger.debug("Lightning button shown");
        }
    }

    /**
     * 隐藏按钮
     */
    hide(): void {
        if (this.wrapper) {
            this.isVisible = false;
            this.wrapper.classList.remove('show');
            this.logger.debug("Lightning button hidden");
        }
    }

    /**
     * 处理点击事件
     */
    private handleClick(): void {
        // 触觉反馈
        if ((navigator as any).haptic) {
            (navigator as any).haptic('error');
        } else if (navigator.vibrate) {
            navigator.vibrate([50, 30, 100, 50, 200]);
        }

        // 添加闪电动画类
        if (this.wrapper) {
            this.wrapper.classList.add('striking');
            setTimeout(() => {
                this.wrapper?.classList.remove('striking');
            }, 400);
        }

        // 触发闪电
        if (this.onStrikeCallback) {
            this.onStrikeCallback();
        }

        this.logger.info("Lightning triggered manually");
    }

    /**
     * 销毁
     */
    destroy(): void {
        if (this.button) {
            this.button.removeEventListener('click', this.handleClick);
        }

        if (this.wrapper) {
            this.wrapper.remove();
        }

        this.seasonManager.offSeasonChange(this.handleSeasonChange);

        this.logger.info("LightningButtonUI destroyed");
    }
}