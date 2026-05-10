import {LoggerFactory} from "common-tools";
import {datetimeManager, type IAudioPlayer} from "common-three";
import * as Three from 'three';


export interface AmbientSoundConfig {
    shortGapMin: number;
    shortGapMax: number;
    longGapMin: number;
    longGapMax: number;
    thunderLongGapMin: number;
    thunderLongGapMax: number;
    baseVolume: number;
    firePosition: Three.Vector3;
    lakePosition: Three.Vector3;
    maxDistance: number;
}



export default class AmbientSoundManager {

    private logger = LoggerFactory.create("elemental-weather-manager-ambient");

    private static instance: AmbientSoundManager | null = null;

    private audioPlayer: IAudioPlayer;

    // 状态管理
    private activeContinuousSounds: Set<string> = new Set();
    private scheduledTimers: Map<string, number> = new Map();

    // 可见性状态
    private wasAmbientPlayingBeforeHide: boolean = false;
    private isAmbientSoundsPaused: boolean = false;

    private config: AmbientSoundConfig = {
        shortGapMin: 8000,
        shortGapMax: 10000,
        longGapMin: 8000,
        longGapMax: 10000,
        thunderLongGapMin: 8000,
        thunderLongGapMax: 10000,
        baseVolume: 0.8,
        firePosition: new Three.Vector3(-5.4, 1.0, -6.9),
        lakePosition: new Three.Vector3(0, 0, 0),
        maxDistance: 35,
    };

    constructor(audioPlayer: IAudioPlayer) {
        if (AmbientSoundManager.instance) {
            return AmbientSoundManager.instance;
        }
        AmbientSoundManager.instance = this;

        this.audioPlayer = audioPlayer;

        this.init();

        this.logger.info("AmbientSoundManager initialized");
    }

    static getInstance(): AmbientSoundManager {
        if (!AmbientSoundManager.instance) {
            throw new Error("AmbientSoundManager not initialized");
        }
        return AmbientSoundManager.instance;
    }

    init() {
        this.bindEvents();
        // this.setupVisibilityHandlers();
        this.updateAmbientSounds();
    }

    bindEvents() {

        // 监听季节变化
        datetimeManager.onTimeChanged(() => {
            this.updateAmbientSounds();
        });

        datetimeManager.onSeasonChanged(() => {
            this.updateAmbientSounds();
        });

        if (this.musicControlUI) {
            const originalEnableMusic = this.musicControlUI.enableMusic.bind(
                this.musicControlUI
            );
            const originalDisableMusic = this.musicControlUI.disableMusic.bind(
                this.musicControlUI
            );

            this.musicControlUI.enableMusic = () => {
                originalEnableMusic();
                this.updateAmbientSounds();
            };

            this.musicControlUI.disableMusic = () => {
                originalDisableMusic();
                this.stopAllAmbientSounds();
            };
        }

        this.setupAmbientVisibilityHandlers();
    }

    setupAmbientVisibilityHandlers() {
        this.handleAmbientVisibilityChange = this.handleAmbientVisibilityChange.bind(this);
        this.handleAmbientWindowBlur = this.handleAmbientWindowBlur.bind(this);
        this.handleAmbientWindowFocus = this.handleAmbientWindowFocus.bind(this);
        this.handleAmbientBeforeUnload = this.handleAmbientBeforeUnload.bind(this);

        document.addEventListener('visibilitychange', this.handleAmbientVisibilityChange);

        window.addEventListener('blur', this.handleAmbientWindowBlur);
        window.addEventListener('focus', this.handleAmbientWindowFocus);

        window.addEventListener('beforeunload', this.handleAmbientBeforeUnload);
        window.addEventListener('pagehide', this.handleAmbientBeforeUnload);

        window.addEventListener('unload', this.handleAmbientBeforeUnload);
    }

    /**
     * 可见性变化处理
     */
    handleAmbientVisibilityChange() {
        if (document.hidden) {
            if (
                this.musicControlUI &&
                this.musicControlUI.isMusicEnabled &&
                this.hasActiveAmbientSounds()
            ) {
                this.wasAmbientPlayingBeforeHide = true;
                this.pauseAmbientSounds();
            }
        } else {
            if (
                this.musicControlUI &&
                this.musicControlUI.isMusicEnabled &&
                this.wasAmbientPlayingBeforeHide
            ) {
                this.wasAmbientPlayingBeforeHide = false;

                setTimeout(() => {
                    this.resumeAmbientSounds();
                }, 500);
            }
        }
    }

    /**
     * 窗口失焦处理
     */
    handleAmbientWindowBlur() {
        if (
            this.musicControlUI &&
            this.musicControlUI.isMusicEnabled &&
            this.hasActiveAmbientSounds()
        ) {
            this.wasAmbientPlayingBeforeHide = true;
            this.pauseAmbientSounds();
        }
    }

    /**
     * 窗口聚焦处理
     */
    handleAmbientWindowFocus() {
        if (
            this.musicControlUI &&
            this.musicControlUI.isMusicEnabled &&
            this.wasAmbientPlayingBeforeHide
        ) {
            this.wasAmbientPlayingBeforeHide = false;
            setTimeout(() => {
                this.resumeAmbientSounds();
            }, 500);
        }
    }

    /**
     * 页面卸载处理
     */
    handleAmbientBeforeUnload() {
        this.stopAllAmbientSounds();
    }

    /**
     * 更新环境音效
     */
    updateAmbientSounds(): void {

        if (this.musicControlUI && !this.musicControlUI.isMusicEnabled) {
            this.stopAllAmbientSounds();
            return;
        }

        // 如果已暂停，不执行更新
        if (this.isAmbientSoundsPaused) {
            this.logger.debug("Ambient sounds paused, skipping update");
            return;
        }

        const season = datetimeManager.getCurrentSeason();
        const hour = datetimeManager.getHour();
        const timeOfDay = hour >= 6 && hour < 18 ? 'day' : 'night';

        this.logger.info(`Updating ambient sounds: season=${season}, time=${timeOfDay}`);

        // 停止所有当前音效
        this.stopAllAmbientSounds();

        // 根据季节和时间播放相应音效
        this.handleBirds(season, timeOfDay);
        this.handleCrickets(season, timeOfDay);
        this.handleOwl(season, timeOfDay);
        this.handleRain(season);
        this.handleThunder(season);
        this.handleWolf(timeOfDay);
        this.handleFire(season);
        this.handleLakeWaves();
    }

    /**
     * 处理鸟叫声
     */
    private handleBirds(season: string, timeOfDay: string): void {
        const shouldPlay = (season === 'autumn' || season === 'spring' || season === 'winter') && timeOfDay === 'day';

        if (shouldPlay) {
            this.scheduleRandomSound('birds', () => this.playRandomBird(), 'short');
        }
    }

    /**
     * 处理蟋蟀声
     */
    private handleCrickets(season: string, timeOfDay: string): void {
        const shouldPlay = (season === 'autumn' || season === 'spring' || season === 'winter') && timeOfDay === 'night';

        if (shouldPlay) {
            this.playContinuousSound('cricketsSound');
        }
    }

    /**
     * 处理猫头鹰声
     */
    private handleOwl(season: string, timeOfDay: string): void {
        if (timeOfDay !== 'night') {
            return;
        }

        if (season === 'autumn' || season === 'spring' || season === 'rainy') {
            this.scheduleRandomSound('owlHowling', () => this.playOwlHowling(), 'long');
        } else if (season === 'winter') {
            this.scheduleRandomSound('owlHooting', () => this.playOwlHooting(), 'long');
        }
    }

    /**
     * 处理雨声
     */
    private handleRain(season: string): void {
        const shouldPlay = season === 'rainy';

        if (shouldPlay) {
            this.playContinuousSound('rainSound');
        }
    }

    /**
     * 处理雷声
     */
    private handleThunder(season: string): void {
        const shouldPlay = season === 'rainy';

        if (shouldPlay) {
            this.scheduleRandomSound('thunderDistant', () => this.playThunder(), 'thunder');
        }
    }

    /**
     * 处理狼嚎声
     */
    private handleWolf(timeOfDay: string): void {
        const shouldPlay = timeOfDay === 'night';

        if (shouldPlay) {
            this.scheduleRandomSound('wolf', () => this.playWolf(), 'long');
        }
    }

    /**
     * 播放狼嚎
     */
    private playWolf(): void {
        if (this.isAmbientSoundsPaused) {
            return;
        }
        this.audioPlayer.play('wolfHowlingSound',  {
            loop: false,
            volume: this.config.baseVolume * 0.7
        });
    }

    /**
     * 处理火焰声
     */
    private handleFire(season: string): void {
        const shouldPlay = season !== 'rainy';

        if (shouldPlay) {
            this.playContinuousSoundWithDistance('fireBurningSound', this.config.firePosition);
        }
    }

    /**
     * 处理波浪声
     */
    private handleLakeWaves(): void {
        // 始终播放
        this.playContinuousSoundWithDistance('lakeWavesSound', this.config.lakePosition);
    }

    /**
     * 清除定时器
     */
    private clearTimer(soundKey: string): void {
        if (this.scheduledTimers.has(soundKey)) {
            clearTimeout(this.scheduledTimers.get(soundKey)!);
            this.scheduledTimers.delete(soundKey);
        }
    }

    /**
     * 获取随机延迟
     */
    private getRandomDelay(gapType: string): number {
        switch (gapType) {
            case 'short':
                return Math.random() * (this.config.shortGapMax - this.config.shortGapMin) + this.config.shortGapMin;
            case 'long':
                return Math.random() * (this.config.longGapMax - this.config.longGapMin) + this.config.longGapMin;
            case 'thunder':
                return Math.random() * (this.config.thunderLongGapMax - this.config.thunderLongGapMin) + this.config.thunderLongGapMin;
            default:
                return this.config.shortGapMin;
        }
    }

    /**
     * 调度随机声音
     */
    private scheduleRandomSound(soundKey: string, playFunction: () => void, gapType: string): void {
        // 如果已暂停，不调度
        if (this.isAmbientSoundsPaused) {
            return;
        }

        this.clearTimer(soundKey);

        const delay = this.getRandomDelay(gapType);
        const timerId = window.setTimeout(() => {
            // 执行前检查暂停状态
            if (!this.isAmbientSoundsPaused) {
                playFunction();
                this.rescheduleRandomSound(soundKey, playFunction, gapType);
            }
        }, delay);

        this.scheduledTimers.set(soundKey, timerId);
    }

    /**
     * 重新调度随机声音
     */
    private rescheduleRandomSound(soundKey: string, playFunction: () => void, gapType: string): void {
        // 如果已暂停或不应播放，则不再调度
        if (this.isAmbientSoundsPaused || !this.shouldSoundBePlaying(soundKey)) {
            return;
        }

        const delay = this.getRandomDelay(gapType);
        const timerId = window.setTimeout(() => {
            // 执行前再次检查暂停状态
            if (!this.isAmbientSoundsPaused) {
                playFunction();
                this.rescheduleRandomSound(soundKey, playFunction, gapType);
            }
        }, delay);

        this.scheduledTimers.set(soundKey, timerId);
    }

    /**
     * 检查声音是否应该继续播放
     */
    private shouldSoundBePlaying(soundKey: string): boolean {
        const season = datetimeManager.getCurrentSeason();
        const hour = datetimeManager.getHour();
        const timeOfDay = hour >= 6 && hour < 18 ? 'day' : 'night';

        switch (soundKey) {
            case 'birds':
                return (season === 'autumn' || season === 'spring' || season === 'winter') && timeOfDay === 'day';
            case 'owlHowling':
                return (season === 'autumn' || season === 'spring' || season === 'rainy') && timeOfDay === 'night';
            case 'owlHooting':
                return season === 'winter' && timeOfDay === 'night';
            case 'thunderDistant':
                return season === 'rainy';
            case 'wolf':
                return timeOfDay === 'night';
            default:
                return false;
        }
    }

    /**
     * 播放基于距离的连续音效
     */
    private playContinuousSoundWithDistance(soundId: string, soundPosition: Three.Vector3): void {
        // 如果已暂停，不播放
        if (this.isAmbientSoundsPaused) {
            return;
        }

        if (!this.activeContinuousSounds.has(soundId)) {
            const volume = this.calculateDistanceBasedVolume(soundPosition);
            this.audioPlayer.play(soundId,  {
                loop: true,
                volume: volume
            });
            this.activeContinuousSounds.add(soundId);
        } else {
            this.updateSoundVolume(soundId, soundPosition);
        }
    }

    /**
     * 计算基于距离的音量
     */
    private calculateDistanceBasedVolume(soundPosition: Three.Vector3): number {
        if (!this.audioPlayer.getListener()) {
            return this.config.baseVolume * 0.7;
        }

        const distance = this.audioPlayer.getListener().parent!.position.distanceTo(soundPosition);
        const normalizedDistance = Math.min(distance / this.config.maxDistance, 1.0);
        const volume = (1.0 - normalizedDistance) * this.config.baseVolume * 0.7;

        return Math.max(volume, 0);
    }

    /**
     * 停止所有环境音效
     */
    stopAllAmbientSounds(): void {
        this.logger.info("Stopping all ambient sounds");

        // 清除所有定时器
        this.scheduledTimers.forEach((timerId) => {
            clearTimeout(timerId);
        });
        this.scheduledTimers.clear();

        // 停止所有连续音效
        this.activeContinuousSounds.forEach((soundId) => {
            this.stopContinuousSound(soundId);
        });
        this.activeContinuousSounds.clear();
    }

    stopContinuousSound(soundId: string) {
        if (this.activeContinuousSounds.has(soundId)) {
            this.audioPlayer.stop(soundId);
            this.activeContinuousSounds.delete(soundId);
        }
    }

    /**
     * 更新音效音量
     */
    private updateSoundVolume(soundId: string, soundPosition: Three.Vector3): void {
        const sound = this.audioPlayer.getAudio(soundId);
        if (sound && !sound.paused) {
            const volume = this.calculateDistanceBasedVolume(soundPosition);
            sound.setVolume(volume);
        }
    }

    /**
     * 更新（每帧调用）
     */
    update(): void {
        // 更新基于距离的音效音量
        if (this.activeContinuousSounds.has('fireBurningSound')) {
            this.updateSoundVolume('fireBurningSound', this.config.firePosition);
        }
        if (this.activeContinuousSounds.has('lakeWavesSound')) {
            this.updateSoundVolume('lakeWavesSound', this.config.lakePosition);
        }
    }

    /**
     * 清理事件监听器
     */
    dispose(): void {
        this.stopAllAmbientSounds();

        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('blur', this.handleWindowBlur);
        window.removeEventListener('focus', this.handleWindowFocus);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        window.removeEventListener('pagehide', this.handleAmbientBeforeUnload);
        window.removeEventListener('unload', this.handleAmbientBeforeUnload);

        this.logger.info("AmbientSoundManager disposed");
    }

}
