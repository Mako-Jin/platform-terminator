import * as Three from 'three';
import {LoggerFactory} from "common-tools";
import {SceneWrapper} from "common-three";

/**
 * 地面组件 - 根据区域规划使用不同纹理
 * 区域规划：
 * - 中心区域（城内）：石块路面 (StonePavement)
 * - 主干道区域（城外）：石子路 (GravelDirt)
 * - 外围区域：泥土纹理 (ColorfulBrickPavement)
 */
export class Ground {

    private logger = LoggerFactory.create("elemental-city-wall-ground");

    private scene: SceneWrapper;

    private groundMeshes: Three.Mesh[] = [];

    // 纹理加载器
    private textureLoader = new Three.TextureLoader();

    // 纹理路径配置
    private texturePaths = {
        muddy: 'textures/floor/Muddy/1k/',
        stonePavement: 'textures/floor/StonePavement/1k/',
        gravelDirt: 'textures/floor/GravelDirt/1k/',
        brickPavement: 'textures/floor/ColorfulBrickPavement/1k/',
        irregularStone: 'textures/floor/IrregularStonePavement/1k/'
    };

    // 纹理重复配置（根据地面尺寸自动计算合适的重复次数）
    private textureRepeat = {
        muddy: 50,           // 外围区域纹理重复次数
        stonePavement: 3,    // 城内区域纹理重复次数
        gravelDirt: 400,       // 主干道纹理重复次数
        brickPavement: 10,   // 砖块路面纹理重复次数
        irregularStone: 6    // 不规则石块纹理重复次数
    };

    // 区域尺寸配置（单位：米）
    private dimensions = {
        innerCity: {
            width: 100,
            height: 100
        },      // 城内区域（正方形边长）
        mainRoad: 10,        // 主干道宽度
        outerArea: 2000       // 外围区域（总宽度）
    };

    constructor(scene: SceneWrapper) {
        this.scene = scene;
        this.createZonedGround();
        this.logger.info('地面组件初始化完成 - 区域规划已创建');
    }

    /**
     * 创建分区地面
     */
    private createZonedGround(): void {
        // 1. 创建外围泥土区域（最底层）
        this.createOuterDirtArea();

        // 2. 创建主干道石子路区域
        this.createMainRoadArea();

        // 3. 创建城内石块路面区域（最顶层）
        this.createInnerCityArea();
    }

    /**
     * 创建外围泥土区域
     */
    private createOuterDirtArea(): void {
        const size = this.dimensions.outerArea;
        const geometry = new Three.PlaneGeometry(size, size);
        const material = this.loadPBRMaterial(this.texturePaths.muddy);
        const mesh = new Three.Mesh(geometry, material);
        mesh.rotation.x = - Math.PI / 2;

        this.scene.addObject(mesh);
        this.groundMeshes.push(mesh);
        this.logger.debug('外围泥土区域已创建');
    }

    /**
     * 创建主干道石子路区域
     */
    private createMainRoadArea(): void {
        const roadWidth = this.dimensions.mainRoad;  // 主干道宽度为10米
        const roadLength = this.dimensions.outerArea;  // 长度与外围区域相同

        // 创建水平道路（X轴方向）
        const horizontalGeometry = new Three.PlaneGeometry(roadLength, roadWidth);
        // 主干道是长条形，长度方向重复80次，宽度方向重复2次
        const horizontalMaterial = this.loadPBRMaterial(this.texturePaths.gravelDirt, this.textureRepeat.gravelDirt, 2);
        const horizontalRoad = new Three.Mesh(horizontalGeometry, horizontalMaterial);
        horizontalRoad.rotation.x = -Math.PI / 2;
        horizontalRoad.position.y = 0.005;  // 在泥土路之上
        horizontalRoad.receiveShadow = true;

        // 创建垂直道路（Z轴方向）
        const verticalGeometry = new Three.PlaneGeometry(roadWidth, roadLength);
        // 主干道是长条形，宽度方向重复2次，长度方向重复80次
        const verticalMaterial = this.loadPBRMaterial(this.texturePaths.gravelDirt, 2, this.textureRepeat.gravelDirt);
        const verticalRoad = new Three.Mesh(verticalGeometry, verticalMaterial);
        verticalRoad.rotation.x = -Math.PI / 2;
        verticalRoad.position.y = 0.005;  // 在泥土路之上
        verticalRoad.receiveShadow = true;
        this.scene.addObject(horizontalRoad);
        this.scene.addObject(verticalRoad);
        this.groundMeshes.push(horizontalRoad);
        this.groundMeshes.push(verticalRoad);
        this.logger.debug('主干道十字路区域已创建');
    }

    /**
     * 创建城内石块路面区域
     */
    private createInnerCityArea(): void {
        const {width, height} = this.dimensions.innerCity;
        const geometry = new Three.PlaneGeometry(width, height);
        const material = this.loadPBRMaterial(this.texturePaths.irregularStone);

        const mesh = new Three.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, 0.01, 0);
        mesh.receiveShadow = true;

        this.scene.addObject(mesh);
        this.groundMeshes.push(mesh);
        this.logger.debug('城内石块路面区域已创建');
    }

    /**
     * 加载PBR材质（需要场景中有光源才能显示）
     * @param basePath 纹理基础路径
     * @param repeatX X方向重复次数
     * @param repeatY Y方向重复次数
     */
    private loadPBRMaterial(basePath: string, repeatX?: number, repeatY?: number): Three.MeshStandardMaterial {
        const textureLoader = this.textureLoader;

        // 设置纹理路径（处理不同的Albedo命名）
        const hasMetallic = basePath.includes('GravelDirt');

        // 根据路径获取对应的重复次数配置
        let repeatSX = repeatX || 4;
        let repeatSY = repeatY || repeatX || 4;
        if (!repeatX && !repeatY) {
            for (const [key, value] of Object.entries(this.texturePaths)) {
                if (basePath === value) {
                    repeatSX = this.textureRepeat[key as keyof typeof this.textureRepeat] || 4;
                    repeatSY = repeatSX;
                    break;
                }
            }
        }

        const map = textureLoader.load(`${basePath}Albedo.jpg`);
        const normalMap = textureLoader.load(`${basePath}Normal.jpg`);
        const roughnessMap = textureLoader.load(`${basePath}Roughness.jpg`);
        const aoMap = textureLoader.load(`${basePath}AO.jpg`);

        // 设置纹理属性
        [map, normalMap, roughnessMap, aoMap].forEach(texture => {
            texture.wrapS = Three.RepeatWrapping;
            texture.wrapT = Three.RepeatWrapping;
            texture.repeat.set(repeatSX, repeatSY);  // 设置X和Y方向的重复次数
        });

        const material = new Three.MeshStandardMaterial({
            map,
            normalMap,
            roughnessMap,
            aoMap,
            roughness: 0.8,
            metalness: hasMetallic ? 0.1 : 0.2,
            side: Three.DoubleSide
        });

        // 如果有金属度贴图则加载
        if (hasMetallic) {
            const metallicMap = textureLoader.load(`${basePath}Metallic.jpg`);
            metallicMap.wrapS = Three.RepeatWrapping;
            metallicMap.wrapT = Three.RepeatWrapping;
            metallicMap.repeat.set(4, 4);
            material.metalnessMap = metallicMap;
        }

        return material;
    }

    /**
     * 切换到PBR材质模式（需要场景中有光源）
     */
    enablePBR() {
        // 逐个替换为PBR材质
        const materials = [
            this.loadPBRMaterial(this.texturePaths.brickPavement),
            this.loadPBRMaterial(this.texturePaths.gravelDirt),
            this.loadPBRMaterial(this.texturePaths.stonePavement)
        ];

        this.groundMeshes.forEach((mesh, index) => {
            if (mesh.material instanceof Three.Material) {
                mesh.material.dispose();
            }
            mesh.material = materials[index];
        });
        this.logger.info('已切换到PBR材质模式');
    }

    /**
     * 销毁组件
     */
    dispose() {
        this.groundMeshes.forEach(mesh => {
            mesh.geometry.dispose();
            if (mesh.material instanceof Three.Material) {
                mesh.material.dispose();
            }
            this.scene.removeObject(mesh);
        });
        this.groundMeshes = [];
        this.logger.info('地面组件已销毁');
    }
}

export default Ground;