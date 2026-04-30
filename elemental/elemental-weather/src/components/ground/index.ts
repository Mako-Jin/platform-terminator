import * as Three from "three";
import ResourceManager from "/@/resources/manager";


export default class Ground {

    private scene: Three.Scene;
    private groundSize: number;
    private gridCols: number;
    private gridRows: number;
    private gridSpacing: any;
    private gridY: number;
    private group: Three.Group;
    private worldSize: number;

    private gridGeometry: Three.PlaneGeometry;
    private groundMaterial: Three.MeshStandardMaterial;

    private resourceManager: ResourceManager;

    constructor(scene: Three.Scene, {
        groundSize = 11,
        gridCols = 3,
        gridRows = 3,
        gridSpacing = null,
        gridY = 0.0,
    } = {}) {
        this.scene = scene;
        this.groundSize = groundSize;
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.gridSpacing = gridSpacing ?? this.groundSize;
        this.gridY = gridY;

        this.worldSize = this.gridCols * this.groundSize;

        this.group = new Three.Group();
        this.scene.add(this.group);

        this.resourceManager = ResourceManager.getInstance();

        this.addGrid();
    }

    private addGrid() {
        const segments = 1;
        this.gridGeometry = new Three.PlaneGeometry(
            this.groundSize,
            this.groundSize,
            segments,
            segments
        );

        this.groundMaterial = new Three.MeshStandardMaterial({
            roughness: 1.0,
            metalness: 0.0,
        });

        const biomeTexture = this.resourceManager.getItem("grassPathDensityDataTexture");
        biomeTexture.wrapS = biomeTexture.wrapT = Three.ClampToEdgeWrapping;

        const displacementTexture = this.resourceManager.getItem("displacementMap");
        displacementTexture.wrapS = displacementTexture.wrapT = Three.RepeatWrapping;
        const perlinNoise = this.resourceManager.getItem("perlinNoise");
        perlinNoise.wrapS = perlinNoise.wrapT = Three.RepeatWrapping;

        const groundRockMap = this.resourceManager.getItem("groundRockMap");
        groundRockMap.wrapS = groundRockMap.wrapT = Three.RepeatWrapping;

        const groundRockAO = this.resourceManager.getItem("groundRockAOMap");
        groundRockAO.wrapS = groundRockAO.wrapT = Three.RepeatWrapping;

        const colors = this.colorConfig[this.envTime];

        this.customGroundUniforms = {
            uDensityMap: { value: biomeTexture },
            uGroundSize: {
                value: new Three.Vector3(this.worldSize, 0, this.worldSize),
            },
            uDisplacementMap: { value: displacementTexture },
            uPerlinNoise: { value: perlinNoise },
            uGroundRockMap: { value: groundRockMap },
            uGroundRockAO: { value: groundRockAO },
            uGroundColorLight: { value: colors.uGroundColorLight.clone() },
            uGroundColorDark: { value: colors.uGroundColorDark.clone() },
            uGroundColorBelowGrass: { value: colors.uGroundColorBelowGrass.clone() },
            uRockColor: { value: colors.uRockColor.clone() },
            uHeightMap: { value: groundRockMap },
            uRockTiling: { value: 6.0 },
            uWaterShallow: { value: colors.uWaterShallow.clone() },
            uWaterDeep: { value: colors.uWaterDeep.clone() },
            uWaterDepthIntensity: { value: 1.0 },
        };

        const configureTexture = (texture, repeat = 1) => {
            texture.wrapS = texture.wrapT = Three.RepeatWrapping;
            texture.repeat.set(repeat, repeat);
            texture.minFilter = Three.LinearMipmapLinearFilter;
            texture.magFilter = Three.LinearFilter;
            texture.anisotropy =
                this.game.renderer.rendererInstance.capabilities.getMaxAnisotropy();
            texture.generateMipmaps = true;
        };

        configureTexture(displacementTexture);
        configureTexture(perlinNoise);
        configureTexture(
            groundRockMap,
            this.customGroundUniforms.uRockTiling.value
        );
        configureTexture(groundRockAO, this.customGroundUniforms.uRockTiling.value);

        this.groundMaterial.onBeforeCompile = (shader) => {
            shader.uniforms = { ...shader.uniforms, ...this.customGroundUniforms };

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                groundVertexCommonChunk
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                groundVertexBeginChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                groundFragmentCommonChunk
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                groundFragmentColorChunk
            );
        };

        const geometries = [];
        const cols = 5;
        const rows = 5;
        const spacing = this.gridSpacing;
        const startX = -((cols - 1) / 2) * spacing;
        const startZ = -((rows - 1) / 2) * spacing;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = startX + i * spacing;
                const z = startZ + j * spacing;

                let geo = this.gridGeometry.clone();
                geo.rotateX(-Math.PI / 2);
                geo.translate(x, this.gridY, z);
                geometries.push(geo);
            }
        }

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
        geometries.forEach((g) => g.dispose());
        mergedGeometry.computeVertexNormals();

        const groundMesh = new Three.Mesh(mergedGeometry, this.groundMaterial);
        groundMesh.receiveShadow = true;
        this.group.add(groundMesh);
    }

    public update() {

    }

}
