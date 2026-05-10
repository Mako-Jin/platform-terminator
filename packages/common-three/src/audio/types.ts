
import * as Three from 'three';

/**
 * 音频播放选项
 */
export interface AudioPlayOptions {
    loop?: boolean;
    volume?: number;
    fadeIn?: boolean;
    fadeInDuration?: number;
}

/**
 * 音频停止选项
 */
export interface AudioStopOptions {
    fadeOut?: boolean;
    fadeOutDuration?: number;
}

/**
 * 音频事件类型
 */
export type AudioEventType = 
    | 'play'
    | 'pause'
    | 'stop'
    | 'ended'
    | 'volumeChange';

/**
 * 音频事件回调
 */
export interface AudioEventCallback {
    (data: AudioEventData): void;
}

/**
 * 音频事件数据
 */
export interface AudioEventData {
    id: string;
    type: AudioEventType;
    timestamp: number;
    data?: never;
}

/**
 * ✅ 音频播放器接口（抽象层）
 * MusicManager 只依赖这个接口，不关心具体实现
 */
export interface IAudioPlayer {
    /**
     * 播放音频
     */
    play(id: string, options?: AudioPlayOptions): void;

    /**
     * 停止音频
     */
    stop(id: string, options?: AudioStopOptions): void;

    /**
     * 暂停音频
     */
    pause(id: string): void;

    /**
     * 设置音量
     */
    setVolume(id: string, volume: number): void;

    /**
     * 设置音量
     */
    getMusicVolume(): number;

    /**
     * 设置音量
     */
    getMasterVolume(): number;

    /**
     * 获取音频对象
     */
    getAudio(id: string): Three.Audio | undefined;

    /**
     * 监听音频事件
     */
    on(event: AudioEventType, callback: AudioEventCallback): () => void;

    /**
     * 检查是否正在播放
     */
    isPlaying(id: string): boolean;

    /**
     * 获取当前播放的音频ID
     */
    getCurrentTrackId(): string | null;

    setCurrentTrackId(trackId: string): void;

    getListener(): Three.AudioListener;

    /**
     * 音频淡入淡出工具函数
     * @param audio - Three.js 音频对象
     * @param targetVolume - 目标音量 (0-1)
     * @param duration - 过渡时间（毫秒）
     * @param onComplete - 完成回调（可选）
     * @returns Promise<void>
     */
    fadeVolume(audio: Three.Audio, targetVolume: number, duration: number, onComplete?: () => void): Promise<void>
}
