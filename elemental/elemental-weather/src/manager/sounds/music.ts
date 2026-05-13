import {eventBus, LoggerFactory} from "common-tools";
import type {IAudioPlayer} from "common-three";


export interface MusicTrack {
    id: string;
    name: string;
}


export default class MusicManager {

    public static readonly ELEMENTAL_WEATHER_MUSIC_TRACK_CHANGED = 'elemental-weather:music:track-changed';
    public static readonly COMMON_THREE_RESOURCE_LOADED = 'common-three:resource:loaded';
    public static readonly COMMON_THREE_RESOURCE_ERROR = 'common-three:resource:error';
    public static readonly ELEMENTAL_WEATHER_MUSIC_ENABLED_CHANGED = 'elemental-weather:music:enabled-changed';

    private logger = LoggerFactory.create("elemental-weather-manager-music");

    private static instance: MusicManager | null = null;

    private audioPlayer: IAudioPlayer;

    private musicTracks: MusicTrack[] = [
        { id: 'morningPetalsMusic', name: 'Morning Petals' },
        { id: 'windowLightMusic', name: 'Window Light' },
        { id: 'forestDreamsMusic', name: 'Forest Dreams' },
    ];

    private currentTrackIndex: number = -1;
    private isPlaying: boolean = false;
    private isPaused: boolean = false;
    private isMusicEnabled: boolean = false;

    private fadeInDuration: number = 2000;
    private fadeOutDuration: number = 1000;

    private trackCheckInterval: number | undefined = undefined;
    private pausedTrackId: string | null = null;

    constructor(audioPlayer: IAudioPlayer) {
        if (MusicManager.instance) {
            return MusicManager.instance;
        }
        MusicManager.instance = this;

        this.audioPlayer = audioPlayer;

        this.logger.info("MusicManager initialized");
    }

    static getInstance(): MusicManager {
        if (!MusicManager.instance) {
            throw new Error("MusicManager not initialized. Call constructor first.");
        }
        return MusicManager.instance;
    }

    getIsMusicEnabled(): boolean {
        return this.isMusicEnabled;
    }

    setIsMusicEnabled(enabled: boolean): void {
        if (this.isMusicEnabled === enabled) {
            return;
        }

        this.isMusicEnabled = enabled;

        eventBus.emit(MusicManager.ELEMENTAL_WEATHER_MUSIC_ENABLED_CHANGED, {
            enabled: enabled
        });

        this.logger.info(`Music enabled state changed to: ${enabled}`);
    }

    startRandomMusic(): void {
        if (this.isPlaying) {
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.setIsMusicEnabled(true);

        this.playNextRandomTrack();

        this.logger.info("Started random music");
    }

    pauseMusic(): void {
        if (!this.isPlaying || this.isPaused) {
            return;
        }

        this.isPaused = true;
        this.isPlaying = false;
        this.setIsMusicEnabled(false);

        if (this.trackCheckInterval) {
            clearInterval(this.trackCheckInterval);
            this.trackCheckInterval = undefined;
        }

        const currentTrackId = this.audioPlayer.getCurrentTrackId();
        if (currentTrackId) {
            const music = this.audioPlayer.getAudio(currentTrackId);
            if (music && music.isPlaying) {
                this.pausedTrackId = currentTrackId;
                this.audioPlayer.fadeVolume(
                    music,
                    0,
                    this.fadeOutDuration
                ).then(() => {
                    music.pause();
                });
            }
        }

        this.logger.info("Music paused");
    }

    resumeMusic(): void {
        if (!this.isPaused) {
            this.startRandomMusic();
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.setIsMusicEnabled(true);

        const currentTrackId = this.audioPlayer.getCurrentTrackId();
        if (currentTrackId) {
            const music = this.audioPlayer.getAudio(currentTrackId);
            if (music && currentTrackId === this.pausedTrackId) {
                this.playTrackWithoutLoop(currentTrackId).then();
                this.startTrackMonitoring(currentTrackId);
                return;
            }
        }

        this.playNextRandomTrack();

        this.logger.info("Music resumed");
    }

    stopMusic(): void {
        this.isPlaying = false;
        this.isPaused = false;
        this.pausedTrackId = null;
        this.setIsMusicEnabled(false);

        this.audioPlayer.stopMusic(false);

        if (this.trackCheckInterval) {
            clearInterval(this.trackCheckInterval);
            this.trackCheckInterval = undefined;
        }

        this.logger.info("Music stopped");
    }

    playNextRandomTrack() {
        if (!this.isPlaying) {
            return;
        }

        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * this.musicTracks.length);
        } while (nextIndex === this.currentTrackIndex && this.musicTracks.length > 1);

        this.currentTrackIndex = nextIndex;
        const track = this.musicTracks[this.currentTrackIndex];

        this.playTrackWithoutLoop(track.id).then();

        this.handleTrackChanged(track);

        this.startTrackMonitoring(track.id);
    }

    startTrackMonitoring(trackId: string) {
        if (this.trackCheckInterval) {
            clearInterval(this.trackCheckInterval);
        }

        const audio = this.audioPlayer.getAudio(trackId);
        if (!audio) {
            return;
        }

        const duration = audio.buffer ? audio.buffer.duration : 0;
        const startTime = performance.now();

        this.trackCheckInterval = setInterval(() => {
            if (!this.isPlaying) {
                clearInterval(this.trackCheckInterval);
                return;
            }

            const elapsed = (performance.now() - startTime) / 1000;

            if (elapsed >= duration - 0.5 || !audio.isPlaying) {
                clearInterval(this.trackCheckInterval);
                this.trackCheckInterval = undefined;

                setTimeout(() => {
                    if (this.isPlaying) {
                        this.playNextRandomTrack();
                    }
                }, 1000);
            }
        }, 1000);
    }

    handleTrackChanged(track: MusicTrack) {
        this.logger.info(`Track changed to ${track.name}`);
        eventBus.emit(MusicManager.ELEMENTAL_WEATHER_MUSIC_TRACK_CHANGED, {
            name: track.name,
            id: track.id,
        });
    }

    async playTrackWithoutLoop(trackId: string) {
        const currentTrackId = this.audioPlayer.getCurrentTrackId();
        if (currentTrackId && this.audioPlayer.isPlaying(currentTrackId)) {
            this.audioPlayer.stop(currentTrackId);
        }

        const music = this.audioPlayer.getAudio(trackId);
        if (!music) {
            console.warn(`Music ${trackId} not found`);
            return;
        }

        this.audioPlayer.setCurrentTrackId(trackId);
        music.setLoop(false);

        music.setVolume(0);
        music.play();
        await this.audioPlayer.fadeVolume(
            music,
            this.audioPlayer.getMusicVolume() * this.audioPlayer.getMasterVolume(),
            this.fadeInDuration
        );
    }

}
