import type {Asset} from "common-three";

/**
 * 获取资源基础路径（运行时动态获取）
 * 在 qiankun 环境下，需要使用微应用的入口路径作为前缀
 */
export const getBasePath = (): string => {
    // 检查是否在 qiankun 环境中
    const isQiankun = !!(window as unknown as { __POWERED_BY_QIANKUN__: boolean }).__POWERED_BY_QIANKUN__;
    
    if (isQiankun) {
        // qiankun 环境下，使用微应用的入口路径
        // 开发环境: http://localhost:5001
        // 生产环境: /elemental/elemental-weather/
        const isDev = import.meta.env.DEV;
        return isDev ? 'http://localhost:5001' : '/elemental/elemental-weather';
    }
    
    // 独立运行时使用相对路径
    return '';
};

/**
 * 拼接资源路径（运行时动态解析）
 */
export const resolvePath = (path: string): string => {
    return getBasePath() + path;
};

/**
 * 拼接资源路径数组（运行时动态解析）
 */
const resolvePaths = (paths: string[]): string[] => {
    const basePath = getBasePath();
    return paths.map(p => basePath + p);
};

/**
 * 天气相关资源 - qiankun 场景下只加载这些
 * 注意：路径保持原始形式，不在模块加载时解析
 */
export const WEATHER_ASSETS: Asset[] = [
    {
        id: 'environmentMapDayTexture',
        type: 'cubeMap',
        path: [
            '/map/day/px.png',
            '/map/day/nx.png',
            '/map/day/py.png',
            '/map/day/ny.png',
            '/map/day/pz.png',
            '/map/day/nz.png',
        ],
    },
    {
        id: 'environmentMapNightTexture',
        type: 'cubeMap',
        path: [
            '/map/night/px.png',
            '/map/night/nx.png',
            '/map/night/py.png',
            '/map/night/ny.png',
            '/map/night/pz.png',
            '/map/night/nz.png',
        ],
    },
    {
        id: 'perlinNoise',
        type: 'texture',
        path: ['/textures/noises/perlin_noise_256x256.png'],
    },
    {
        id: 'groundRockMap',
        type: 'texture',
        path: ['/textures/ground/rocks_height_256x256.png'],
    },
    {
        id: 'groundRockAOMap',
        type: 'texture',
        path: ['/textures/ground/rocks_ao_256x256.png'],
    },
    {
        id: 'waterDepthMap',
        type: 'texture',
        path: ['/textures/water/water_depth_map_256x256.png'],
    },
    {
        id: 'fireTexture',
        type: 'texture',
        path: ['/textures/fire/fire_256x256.png'],
    },
    {
        id: 'smokeTexture',
        type: 'texture',
        path: ['/textures/fire/smoke_256x256.png'],
    },
    {
        id: 'particleTexture',
        type: 'texture',
        path: ['/textures/particles/particle_alpha_map_256x256.png'],
    },
    {
        id: 'particleTextureNoAlpha',
        type: 'texture',
        path: ['/textures/particles/particle_256x256.jpg'],
    },
    {
        id: 'rainSound',
        type: 'audio',
        path: ['/audio/sounds/rain/rain.mp3'],
    },
    {
        id: 'thunderDistantSound',
        type: 'audio',
        path: ['/audio/sounds/thunder/distant/thunder_distant.mp3'],
    },
    {
        id: 'thunderStrikeSound',
        type: 'audio',
        path: ['/audio/sounds/thunder/near/thunder_strike.mp3'],
    },
];

/**
 * 场景装饰资源 - 非 qiankun 场景下额外加载这些
 */
export const SCENE_ASSETS: Asset[] = [
    {
        id: 'grassBladeModel',
        type: 'gltfModelCompressed',
        path: [resolvePath('/models/grass_blade.glb')],
    },
    {
        id: 'grassPathDensityDataTexture',
        type: 'texture',
        path: [resolvePath('/textures/grass/path_data_rgb_768x768.png')],
    },
    {
        id: 'displacedNormalMap',
        type: 'texture',
        path: [resolvePath('/textures/grass/displaced_normals_256x256.png')],
    },
    {
        id: 'displacementMap',
        type: 'texture',
        path: [resolvePath('/textures/grass/displacement_map_256x256.png')],
    },
    {
        id: 'displacementMapBlur',
        type: 'texture',
        path: [resolvePath('/textures/grass/displacement_map_blur_256x256.png')],
    },
    {
        id: 'tentModel',
        type: 'gltfModelCompressed',
        path: [resolvePath('/models/tent.glb')],
    },
    {
        id: 'bridgeModel',
        type: 'gltfModelCompressed',
        path: [resolvePath('/models/bridge.glb')],
    },
    {
        id: 'rocksModel',
        type: 'gltfModelCompressed',
        path: [resolvePath('/models/rocks.glb')],
    },
    {
        id: 'leavesAlphaMap',
        type: 'texture',
        path: [resolvePath('/textures/bush/leave_alpha_map_256x256.png')],
    },
    {
        id: 'BushEmitterModel',
        type: 'gltfModelCompressed',
        path: [resolvePath('/models/bushEmitter.glb')],
    },
    {
        id: 'TreeTrunksModel',
        type: 'gltfModelCompressed',
        path: [resolvePath('/models/treeTrunks.glb')],
    },
    {
        id: 'campModel',
        type: 'gltfModelCompressed',
        path: [resolvePath('/models/camp.glb')],
    },
    {
        id: 'woodColorTexture',
        type: 'texture',
        path: [resolvePath('/textures/wood/wood_color_256x256.png')],
    },
    {
        id: 'woodColorTextureR',
        type: 'texture',
        path: [resolvePath('/textures/wood/wood_color_r_256x256.png')],
    },
    {
        id: 'woodNormalTexture',
        type: 'texture',
        path: [resolvePath('/textures/wood/wood_normal_256x256.png')],
    },
    {
        id: 'woodAOTexture',
        type: 'texture',
        path: [resolvePath('/textures/wood/wood_ao_256x256.png')],
    },
    {
        id: 'leafModel',
        type: 'gltfModelCompressed',
        path: [resolvePath('/models/leaf.glb')],
    },
    {
        id: 'flowerTexture1',
        type: 'texture',
        path: [resolvePath('/textures/flowers/flower_1_128x128.png')],
    },
    {
        id: 'flowerTexture2',
        type: 'texture',
        path: [resolvePath('/textures/flowers/flower_2_128x128.png')],
    },
    {
        id: 'morningPetalsMusic',
        type: 'audio',
        path: [resolvePath('/audio/musics/morning_petals.mp3')],
    },
    {
        id: 'windowLightMusic',
        type: 'audio',
        path: [resolvePath('/audio/musics/window_light.mp3')],
    },
    {
        id: 'forestDreamsMusic',
        type: 'audio',
        path: [resolvePath('/audio/musics/forest_dreams.mp3')],
    },
    {
        id: 'birds1Sound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/birds/birds_1.mp3')],
    },
    {
        id: 'birds2Sound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/birds/birds_2.mp3')],
    },
    {
        id: 'birds3Sound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/birds/birds_3.mp3')],
    },
    {
        id: 'birds4Sound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/birds/birds_4.mp3')],
    },
    {
        id: 'cricketsSound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/crickets/crickets.mp3')],
    },
    {
        id: 'fireBurningSound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/fire/fire_burning.mp3')],
    },
    {
        id: 'owlHowlingSound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/owl/owl_howling.mp3')],
    },
    {
        id: 'owlHootingSound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/owl/owl_hooting.mp3')],
    },
    {
        id: 'lakeWavesSound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/waves/lake_waves.mp3')],
    },
    {
        id: 'wolfHowlingSound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/wolf/wolf_howling.mp3')],
    },
    {
        id: 'clickSound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/ui_interactions/click.mp3')],
    },
    {
        id: 'hoverSound',
        type: 'audio',
        path: [resolvePath('/audio/sounds/ui_interactions/hover.mp3')],
    },
];

/**
 * 所有资源 - 非 qiankun 场景下使用
 */
export const ASSETS: Asset[] = [
    ...WEATHER_ASSETS,
    ...SCENE_ASSETS,
];