import { LoggerFactory } from "common-tools";
import MusicManager from "/@/manager/MusicManager";


export default class MusicControlUI {

    private logger = LoggerFactory.create("MusicControlUI");

    private musicManager: MusicManager;

    private button: HTMLButtonElement | null = null;
    private icon: HTMLElement | null = null;

    private isMusicEnabled: boolean = true;

    constructor(musicManager: MusicManager) {
        this.musicManager = musicManager;

        this.init();
        this.setupVisibilityHandlers();

        this.logger.info("MusicControlUI initialized");
    }

    /**
     * 初始化 UI
     */
    private init(): void {
        // 创建按钮元素
        this.button = document.createElement('button');
        this.button.id = 'music-control';
        this.button.className = 'control-btn';
        this.button.title = 'Disable Music';

        // 创建图标
        this.icon = document.createElement('i');
        this.icon.className = 'fas fa-music';

        this.button.appendChild(this.icon);

        // 添加到页面
        const controlPanel = this.getOrCreateControlPanel();
        controlPanel.appendChild(this.button);

        // 绑定点击事件
        this.handleClick = this.handleClick.bind(this);
        this.button.addEventListener('click', this.handleClick);

        // 延迟显示（等待动画）
        setTimeout(() => {
            this.show();
        }, 1000);

        this.logger.debug("Music control button created");
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
     * 显示按钮
     */
    show(): void {
        if (this.button) {
            this.button.classList.add('show');
        }
    }

    /**
     * 隐藏按钮
     */
    hide(): void {
        if (this.button) {
            this.button.classList.remove('show');
        }
    }

    /**
     * 处理点击事件
     */
    private handleClick(): void {
        // 触觉反馈
        if ((navigator as any).haptic) {
            (navigator as any).haptic([{ intensity: 0.7, sharpness: 0.1 }]);
        } else if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        // 切换音乐状态
        this.isMusicEnabled = !this.isMusicEnabled;

        if (this.isMusicEnabled) {
            this.enableMusic();
        } else {
            this.disableMusic();
        }

        // 更新按钮状态
        this.updateButtonState();

        this.logger.info(`Music ${this.isMusicEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * 启用音乐
     */
    private enableMusic(): void {
        this.musicManager.resumeMusic();
    }

    /**
     * 禁用音乐
     */
    private disableMusic(): void {
        this.musicManager.pauseMusic();
    }

    /**
     * 更新按钮状态
     */
    private updateButtonState(): void {
        if (!this.button || !this.icon) return;

        if (this.isMusicEnabled) {
            this.button.classList.remove('muted');
            this.button.title = 'Disable Music';
            this.icon.className = 'fas fa-music';
        } else {
            this.button.classList.add('muted');
            this.button.title = 'Enable Music';
            this.icon.className = 'fas fa-volume-mute';
        }
    }

    /**
     * 设置可见性处理器
     */
    private setupVisibilityHandlers(): void {
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleWindowBlur = this.handleWindowBlur.bind(this);
        this.handleWindowFocus = this.handleWindowFocus.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);

        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('blur', this.handleWindowBlur);
        window.addEventListener('focus', this.handleWindowFocus);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    /**
     * 可见性变化处理
     */
    private handleVisibilityChange(): void {
        if (document.hidden) {
            if (this.isMusicEnabled && this.musicManager.getIsPlaying()) {
                this.musicManager.pauseMusic();
            }
            this.musicManager['audioManager'].forceStopAllMusic();
        } else {
            if (this.isMusicEnabled) {
                setTimeout(() => {
                    this.musicManager.resumeMusic();
                }, 500);
            }
        }
    }

    /**
     * 窗口失焦处理
     */
    private handleWindowBlur(): void {
        if (this.isMusicEnabled && this.musicManager.getIsPlaying()) {
            this.musicManager.pauseMusic();
        }
        this.musicManager['audioManager'].forceStopAllMusic();
    }

    /**
     * 窗口聚焦处理
     */
    private handleWindowFocus(): void {
        if (this.isMusicEnabled) {
            setTimeout(() => {
                this.musicManager.resumeMusic();
            }, 500);
        }
    }

    /**
     * 页面卸载处理
     */
    private handleBeforeUnload(): void {
        this.musicManager['audioManager'].forceStopAllMusic();
        this.musicManager.stopMusic();
    }

    /**
     * 销毁
     */
    destroy(): void {
        if (this.button) {
            this.button.removeEventListener('click', this.handleClick);
            this.button.remove();
        }

        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('blur', this.handleWindowBlur);
        window.removeEventListener('focus', this.handleWindowFocus);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);

        this.logger.info("MusicControlUI destroyed");
    }
}