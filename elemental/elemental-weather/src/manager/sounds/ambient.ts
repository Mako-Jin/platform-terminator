import {eventBus, LoggerFactory} from "common-tools";
import {datetimeManager, type IAudioPlayer} from "common-three";
import * as Three from 'three';
import MusicManager from "./music";


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
    private musicManager: MusicManager;

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
        this.musicManager = MusicManager.getInstance();

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
        this.updateAmbientSounds();
    }

    bindEvents() {

        datetimeManager.onTimeChanged(() => {
            this.updateAmbientSounds();
        });

        datetimeManager.onSeasonChanged(() => {
            this.updateAmbientSounds();
        });

        eventBus.on(MusicManager.ELEMENTAL_WEATHER_MUSIC_ENABLED_CHANGED, (data: { enabled: boolean }) => {
            this.logger.info(`Received music enabled change event: ${data.enabled}`);
            if (!data.enabled) {
                this.stopAllAmbientSounds();
            } else {
                this.updateAmbientSounds();
            }
        });

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

    handleAmbientVisibilityChange() {
        if (document.hidden) {
            if (
                this.musicManager.getIsMusicEnabled() &&
                this.hasActiveAmbientSounds()
            ) {
                this.wasAmbientPlayingBeforeHide = true;
                this.pauseAmbientSounds();
            }
        } else {
            if (
                this.musicManager.getIsMusicEnabled() &&
                this.wasAmbientPlayingBeforeHide
            ) {
                this.wasAmbientPlayingBeforeHide = false;

                setTimeout(() => {
                    this.resumeAmbientSounds();
                }, 500);
            }
        }
    }

    handleAmbientWindowBlur() {
        if (
            this.musicManager.getIsMusicEnabled() &&
            this.hasActiveAmbientSounds()
        ) {
            this.wasAmbientPlayingBeforeHide = true;
            this.pauseAmbientSounds();
        }
    }

    handleAmbientWindowFocus() {
        if (
            this.musicManager.getIsMusicEnabled() &&
            this.wasAmbientPlayingBeforeHide
        ) {
            this.wasAmbientPlayingBeforeHide = false;
            setTimeout(() => {
                this.resumeAmbientSounds();
            }, 500);
        }
    }

    handleAmbientBeforeUnload() {
        this.stopAllAmbientSounds();
    }

    updateAmbientSounds(): void {

        if (!this.musicManager.getIsMusicEnabled()) {
            this.stopAllAmbientSounds();
            return;
        }

        if (this.isAmbientSoundsPaused) {
            this.logger.debug("Ambient sounds paused, skipping update");
            return;
        }

        const season = datetimeManager.getCurrentSeason();
        const timeOfDay = datetimeManager.isDaytime() ? 'day' : 'night';

        this.logger.info(`Updating ambient sounds: season=${season}, time=${timeOfDay}`);

        this.stopAllAmbientSounds();

        this.handleBirds(season, timeOfDay);
        this.handleCrickets(season, timeOfDay);
        this.handleOwl(season, timeOfDay);
        this.handleRain(season);
        this.handleThunder(season);
        this.handleWolf(timeOfDay);
        this.handleFire(season);
        this.handleLakeWaves();
    }

    private handleBirds(season: string, timeOfDay: string): void {
        const shouldPlay = (season === 'autumn' || season === 'spring' || season === 'winter') && timeOfDay === 'day';

        if (shouldPlay) {
            this.scheduleRandomSound('birds', () => this.playRandomBird(), 'short');
        }
    }

    private handleCrickets(season: string, timeOfDay: string): void {
        const shouldPlay = (season === 'autumn' || season === 'spring' || season === 'winter') && timeOfDay === 'night';

        if (shouldPlay) {
            this.playContinuousSound('cricketsSound');
        }
    }

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

    private handleRain(season: string): void {
        const shouldPlay = season === 'rainy';

        if (shouldPlay) {
            this.playContinuousSound('rainSound');
        }
    }

    private handleThunder(season: string): void {
        const shouldPlay = season === 'rainy';

        if (shouldPlay) {
            this.scheduleRandomSound('thunderDistant', () => this.playThunder(), 'thunder');
        }
    }

    private handleWolf(timeOfDay: string): void {
        const shouldPlay = timeOfDay === 'night';

        if (shouldPlay) {
            this.scheduleRandomSound('wolf', () => this.playWolf(), 'long');
        }
    }

    private playWolf(): void {
        if (this.isAmbientSoundsPaused) {
            return;
        }
        this.audioPlayer.play('wolfHowlingSound',  {
            loop: false,
            volume: this.config.baseVolume * 0.7
        });
    }

    private handleFire(season: string): void {
        const shouldPlay = season !== 'rainy';

        if (shouldPlay) {
            this.playContinuousSoundWithDistance('fireBurningSound', this.config.firePosition);
        }
    }

    private handleLakeWaves(): void {
        this.playContinuousSoundWithDistance('lakeWavesSound', this.config.lakePosition);
    }

    private clearTimer(soundKey: string): void {
        if (this.scheduledTimers.has(soundKey)) {
            clearTimeout(this.scheduledTimers.get(soundKey)!);
            this.scheduledTimers.delete(soundKey);
        }
    }

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

    private scheduleRandomSound(soundKey: string, playFunction: () => void, gapType: string): void {
        if (this.isAmbientSoundsPaused) {
            return;
        }

        this.clearTimer(soundKey);

        const delay = this.getRandomDelay(gapType);
        const timerId = window.setTimeout(() => {
            if (!this.isAmbientSoundsPaused) {
                playFunction();
                this.rescheduleRandomSound(soundKey, playFunction, gapType);
            }
        }, delay);

        this.scheduledTimers.set(soundKey, timerId);
    }

    private rescheduleRandomSound(soundKey: string, playFunction: () => void, gapType: string): void {
        if (this.isAmbientSoundsPaused || !this.shouldSoundBePlaying(soundKey)) {
            return;
        }

        const delay = this.getRandomDelay(gapType);
        const timerId = window.setTimeout(() => {
            if (!this.isAmbientSoundsPaused) {
                playFunction();
                this.rescheduleRandomSound(soundKey, playFunction, gapType);
            }
        }, delay);

        this.scheduledTimers.set(soundKey, timerId);
    }

    private shouldSoundBePlaying(soundKey: string): boolean {
        const season = datetimeManager.getCurrentSeason();
        const hour = datetimeManager.getHour();
        const timeOfDay = datetimeManager.isDaytime() ? 'day' : 'night';

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

    private playContinuousSoundWithDistance(soundId: string, soundPosition: Three.Vector3): void {
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

    private calculateDistanceBasedVolume(soundPosition: Three.Vector3): number {
        if (!this.audioPlayer.getListener()) {
            return this.config.baseVolume * 0.7;
        }

        const distance = this.audioPlayer.getListener().parent!.position.distanceTo(soundPosition);
        const normalizedDistance = Math.min(distance / this.config.maxDistance, 1.0);
        const volume = (1.0 - normalizedDistance) * this.config.baseVolume * 0.7;

        return Math.max(volume, 0);
    }

    stopAllAmbientSounds(): void {
        this.logger.info("Stopping all ambient sounds");

        this.scheduledTimers.forEach((timerId) => {
            clearTimeout(timerId);
        });
        this.scheduledTimers.clear();

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

    private updateSoundVolume(soundId: string, soundPosition: Three.Vector3): void {
        const sound = this.audioPlayer.getAudio(soundId);
        if (sound && !sound.paused) {
            const volume = this.calculateDistanceBasedVolume(soundPosition);
            sound.setVolume(volume);
        }
    }

    update(): void {
        if (this.activeContinuousSounds.has('fireBurningSound')) {
            this.updateSoundVolume('fireBurningSound', this.config.firePosition);
        }
        if (this.activeContinuousSounds.has('lakeWavesSound')) {
            this.updateSoundVolume('lakeWavesSound', this.config.lakePosition);
        }
    }

    hasActiveAmbientSounds(): boolean {
        return this.activeContinuousSounds.size > 0 || this.scheduledTimers.size > 0;
    }

    pauseAmbientSounds(): void {
        this.isAmbientSoundsPaused = true;

        this.stopAllAmbientSounds();

        this.logger.info("Ambient sounds paused");
    }

    resumeAmbientSounds(): void {
        this.isAmbientSoundsPaused = false;

        this.updateAmbientSounds();

        this.logger.info("Ambient sounds resumed");
    }

    dispose(): void {
        this.stopAllAmbientSounds();

        document.removeEventListener('visibilitychange', this.handleAmbientVisibilityChange);
        window.removeEventListener('blur', this.handleAmbientWindowBlur);
        window.removeEventListener('focus', this.handleAmbientWindowFocus);
        window.removeEventListener('beforeunload', this.handleAmbientBeforeUnload);
        window.removeEventListener('pagehide', this.handleAmbientBeforeUnload);
        window.removeEventListener('unload', this.handleAmbientBeforeUnload);

        this.logger.info("AmbientSoundManager disposed");
    }

}
