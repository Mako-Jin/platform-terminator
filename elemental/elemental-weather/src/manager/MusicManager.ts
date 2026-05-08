import { LoggerFactory } from "common-tools";
import AudioManager from "./AudioManager";


export interface MusicTrack {
    id: string;
    name: string;
}


export default class MusicManager {

    private logger = LoggerFactory.create("MusicManager");

    private static instance: MusicManager | null = null;

    private audioManager!: AudioManager;

    // 音乐曲目列表
    private tracks: MusicTrack[] = [
        { id: 'morningPetalsMusic', name: 'Morning Petals' },
        { id: 'windowLightMusic', name: 'Window Light' },
        { id: 'forestDreamsMusic', name: 'Forest Dreams' },
    ];

    // 当前播放状态
    private currentTrack: MusicTrack | null = null;
    private isPlaying: boolean = false;
    public isMuted: boolean = false; // ✅ 添加静音状态

    // 事件回调
    private onTrackChangeCallback: ((track: MusicTrack) => void) | null = null;

    constructor(audioManager: AudioManager) {
        if (MusicManager.instance) {
            return MusicManager.instance;
        }
        MusicManager.instance = this;

        this.audioManager = audioManager;

        this.logger.info("MusicManager initialized");
    }

    static getInstance(): MusicManager {
        if (!MusicManager.instance) {
            throw new Error("MusicManager not initialized. Call constructor first.");
        }
        return MusicManager.instance;
    }

    /**
     * 开始随机播放音乐
     */
    startRandomMusic(): void {
        if (this.tracks.length === 0) {
            this.logger.warn("No music tracks available");
            return;
        }

        const randomIndex = Math.floor(Math.random() * this.tracks.length);
        this.playTrack(this.tracks[randomIndex]);

        this.logger.info("Started random music");
    }

    /**
     * 播放指定曲目
     */
    playTrack(track: MusicTrack): void {
        // 停止当前音乐
        if (this.currentTrack) {
            this.audioManager.stop(this.currentTrack.id);
        }

        // 播放新曲目
        this.currentTrack = track;
        this.isPlaying = true;
        this.isMuted = false; // ✅ 播放时取消静音
        this.audioManager.play(track.id);

        this.logger.info(`Playing: ${track.name}`);

        // 触发事件
        if (this.onTrackChangeCallback) {
            this.onTrackChangeCallback(track);
        }
    }

    /**
     * 停止音乐
     */
    stopMusic(): void {
        if (this.currentTrack) {
            this.audioManager.stop(this.currentTrack.id);
            this.isPlaying = false;
            this.logger.info("Music stopped");
        }
    }

    /**
     * 暂停音乐
     */
    pauseMusic(): void {
        if (this.currentTrack) {
            this.audioManager.pause(this.currentTrack.id);
            this.isPlaying = false;
            this.isMuted = true; // ✅ 暂停时标记为静音
            this.logger.info("Music paused");
        }
    }

    /**
     * 恢复音乐
     */
    resumeMusic(): void {
        if (this.currentTrack) {
            this.audioManager.resume(this.currentTrack.id);
            this.isPlaying = true;
            this.isMuted = false; // ✅ 恢复时取消静音
            this.logger.info("Music resumed");
        }
    }

    /**
     * 切换到下一首
     */
    nextTrack(): void {
        if (!this.currentTrack || this.tracks.length <= 1) {
            this.startRandomMusic();
            return;
        }

        const currentIndex = this.tracks.findIndex(t => t.id === this.currentTrack!.id);
        const nextIndex = (currentIndex + 1) % this.tracks.length;
        this.playTrack(this.tracks[nextIndex]);
    }

    /**
     * 获取当前曲目
     */
    getCurrentTrack(): MusicTrack | null {
        return this.currentTrack;
    }

    /**
     * 检查是否正在播放
     */
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * 获取所有曲目
     */
    getTracks(): MusicTrack[] {
        return [...this.tracks];
    }

    /**
     * 设置曲目变化回调
     */
    onTrackChanged(callback: (track: MusicTrack) => void): void {
        this.onTrackChangeCallback = callback;
    }

    /**
     * 移除曲目变化回调
     */
    offTrackChanged(): void {
        this.onTrackChangeCallback = null;
    }
}
