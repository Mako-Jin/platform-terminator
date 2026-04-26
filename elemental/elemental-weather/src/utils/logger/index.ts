import type Weather from "/@/weather/weather";


function keyValue(key: string, value: string, color = '#67e8f9') {
    console.log(
        `%c  ${key}: %c${value}`,
        css({ color: '#94a3b8', 'font-size': '11px', 'font-weight': '500' }),
        css({ color, 'font-size': '11px', 'font-weight': '700' })
    );
}

const css = (obj) =>
    Object.entries(obj)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');

export function section(title, icon = '◆') {
    console.log(
        `\n%c ${icon} ${title.toUpperCase()} `,
        css({
            background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
            color: '#38bdf8',
            'font-size': '12px',
            'font-weight': '700',
            padding: '6px 16px',
            'border-radius': '4px',
            'border-left': '3px solid #38bdf8',
            'letter-spacing': '1px',
        })
    );
}


export function groupOpen(title, icon = '') {
    console.group(
        `%c ${title}`,
        css({
            color: '#f8fafc',
            'font-weight': '700',
            'font-size': '12px',
            background: 'linear-gradient(90deg, #1e3a5f 0%, #0f172a 100%)',
            padding: '6px 14px',
            'border-radius': '4px',
            'border-left': '3px solid #3b82f6',
        })
    );
}

function groupEnd() {
    console.groupEnd();
}

function divider(char = '─', length = 50) {
    console.log(
        `%c${char.repeat(length)}`,
        css({ color: '#334155', 'font-size': '10px' })
    );
}


export function logGameState(weather: Weather) {

    const renderer = weather.renderer?.rendererInstance;
    const seasonManager = weather.seasonManager;
    const envTimeManager = weather.environmentTimeManager;
    const audioManager = weather.audioManager;
    const musicManager = weather.musicManager;

    section('Current State', '📊');

    groupOpen('🖥️ Graphics Settings');

    const storedQuality = localStorage.getItem('graphicsQuality') || 'medium';
    const storedPixelRatio = localStorage.getItem('graphicsPixelRatioCap') || '2';
    const storedShadowMap =
        localStorage.getItem('graphicsShadowMapType') || 'PCFShadowMap';
    const storedAntialias = localStorage.getItem('graphicsAntialias') || 'false';

    keyValue('Quality Preset', storedQuality.toUpperCase(), '#facc15');
    keyValue(
        'Pixel Ratio',
        `${
            renderer?.getPixelRatio()?.toFixed(1) || storedPixelRatio
        } (cap: ${storedPixelRatio})`,
        '#67e8f9'
    );
    keyValue('Shadow Map', storedShadowMap, '#c084fc');
    keyValue(
        'Antialias',
        storedAntialias === 'true' ? 'ON' : 'OFF',
        storedAntialias === 'true' ? '#4ade80' : '#94a3b8'
    );
    keyValue('Power Preference', 'high-performance', '#4ade80');

    if (renderer) {
        const toneMap = renderer.toneMapping;
        const toneMapNames = {
            0: 'None',
            1: 'Linear',
            2: 'Reinhard',
            3: 'Cineon',
            4: 'ACESFilmic',
            6: 'AgX',
            7: 'Neutral',
        };
        keyValue('Tone Mapping', toneMapNames[toneMap] || toneMap, '#fb7185');
        keyValue('Exposure', renderer.toneMappingExposure?.toFixed(2), '#67e8f9');
    }
    groupEnd();

    groupOpen('🌍 World State');
    const currentSeason = seasonManager?.currentSeason || 'unknown';
    const currentTime = envTimeManager?.envTime || 'unknown';
    const seasonColors = {
        spring: '#86efac',
        autumn: '#fdba74',
        winter: '#93c5fd',
        rainy: '#7dd3fc',
    };
    const timeColors = { day: '#fde047', night: '#a78bfa' };

    keyValue(
        'Season',
        currentSeason.toUpperCase(),
        seasonColors[currentSeason] || '#94a3b8'
    );
    keyValue(
        'Time of Day',
        currentTime.toUpperCase(),
        timeColors[currentTime] || '#94a3b8'
    );
    groupEnd();

    groupOpen('🔊 Audio State');
    const musicEnabled = weather.withMusic;
    const masterVol = audioManager?.masterVolume ?? 1;
    const musicVol = audioManager?.musicVolume ?? 0.5;
    const soundVol = audioManager?.soundVolume ?? 0.7;

    keyValue(
        'Music',
        musicEnabled ? 'ENABLED' : 'DISABLED',
        musicEnabled ? '#4ade80' : '#f87171'
    );
    keyValue('Master Volume', `${Math.round(masterVol * 100)}%`, '#facc15');
    keyValue('Music Volume', `${Math.round(musicVol * 100)}%`, '#67e8f9');
    keyValue('Sound Volume', `${Math.round(soundVol * 100)}%`, '#c084fc');

    if (musicManager?.currentTrack) {
        keyValue(
            'Now Playing',
            musicManager.currentTrack.name || 'Unknown',
            '#4ade80'
        );
    }
    groupEnd();

    groupOpen('💻 Viewport');
    keyValue('Window', `${window.innerWidth} × ${window.innerHeight}`, '#67e8f9');
    keyValue('Device Pixel Ratio', `${window.devicePixelRatio}x`, '#facc15');
    keyValue(
        'Touch Support',
        navigator.maxTouchPoints > 0 ? 'YES' : 'NO',
        '#c084fc'
    );
    groupEnd();

    divider('─', 60);
    const debugHintStyle = css({
        color: '#94a3b8',
        'font-size': '11px',
        'font-style': 'italic',
    });
    const debugLinkStyle = css({
        color: '#60a5fa',
        'font-size': '11px',
        'font-weight': '700',
    });
    console.log(
        `%c💡 Tip: Add %c?mode=debug%c to URL for debug GUI with full controls`,
        debugHintStyle,
        debugLinkStyle,
        debugHintStyle
    );
    divider('═', 60);
}

export function logMusicChange(action, trackName = null) {
    const actions = {
        play: { emoji: '▶️', label: 'PLAYING', color: '#4ade80' },
        pause: { emoji: '⏸️', label: 'PAUSED', color: '#facc15' },
        stop: { emoji: '⏹️', label: 'STOPPED', color: '#f87171' },
        skip: { emoji: '⏭️', label: 'SKIPPED', color: '#67e8f9' },
        track: { emoji: '🎵', label: 'TRACK', color: '#c084fc' },
    };
    const { emoji, label, color } = actions[action] || actions.track;

    const msg = trackName ? `${label}: ${trackName}` : label;

    console.log(
        `%c${emoji} MUSIC%c ${msg}`,
        css({
            background: color,
            color: '#0f172a',
            padding: '3px 10px',
            'border-radius': '4px',
            'font-weight': '700',
            'font-size': '11px',
        }),
        css({
            color: color,
            'font-size': '12px',
            'font-weight': '600',
            'padding-left': '8px',
        })
    );
}

export function logAudioToggle(enabled) {
    const emoji = enabled ? '🔊' : '🔇';
    const label = enabled ? 'UNMUTED' : 'MUTED';
    const color = enabled ? '#4ade80' : '#f87171';

    console.log(
        `%c${emoji} AUDIO%c ${label}`,
        css({
            background: color,
            color: '#0f172a',
            padding: '3px 10px',
            'border-radius': '4px',
            'font-weight': '700',
            'font-size': '11px',
        }),
        css({
            color: color,
            'font-size': '12px',
            'font-weight': '600',
            'padding-left': '8px',
        })
    );
}

export function logGraphicsChange(quality) {
    const qualityColors = {
        low: '#f87171',
        medium: '#facc15',
        high: '#4ade80',
        ultra: '#c084fc',
    };
    const color = qualityColors[quality] || '#94a3b8';

    console.log(
        `%c⚙️ GRAPHICS%c Quality set to ${quality.toUpperCase()}`,
        css({
            background: color,
            color: '#0f172a',
            padding: '3px 10px',
            'border-radius': '4px',
            'font-weight': '700',
            'font-size': '11px',
        }),
        css({
            color: color,
            'font-size': '12px',
            'font-weight': '600',
            'padding-left': '8px',
        })
    );
}
