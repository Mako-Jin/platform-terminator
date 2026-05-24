import {eventBus, LoggerFactory} from "common-tools";
import {datetimeManager, type IAudioPlayer} from "common-three";
import * as Three from 'three';
import MusicManager from "./music";
import {weatherManager} from "/@/manager";
import type {WeatherChangedData} from "/@/manager";


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

    private birdSounds = [
        'birds1Sound',
        'birds2Sound',
        'birds3Sound',
        'birds4Sound',
    ];

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

        weatherManager.onWeatherChanged((data: WeatherChangedData) => {
            this.logger.info(`Weather changed event received: ${data.previousWeather} -> ${data.currentWeather}`);
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
        const weather = weatherManager.getCurrentWeather();
        const timeOfDay = datetimeManager.isDaytime() ? 'day' : 'night';

        this.logger.info(`Updating ambient sounds: season=${season}, weather=${weather}, time=${timeOfDay}`);

        this.stopAllAmbientSounds();

        this.handleBirds(timeOfDay);
        this.handleCrickets(season, timeOfDay);
        // 猫头鹰
        this.handleOwl(season, timeOfDay);
        this.handleRain(weather);
        this.handleThunder(season, weather);
        this.handleWolf(timeOfDay);
        this.handleFire(weather);
        // 湖水波浪声
        this.handleLakeWaves(season);
    }

    private handleBirds(timeOfDay: string): void {
        const shouldPlay = timeOfDay === 'day';

        if (shouldPlay) {
            this.scheduleRandomSound('birds', () => this.playRandomBird(), 'short');
        }
    }

    getRandomBirdSound() {
        return this.birdSounds[Math.floor(Math.random() * this.birdSounds.length)];
    }

    playRandomBird() {
        if (this.isAmbientSoundsPaused) {
            return;
        }
        const birdSoundId = this.getRandomBirdSound();
        this.audioPlayer.play(birdSoundId,   {
            loop: false,
            volume: this.config.baseVolume
        })
    }

    private handleCrickets(season: string, timeOfDay: string): void {
        const shouldPlay = (season === 'autumn' || season === 'spring' || season === 'summer') && timeOfDay === 'night';

        if (shouldPlay) {
            this.playContinuousSound('cricketsSound');
        }
    }

    playContinuousSound(soundId: string) {
        if (!this.activeContinuousSounds.has(soundId)) {
            this.audioPlayer.play(soundId, {loop: true, volume: this.config.baseVolume * 0.7});
            this.activeContinuousSounds.add(soundId);
        }
    }

    private handleOwl(season: string, timeOfDay: string): void {
        if (timeOfDay !== 'night') {
            return;
        }
        if (season === 'autumn' || season === 'spring' || season === 'summer') {
            this.scheduleRandomSound('owlHowling', () => this.playOwlHowling(), 'long');
        } else if (season === 'winter') {
            this.scheduleRandomSound('owlHooting', () => this.playOwlHooting(), 'long');
        }
    }

    playOwlHooting() {
        if (this.isAmbientSoundsPaused) {
            return;
        }
        this.audioPlayer.play('owlHootingSound', {
            loop: false,
            volume: this.config.baseVolume
        });
    }

    playOwlHowling() {
        if (this.isAmbientSoundsPaused) {
            return;
        }
        this.audioPlayer.play('owlHowlingSound', {
            loop: false,
            volume: this.config.baseVolume
        });
    }

    private handleRain(weather: string): void {
        const shouldPlay = weather === 'rainy';

        if (shouldPlay) {
            this.playContinuousSound('rainSound');
        }
    }

    private handleThunder(season: string, weather: string): void {
        const shouldPlay = season === 'summer' && weather === 'rainy';

        if (shouldPlay) {
            this.scheduleRandomSound('thunderDistant', () => this.playThunder(), 'thunder');
        }
    }

    playThunder() {
        if (this.isAmbientSoundsPaused) {
            return;
        }
        this.audioPlayer.play('thunderDistantSound', {
            loop: false,
            volume: this.config.baseVolume * 0.9
        });
    }

    /**
     * 播放雷击声（闪电时调用）
     */
    playThunderStrike(): void {
        if (!document.hidden && !this.isAmbientSoundsPaused) {
            this.audioPlayer.play('thunderStrikeSound', {
                loop: false,
                volume: this.config.baseVolume * 0.9
            });
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

    private handleFire(weather: string): void {
        const shouldPlay = weather !== 'rainy';

        if (shouldPlay) {
            this.playContinuousSoundWithDistance('fireBurningSound', this.config.firePosition);
        }
    }

    private handleLakeWaves(season: string): void {
        const shouldPlay = season !== 'winter';
        if (shouldPlay) {
            this.playContinuousSoundWithDistance('lakeWavesSound', this.config.lakePosition);
        }
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
        const weather = weatherManager.getCurrentWeather();
        const timeOfDay = datetimeManager.isDaytime() ? 'day' : 'night';

        switch (soundKey) {
            case 'birds':
                return timeOfDay === 'day';
            case 'owlHowling':
                return (season === 'autumn' || season === 'spring' || season === 'summer' || weather === 'rainy') && timeOfDay === 'night';
            case 'owlHooting':
                return season === 'winter' && timeOfDay === 'night';
            case 'thunderDistant':
                return season === 'summer' && weather === 'rainy';
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

        const distance = this.audioPlayer.getListener()!.parent!.position.distanceTo(soundPosition);
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
