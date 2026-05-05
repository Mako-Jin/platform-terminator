import { LoggerFactory } from "common-tools";

// ✅ 导入 ASSETS 配置
import { ASSETS, type Asset } from "/@/resources/assets";


export interface SoundConfig {
    id: string;
    url: string;
    loop?: boolean;
    volume?: number;
}


export default class AudioManager {

    private logger = LoggerFactory.create("AudioManager");

    private static instance: AudioManager | null = null;

    // ✅ 保存 ASSETS 配置引用
    private assets: Asset[] = ASSETS;

    // 音频元素映射
    private sounds: Map<string, HTMLAudioElement> = new Map();

    // 音量控制
    private masterVolume: number = 1.0;
    private musicVolume: number = 0.7;
    private soundVolume: number = 0.8;

    // 分类管理
    private musicSounds: Set<string> = new Set();
    private ambientSounds: Set<string> = new Set();
    private uiSounds: Set<string> = new Set();

    // 用户交互状态
    private userInteracted: boolean = false;
    private pendingPlays: Array<{soundId: string, volume?: number, loop?: boolean}> = [];

    constructor() {
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        AudioManager.instance = this;

        this.setupUserInteractionListener();

        this.logger.info("AudioManager initialized");
    }

    static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * 设置用户交互监听器
     */
    private setupUserInteractionListener(): void {
        const handleInteraction = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                this.logger.info("User interacted, processing pending audio plays");
                
                // 播放所有待处理的音频
                this.pendingPlays.forEach(({soundId, volume, loop}) => {
                    this.play(soundId, volume, loop);
                });
                this.pendingPlays = [];
            }
        };

        // 监听多种用户交互事件
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });
        document.addEventListener('touchstart', handleInteraction, { once: true });
    }

    /**
     * 注册音频资源
     */
    async registerSound(id: string, url: string, category: 'music' | 'ambient' | 'ui' = 'ambient'): Promise<void> {
        try {
            const audio = new Audio(url);
            audio.preload = 'auto';

            // 根据分类设置默认属性
            switch (category) {
                case 'music':
                    this.musicSounds.add(id);
                    audio.loop = true;
                    break;
                case 'ambient':
                    this.ambientSounds.add(id);
                    break;
                case 'ui':
                    this.uiSounds.add(id);
                    break;
            }

            this.sounds.set(id, audio);

            // 等待音频加载
            await new Promise<void>((resolve, reject) => {
                audio.addEventListener('canplaythrough', () => resolve(), { once: true });
                audio.addEventListener('error', (e) => reject(e), { once: true });
            });

            this.logger.debug(`Registered sound: ${id}`);
        } catch (error) {
            this.logger.error(`Failed to register sound: ${id}`, error);
            throw error;
        }
    }

    /**
     * 从资源管理器加载所有音频
     */
    async loadAllSounds(): Promise<void> {
        // ✅ 修复：从 ASSETS 配置中筛选音频资源
        const audioAssets = this.assets.filter(asset => asset.type === 'audio');

        this.logger.info(`Loading ${audioAssets.length} audio assets...`);

        for (const asset of audioAssets) {
            const category = this.categorizeSound(asset.id);
            await this.registerSound(asset.id, asset.path[0], category);
        }

        this.logger.info("All audio assets loaded");
    }

    /**
     * 播放音频
     */
    play(soundId: string, volume?: number, loop?: boolean): void {
        const sound = this.sounds.get(soundId);
        if (!sound) {
            this.logger.warn(`Sound not found: ${soundId}`);
            return;
        }

        // 如果用户还未交互，将播放请求加入待处理队列
        if (!this.userInteracted) {
            this.logger.debug(`User not interacted yet, queuing: ${soundId}`);
            // 检查是否已经在队列中，避免重复
            const alreadyQueued = this.pendingPlays.some(p => p.soundId === soundId);
            if (!alreadyQueued) {
                this.pendingPlays.push({soundId, volume, loop});
            }
            return;
        }

        // 计算最终音量
        const baseVolume = volume ?? this.getCategoryVolume(soundId);
        const finalVolume = baseVolume * this.masterVolume;

        sound.volume = Math.max(0, Math.min(1, finalVolume));

        if (loop !== undefined) {
            sound.loop = loop;
        }

        sound.currentTime = 0;

        sound.play().catch(error => {
            this.logger.error(`Failed to play ${soundId}:`, error);
        });

        this.logger.debug(`Playing: ${soundId}`);
    }

    /**
     * 停止音频
     */
    stop(soundId: string): void {
        const sound = this.sounds.get(soundId);
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
            this.logger.debug(`Stopped: ${soundId}`);
        }
    }

    /**
     * 暂停音频
     */
    pause(soundId: string): void {
        const sound = this.sounds.get(soundId);
        if (sound && !sound.paused) {
            sound.pause();
            this.logger.debug(`Paused: ${soundId}`);
        }
    }

    /**
     * 恢复音频
     */
    resume(soundId: string): void {
        const sound = this.sounds.get(soundId);
        if (sound && sound.paused) {
            // 如果用户还未交互，将恢复请求加入待处理队列
            if (!this.userInteracted) {
                this.logger.debug(`User not interacted yet, queuing resume: ${soundId}`);
                // 检查是否已经在队列中，避免重复
                const alreadyQueued = this.pendingPlays.some(p => p.soundId === soundId);
                if (!alreadyQueued) {
                    this.pendingPlays.push({soundId});
                }
                return;
            }

            sound.play().catch(error => {
                this.logger.error(`Failed to resume ${soundId}:`, error);
            });
            this.logger.debug(`Resumed: ${soundId}`);
        }
    }

    /**
     * 停止所有音频
     */
    stopAll(): void {
        this.sounds.forEach((sound) => {
            sound.pause();
            sound.currentTime = 0;
        });
        this.logger.info("Stopped all sounds");
    }

    /**
     * 停止所有环境音效
     */
    stopAllAmbientSounds(): void {
        this.ambientSounds.forEach(id => {
            this.stop(id);
        });
        this.logger.info("Stopped all ambient sounds");
    }

    /**
     * 强制停止所有音乐
     */
    forceStopAllMusic(): void {
        this.musicSounds.forEach(id => {
            this.stop(id);
        });
    }

    /**
     * 获取随机鸟叫声
     */
    getRandomBirdSound(): string {
        const birdSounds = ['birds1Sound', 'birds2Sound', 'birds3Sound', 'birds4Sound'];
        const randomIndex = Math.floor(Math.random() * birdSounds.length);
        return birdSounds[randomIndex];
    }

    /**
     * 设置主音量
     */
    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.logger.info(`Master volume set to: ${this.masterVolume}`);
    }

    /**
     * 设置音乐音量
     */
    setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateCategoryVolumes('music');
        this.logger.info(`Music volume set to: ${this.musicVolume}`);
    }

    /**
     * 设置音效音量
     */
    setSoundVolume(volume: number): void {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        this.updateCategoryVolumes('ambient');
        this.updateCategoryVolumes('ui');
        this.logger.info(`Sound volume set to: ${this.soundVolume}`);
    }

    /**
     * 获取主音量
     */
    getMasterVolume(): number {
        return this.masterVolume;
    }

    /**
     * 获取音乐音量
     */
    getMusicVolume(): number {
        return this.musicVolume;
    }

    /**
     * 获取音效音量
     */
    getSoundVolume(): number {
        return this.soundVolume;
    }

    /**
     * 检查音频是否正在播放
     */
    isPlaying(soundId: string): boolean {
        const sound = this.sounds.get(soundId);
        return sound ? !sound.paused : false;
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.stopAll();
        this.sounds.forEach(sound => {
            sound.src = '';
            sound.load();
        });
        this.sounds.clear();
        this.musicSounds.clear();
        this.ambientSounds.clear();
        this.uiSounds.clear();

        this.logger.info("AudioManager disposed");
    }

    /**
     * 分类音频 ID
     */
    private categorizeSound(id: string): 'music' | 'ambient' | 'ui' {
        if (id.includes('Music')) {
            return 'music';
        }
        if (id.includes('click') || id.includes('hover')) {
            return 'ui';
        }
        return 'ambient';
    }

    /**
     * 获取分类的基础音量
     */
    private getCategoryVolume(soundId: string): number {
        if (this.musicSounds.has(soundId)) {
            return this.musicVolume;
        }
        return this.soundVolume;
    }

    /**
     * 更新所有音频的音量
     */
    private updateAllVolumes(): void {
        this.sounds.forEach((sound, id) => {
            const baseVolume = this.getCategoryVolume(id);
            sound.volume = baseVolume * this.masterVolume;
        });
    }

    /**
     * 更新指定分类的音量
     */
    private updateCategoryVolumes(category: 'music' | 'ambient' | 'ui'): void {
        const soundSet = category === 'music'
            ? this.musicSounds
            : category === 'ambient'
                ? this.ambientSounds
                : this.uiSounds;

        soundSet.forEach(id => {
            const sound = this.sounds.get(id);
            if (sound) {
                const baseVolume = this.getCategoryVolume(id);
                sound.volume = baseVolume * this.masterVolume;
            }
        });
    }
    
    public getSound(soundId: string): HTMLAudioElement | undefined {
        return this.sounds.get(soundId);
    }
}
