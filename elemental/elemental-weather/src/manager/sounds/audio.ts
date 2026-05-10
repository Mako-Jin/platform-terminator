import {LoggerFactory, eventBus} from "common-tools";
import {BaseCamera, resourcesManager} from "common-three";
import * as Three from 'three';
import type {
    IAudioPlayer,
    AudioPlayOptions,
    AudioStopOptions,
    AudioEventType,
    AudioEventCallback,
    AudioEventData
} from "common-three";


export default class AudioManager implements IAudioPlayer {

    private logger = LoggerFactory.create("elemental-weather-manager-audio");

    private static instance: AudioManager | null = null;

    // ✅ Three.js AudioListener
    private listener!: Three.AudioListener;

    // ✅ 存储 Three.js Audio 对象
    private sounds: Map<string, Three.Audio> = new Map();

    // ✅ 音频分类集合
    private musicSounds: Set<string> = new Set();
    private ambientSounds: Set<string> = new Set();
    private uiSounds: Set<string> = new Set();

    // ✅ 事件监听器存储
    private eventListeners: Map<AudioEventType, Set<AudioEventCallback>> = new Map();

    // ✅ 当前播放的音乐
    private currentMusicId: string | null = null;

    // 音量控制
    private masterVolume: number = 1.0;
    private musicVolume: number = 0.7;
    private soundVolume: number = 0.8;

    constructor() {
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        AudioManager.instance = this;

        // ✅ 创建 AudioListener
        this.listener = new Three.AudioListener();

        // ✅ 初始化事件监听器 Map
        const eventTypes: AudioEventType[] = ['play', 'pause', 'stop', 'ended', 'volumeChange'];
        eventTypes.forEach(type => {
            this.eventListeners.set(type, new Set());
        });

        this.logger.info("audio manager initialized");


    }

    static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * ✅ 获取 AudioListener（用于绑定到相机）
     */
    getListener(): Three.AudioListener {
        return this.listener;
    }

    addListenerToCamera(camera: BaseCamera) {
        camera.getCamera().add(this.listener);
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
     * ✅ 从资源管理器加载所有音频资源并创建 Three.js Audio 对象
     */
    async loadAllSounds(): Promise<void> {
        const audioResources = resourcesManager.getItemsByType<AudioBuffer>('audio');

        if (audioResources.size === 0) {
            this.logger.warn("No audio resources found in resourcesManager");
            return;
        }

        this.logger.info(`Found ${audioResources.size} audio resources`);

        for (const [id, audioBuffer] of audioResources) {
            try {
                const category = this.categorizeSound(id);
                await this.createThreeAudioFromBuffer(id, audioBuffer, category);
            } catch (error) {
                this.logger.error(`Failed to create audio for: ${id}`, error);
            }
        }

        this.logger.info(`Successfully created ${this.sounds.size} Three.js audio objects`);
    }

    /**
     * ✅ 从 AudioBuffer 创建 Three.js Audio 对象
     * @param id 资源ID
     * @param audioBuffer Web Audio API 的 AudioBuffer
     * @param category 音频分类
     */
    private async createThreeAudioFromBuffer(
        id: string,
        audioBuffer: AudioBuffer,
        category: 'music' | 'ambient' | 'ui'
    ): Promise<void> {
        const audio = new Three.Audio(this.listener);
        audio.setBuffer(audioBuffer);

        switch (category) {
            case 'music':
                this.musicSounds.add(id);
                audio.setLoop(false); // ✅ 默认不循环，由 MusicManager 控制
                audio.setVolume(this.musicVolume * this.masterVolume);

                // ✅ 监听音频结束事件
                audio.addEventListener('ended', () => {
                    this.emitEvent('ended', { id, type: 'ended', timestamp: Date.now() });
                });
                break;
            case 'ambient':
                this.ambientSounds.add(id);
                audio.setVolume(this.soundVolume * this.masterVolume);
                break;
            case 'ui':
                this.uiSounds.add(id);
                audio.setVolume(this.soundVolume * this.masterVolume);
                break;
        }

        this.sounds.set(id, audio);
        this.logger.debug(`Created Three.js Audio: ${id} [${category}]`);
    }

    // ==================== ✅ 实现 IAudioPlayer 接口 ====================

    /**
     * ✅ 播放音频（接口实现）
     */
    play(id: string, options?: AudioPlayOptions): void {
        const audio = this.sounds.get(id);
        if (!audio) {
            this.logger.warn(`Audio not found: ${id}`);
            return;
        }

        // 应用选项
        if (options?.loop !== undefined) {
            audio.setLoop(options.loop);
        }
        if (options?.volume !== undefined) {
            this.setVolume(id, options.volume);
        }

        // 淡入效果
        if (options?.fadeIn) {
            const targetVolume = options.volume ?? (this.musicSounds.has(id) ? this.musicVolume : this.soundVolume) * this.masterVolume;
            audio.setVolume(0);
            audio.play();
            this.fadeInVolume(audio, targetVolume, options.fadeInDuration || 2000);
        } else {
            if (!audio.isPlaying) {
                audio.play();
            }
        }

        // 更新当前播放状态
        if (this.musicSounds.has(id)) {
            this.currentMusicId = id;
        }

        // ✅ 触发事件
        this.emitEvent('play', { id, type: 'play', timestamp: Date.now(), data: options });
        this.logger.debug(`Playing: ${id}`);
    }

    /**
     * ✅ 停止音频（接口实现）
     */
    stop(id: string, options?: AudioStopOptions): void {
        const audio = this.sounds.get(id);
        if (!audio) {
            this.logger.warn(`Audio not found: ${id}`);
            return;
        }

        // 淡出效果
        if (options?.fadeOut && audio.isPlaying) {
            this.fadeOutVolume(audio, options.fadeOutDuration || 1000).then(() => {
                audio.stop();
                this.emitEvent('stop', { id, type: 'stop', timestamp: Date.now() });

                if (this.currentMusicId === id) {
                    this.currentMusicId = null;
                }
            });
        } else {
            audio.stop();
            this.emitEvent('stop', { id, type: 'stop', timestamp: Date.now() });

            if (this.currentMusicId === id) {
                this.currentMusicId = null;
            }
        }

        this.logger.debug(`Stopped: ${id}`);
    }

    /**
     * ✅ 暂停音频（接口实现）
     */
    pause(id: string): void {
        const audio = this.sounds.get(id);
        if (audio) {
            audio.pause();
            this.emitEvent('pause', { id, type: 'pause', timestamp: Date.now() });
            this.logger.debug(`Paused: ${id}`);
        }
    }

    /**
     * ✅ 设置音量（接口实现）
     */
    setVolume(id: string, volume: number): void {
        const audio = this.sounds.get(id);
        if (audio) {
            const clampedVolume = Math.max(0, Math.min(1, volume));
            audio.setVolume(clampedVolume);
            this.emitEvent('volumeChange', {
                id,
                type: 'volumeChange',
                timestamp: Date.now(),
                data: { volume: clampedVolume }
            });
        }
    }

    /**
     * ✅ 获取音频对象（接口实现）
     */
    getAudio(id: string): Three.Audio | undefined {
        return this.sounds.get(id);
    }

    /**
     * ✅ 监听音频事件（接口实现）
     */
    on(event: AudioEventType, callback: AudioEventCallback): () => void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.add(callback);

            // ✅ 返回取消订阅函数
            return () => {
                listeners.delete(callback);
            };
        }
        return () => {};
    }

    /**
     * ✅ 检查是否正在播放（接口实现）
     */
    isPlaying(id: string): boolean {
        const audio = this.sounds.get(id);
        return audio ? audio.isPlaying : false;
    }

    /**
     * ✅ 获取当前播放的音乐ID（接口实现）
     */
    getCurrentTrackId(): string | null {
        return this.currentMusicId;
    }

    /**
     * ✅ 获取当前播放的音乐ID（接口实现）
     */
    setCurrentTrackId(trackId: string): void {
        if (trackId && this.musicSounds.has(trackId)) {
            this.currentMusicId = trackId;
            return;
        }
        this.logger.warn(`target trackId=${trackId} not exist`);
    }


    // ==================== ✅ 内部辅助方法 ====================

    /**
     * ✅ 触发事件
     */
    private emitEvent(event: AudioEventType, data: AudioEventData): void {
        // 触发内部监听器
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.logger.error(`Error in event listener for ${event}:`, error);
                }
            });
        }

        // ✅ 同时通过 EventBus 广播（供其他模块使用）
        eventBus.emit(`audio:${event}`, data);
    }

    /**
     * 音频淡入淡出工具函数
     * @param audio - Three.js 音频对象
     * @param targetVolume - 目标音量 (0-1)
     * @param duration - 过渡时间（毫秒）
     * @param onComplete - 完成回调（可选）
     * @returns Promise<void>
     */
    fadeVolume(audio: Three.Audio, targetVolume: number, duration: number, onComplete?: () => void): Promise<void> {
        return new Promise((resolve) => {
            // 参数验证
            if (duration <= 0) {
                audio.setVolume(targetVolume);
                onComplete?.();
                resolve();
                return;
            }

            const startVolume = audio.getVolume();
            const volumeDiff = targetVolume - startVolume;
            const startTime = performance.now();

            // 如果音量已经相同，直接完成
            if (volumeDiff === 0) {
                onComplete?.();
                resolve();
                return;
            }

            let animationFrameId: number | null = null;

            const fade = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // 使用缓动函数（可选）
                const easedProgress = this.easeOutCubic(progress);

                const currentVolume = startVolume + volumeDiff * easedProgress;
                audio.setVolume(Math.max(0, Math.min(1, currentVolume))); // 限制范围

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(fade);
                } else {
                    // 确保最终音量精确
                    audio.setVolume(targetVolume);

                    if (animationFrameId !== null) {
                        cancelAnimationFrame(animationFrameId);
                    }

                    onComplete?.();
                    resolve();
                }
            };

            fade();
        });
    }

    /**
     * 缓动函数：easeOutCubic（平滑结束）
     */
    private easeOutCubic(x: number): number {
        return 1 - Math.pow(1 - x, 3);
    }

    // ==================== ✅ 保留的便捷方法 ====================

    /**
     * ✅ 获取所有音频资源ID列表
     */
    getAudioIds(): string[] {
        return resourcesManager.getIdsByType('audio');
    }

    /**
     * ✅ 获取音频资源数量
     */
    getAudioCount(): number {
        return resourcesManager.getCountByType('audio');
    }

    /**
     * ✅ 获取音乐类音频ID列表
     */
    getMusicIds(): string[] {
        return Array.from(this.musicSounds);
    }

    /**
     * ✅ 获取环境音类音频ID列表
     */
    getAmbientIds(): string[] {
        return Array.from(this.ambientSounds);
    }

    /**
     * ✅ 获取UI音效类音频ID列表
     */
    getUiSoundIds(): string[] {
        return Array.from(this.uiSounds);
    }

    getMusicVolume(): number {
        return this.musicVolume;
    }

    getMasterVolume(): number {
        return this.masterVolume;
    }

}
