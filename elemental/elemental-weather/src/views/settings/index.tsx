import {useState, useEffect, type JSX, type FC, useCallback} from 'react';
import './index.scss';
import {MusicManager} from "/@/manager";
import {LoggerFactory} from "common-tools";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    musicManager: MusicManager | undefined;
}

type TabType = 'settings' | 'about' | 'credits';

type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra' | 'custom';

interface GraphicsPreset {
    grassPerTile: number;
    fireEmissionRate: number;
    smokeEmissionRate: number;
    amberEmissionRate: number;
    antialias: boolean;
    shadowMapType: string;
    pixelRatioCap: number;
}

const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsPreset> = {
    low: {
        grassPerTile: 10000,
        fireEmissionRate: 350,
        smokeEmissionRate: 35,
        amberEmissionRate: 20,
        antialias: false,
        shadowMapType: 'BasicShadowMap',
        pixelRatioCap: 2,
    },
    medium: {
        grassPerTile: 12500,
        fireEmissionRate: 500,
        smokeEmissionRate: 50,
        amberEmissionRate: 30,
        antialias: false,
        shadowMapType: 'PCFShadowMap',
        pixelRatioCap: 2,
    },
    high: {
        grassPerTile: 25000,
        fireEmissionRate: 650,
        smokeEmissionRate: 65,
        amberEmissionRate: 40,
        antialias: true,
        shadowMapType: 'PCFSoftShadowMap',
        pixelRatioCap: 2,
    },
    ultra: {
        grassPerTile: 50000,
        fireEmissionRate: 800,
        smokeEmissionRate: 80,
        amberEmissionRate: 50,
        antialias: true,
        shadowMapType: 'PCFSoftShadowMap',
        pixelRatioCap: 3,
    },
    custom: {
        grassPerTile: 12500,
        fireEmissionRate: 500,
        smokeEmissionRate: 50,
        amberEmissionRate: 30,
        antialias: false,
        shadowMapType: 'PCFShadowMap',
        pixelRatioCap: 2,
    },
};

const PRESET_DESCRIPTIONS: Record<GraphicsQuality, string> = {
    low: 'Reduced grass density, basic shadows, lower particle effects. Best for older devices or battery saving.',
    medium: 'Balanced grass density, standard shadows, moderate particle effects. Good for most devices.',
    high: 'Dense grass, soft shadows, antialiasing enabled, rich particle effects. For capable hardware.',
    ultra: 'Super high grass density, highest quality shadows, full antialiasing, denser particles. Only for high-end devices.',
    custom: 'Fine-tune individual settings below to match your hardware and preferences.',
};

const SettingsModal: ({isOpen, onClose, musicManager}: SettingsModalProps) => (null | JSX.Element) = ({ isOpen, onClose, musicManager }) => {
    const [activeTab, setActiveTab] = useState<TabType>('settings');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleVibrate = useCallback(() => {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }, []);

    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleVibrate();
            onClose();
        }
    }, [handleVibrate, onClose]);

    const handleTabChange = useCallback((tab: TabType) => {
        handleVibrate();
        setActiveTab(tab);
    }, [handleVibrate]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay show" onClick={handleOverlayClick}>
            <div className="modal-container">
                <div className="modal-header">
                    <h2 className="modal-title">Settings</h2>
                    <button
                        className="modal-close"
                        onClick={() => {
                            handleVibrate();
                            onClose();
                        }}
                        aria-label="Close settings"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="modal-tabs">
                    <button
                        className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => handleTabChange('settings')}
                    >
                        Settings
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
                        onClick={() => handleTabChange('about')}
                    >
                        About
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'credits' ? 'active' : ''}`}
                        onClick={() => handleTabChange('credits')}
                    >
                        Credits
                    </button>
                </div>

                <div className="modal-content">
                    {activeTab === 'settings' && <SettingsTab musicManager={musicManager} />}
                    {activeTab === 'about' && <AboutTab />}
                    {activeTab === 'credits' && <CreditsTab />}
                </div>
            </div>
        </div>
    );
};

const SettingsTab: ({musicManager}: {musicManager: MusicManager | undefined}) => (null | JSX.Element) = ({musicManager }) => {

    const logger = LoggerFactory.create("weather-settings-tab");

    const [volume, setVolume] = useState(() => {
        const saved = localStorage.getItem('settings_volume');
        return saved ? parseInt(saved) : 50;
    });

    const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(() => {
        const saved = localStorage.getItem('settings_graphics_quality') as GraphicsQuality;
        return saved || 'medium';
    });

    const showCustomOptions = graphicsQuality === 'custom';

    useEffect(() => {

        const applyGraphicsPreset = (quality: GraphicsQuality) => {
            const preset = GRAPHICS_PRESETS[quality];
            if (!preset) {
                return;
            }

            logger.info(`[Settings] Applying graphics preset: ${quality}`, preset);

        };
        
        localStorage.setItem('settings_graphics_quality', graphicsQuality);

        if (graphicsQuality !== 'custom') {
            applyGraphicsPreset(graphicsQuality);
        }
    }, [graphicsQuality, logger]);

    useEffect(() => {
        localStorage.setItem('settings_volume', volume.toString());
        const applyVolumeSetting = (vol: number) => {
            if (musicManager) {
                musicManager.setMasterVolume(vol / 100);
            }
        };
        applyVolumeSetting(volume);
    }, [musicManager, volume]);

    return (
        <div className="tab-content active" id="settings-tab">
            <div className="settings-section">
                <h3 className="section-title">Audio Settings</h3>
                <div className="setting-item">
                    <label htmlFor="volume-slider">Master Volume</label>
                    <div className="volume-control">
                        <input
                            type="range"
                            id="volume-slider"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => setVolume(parseInt(e.target.value))}
                        />
                        <span className="volume-value">{volume}%</span>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3 className="section-title">Graphics Settings</h3>
                <div className="setting-item">
                    <label htmlFor="graphics-quality">Quality Preset</label>
                    <div className="custom-select">
                        <select
                            id="graphics-quality"
                            value={graphicsQuality}
                            onChange={(e) => setGraphicsQuality(e.target.value as GraphicsQuality)}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="ultra">Ultra</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                </div>
                <div className="preset-description">
                    <div className="preset-info">
                        <span className="preset-label">Affects:</span>
                        <span className="preset-details">
                            {PRESET_DESCRIPTIONS[graphicsQuality]}
                        </span>
                    </div>
                </div>

                {showCustomOptions && <CustomGraphicsOptions />}
            </div>
        </div>
    );
};

const CustomGraphicsOptions: FC = () => {
    const [grassDensity, setGrassDensity] = useState(() => {
        const saved = localStorage.getItem('custom_grass_density');
        return saved ? parseInt(saved) : 12500;
    });

    const [particleDensity, setParticleDensity] = useState(() => {
        const saved = localStorage.getItem('custom_particle_density');
        return saved ? parseInt(saved) : 500;
    });

    const [shadowQuality, setShadowQuality] = useState(() => {
        const saved = localStorage.getItem('custom_shadow_quality');
        return saved || 'PCFShadowMap';
    });

    const [pixelRatio, setPixelRatio] = useState(() => {
        const saved = localStorage.getItem('custom_pixel_ratio');
        return saved ? parseFloat(saved) : 2;
    });

    const [antialias, setAntialias] = useState(() => {
        const saved = localStorage.getItem('custom_antialias');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('custom_grass_density', grassDensity.toString());
    }, [grassDensity]);

    useEffect(() => {
        localStorage.setItem('custom_particle_density', particleDensity.toString());
    }, [particleDensity]);

    useEffect(() => {
        localStorage.setItem('custom_shadow_quality', shadowQuality);
    }, [shadowQuality]);

    useEffect(() => {
        localStorage.setItem('custom_pixel_ratio', pixelRatio.toString());
    }, [pixelRatio]);

    useEffect(() => {
        localStorage.setItem('custom_antialias', antialias.toString());
    }, [antialias]);

    return (
        <div className="custom-graphics-options show">
            <div className="custom-option">
                <div className="custom-option-header">
                    <label htmlFor="grass-density">Grass Density</label>
                    <span className="custom-option-value">{grassDensity.toLocaleString()}</span>
                </div>
                <input
                    type="range"
                    id="grass-density"
                    min="5000"
                    max="100000"
                    step="5000"
                    value={grassDensity}
                    onChange={(e) => setGrassDensity(parseInt(e.target.value))}
                    className="custom-slider"
                />
                <div className="custom-option-range">
                    <span>5K</span>
                    <span>100K</span>
                </div>
            </div>

            <div className="custom-option">
                <div className="custom-option-header">
                    <label htmlFor="particle-density">Fire Particles</label>
                    <span className="custom-option-value">{particleDensity}</span>
                </div>
                <input
                    type="range"
                    id="particle-density"
                    min="200"
                    max="1200"
                    step="50"
                    value={particleDensity}
                    onChange={(e) => setParticleDensity(parseInt(e.target.value))}
                    className="custom-slider"
                />
                <div className="custom-option-range">
                    <span>200</span>
                    <span>1200</span>
                </div>
            </div>

            <div className="custom-option">
                <div className="custom-option-header">
                    <label htmlFor="shadow-quality">Shadow Quality</label>
                    <span className="custom-option-value">
                        {shadowQuality === 'BasicShadowMap' ? 'Basic' :
                            shadowQuality === 'PCFShadowMap' ? 'Standard' : 'Soft'}
                    </span>
                </div>
                <div className="custom-select">
                    <select
                        id="shadow-quality"
                        value={shadowQuality}
                        onChange={(e) => setShadowQuality(e.target.value)}
                    >
                        <option value="BasicShadowMap">Basic</option>
                        <option value="PCFShadowMap">Standard</option>
                        <option value="PCFSoftShadowMap">Soft</option>
                    </select>
                </div>
            </div>

            <div className="custom-option">
                <div className="custom-option-header">
                    <label htmlFor="pixel-ratio">Pixel Ratio Cap</label>
                    <span className="custom-option-value">{pixelRatio}x</span>
                </div>
                <input
                    type="range"
                    id="pixel-ratio"
                    min="1"
                    max="4"
                    step="0.5"
                    value={pixelRatio}
                    onChange={(e) => setPixelRatio(parseFloat(e.target.value))}
                    className="custom-slider"
                />
                <div className="custom-option-range">
                    <span>1x</span>
                    <span>4x</span>
                </div>
            </div>

            <div className="custom-option">
                <div className="custom-option-header">
                    <label htmlFor="antialias-toggle">Antialiasing</label>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        id="antialias-toggle"
                        checked={antialias}
                        onChange={(e) => setAntialias(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
        </div>
    );
};

const AboutTab: FC = () => {
    return (
        <div className="tab-content active" id="about-tab">
            <div className="about-section">
                <h3 className="section-title">Building <em>Elemental Serenity</em></h3>

                <div className="github-link-box">
                    <p>
                        <strong><i className="fa-brands fa-github"></i></strong>
                        <a href="https://github.com/SahilK-027/Elemental-Serenity" target="_blank" rel="noopener noreferrer">
                            https://github.com/SahilK-027/Elemental-Serenity
                        </a>
                    </p>
                </div>

                <p className="about-text">
                    What started as a weekend experiment to render a calm, digital glade turned into a months-long exercise in pushing WebGL 2.0 and Three.js to their limits.
                </p>

                <h4 className="tech-title">The Stack</h4>
                <ul className="feature-list">
                    <li><strong>Three.js 0.182</strong> on top of <strong>WebGL 2.0</strong></li>
                    <li>Custom <strong>GLSL</strong> shaders</li>
                    <li><strong>GSAP 3.14</strong> for animations</li>
                    <li><strong>Vite 6.0</strong> + ES6 modules</li>
                    <li><code>vite-plugin-glsl</code> for shader hot-reload</li>
                </ul>

                <h4 className="tech-title">Key Features</h4>
                <ul className="feature-list">
                    <li>Instanced grass rendering with GPU wind physics</li>
                    <li>4 seasons × 2 times of day = 8 unique palettes</li>
                    <li>Spatialized audio with distance-based falloff</li>
                    <li>Quality presets for different hardware levels</li>
                    <li>Event-driven architecture for smooth transitions</li>
                </ul>
            </div>
        </div>
    );
};

const CreditsTab: FC = () => {
    return (
        <div className="tab-content active" id="credits-tab">
            <div className="credits-section">
                <h3 className="section-title">Credits & Resources</h3>

                <div className="credit-category">
                    <h4 className="credit-title">Models</h4>
                    <div className="credit-item">
                        <strong>"A simple medieval wooden bridge"</strong> by FunWithBlender - Creative Commons Attribution-NonCommercial
                    </div>
                    <div className="credit-item">
                        <strong>"Stylized Tent"</strong> by csabat3D - Creative Commons Attribution
                    </div>
                    <div className="credit-item">
                        <strong>Tree trunks and sound effects:</strong>{' '}
                        <a href="https://bruno-simon.com/" target="_blank" rel="noopener noreferrer">bruno-simon.com</a>
                    </div>
                </div>

                <div className="credit-category">
                    <h4 className="credit-title">Environment & Textures</h4>
                    <div className="credit-item">
                        <strong>Environment map:</strong> "citrus_orchard_road_puresky_4k.hdr" from{' '}
                        <a href="https://polyhaven.com" target="_blank" rel="noopener noreferrer">Polyhaven</a>
                    </div>
                </div>

                <div className="credit-category">
                    <h4 className="credit-title">Music and Audio</h4>
                    <div className="credit-item">
                        <strong>BGM:</strong>{' '}
                        <a href="https://suno.com" target="_blank" rel="noopener noreferrer">suno.com</a> - Suno AI music
                    </div>
                </div>

                <div className="credit-category">
                    <h4 className="credit-title">JavaScript Libraries</h4>
                    <div className="credit-item">
                        <strong>Three.js:</strong>{' '}
                        <a href="https://threejs.org/" target="_blank" rel="noopener noreferrer">threejs.org</a>
                    </div>
                    <div className="credit-item">
                        <strong>GSAP:</strong>{' '}
                        <a href="https://gsap.com/" target="_blank" rel="noopener noreferrer">gsap.com</a>
                    </div>
                </div>

                <div className="version-info">
                    <p>Version 1.0.0 | Built with 💜 for the web</p>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
