import * as Three from 'three';
import {MeshSurfaceSampler} from 'three/addons/math/MeshSurfaceSampler.js';
import type {SceneWrapper} from "common-three";

import BushVertexShader from '/@/shaders/Materials/bush/vertex.glsl';

import {random} from '/@/utils';
import {LoggerFactory} from "common-tools";

const mulberry32 = (seed: number) => {
    return function (): number {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

interface BushConfig {
    position?: Three.Vector3;
    leafCount?: number;
    scale?: number;
    randomSeed?: number | null;
    shadowColor?: Three.Color;
    midColor?: Three.Color;
    highlightColor?: Three.Color;
    colorMultiplier?: Three.Color;
}

interface BushInfo {
    position: Three.Vector3;
    startIndex: number;
    leafCount: number;
    scale: number;
    shadowColor: Three.Color;
    midColor: Three.Color;
    highlightColor: Three.Color;
}

export default class BushManager {

    private logger = LoggerFactory.create("weather-bush-manager");

    private scene: SceneWrapper;
    private planeGeometry: Three.PlaneGeometry;
    private material: Three.ShaderMaterial;
    private samplerMesh: Three.Mesh;
    private maxLeaves: number;
    private sampler: MeshSurfaceSampler;
    private instancedMesh: Three.InstancedMesh;
    private currentLeafIndex: number;
    private bushes: BushInfo[];
    private instanceNormals: Float32Array;
    private instanceShadowColors: Float32Array;
    private instanceMidColors: Float32Array;
    private instanceHighlightColors: Float32Array;
    private instanceColorMultiplier: Float32Array;
    private instanceNormalAttr: Three.InstancedBufferAttribute | null;
    private instanceShadowColorAttr: Three.InstancedBufferAttribute | null;
    private instanceMidColorAttr: Three.InstancedBufferAttribute | null;
    private instanceHighlightColorAttr: Three.InstancedBufferAttribute | null;
    private instanceColorMultiplierAttr: Three.InstancedBufferAttribute | null;

    constructor(
        scene: SceneWrapper,
        options: {
            material: Three.ShaderMaterial;
            samplerMesh: Three.Mesh;
            maxLeaves?: number;
        } = {
            material: undefined,
            samplerMesh: undefined,
            maxLeaves: 1000
        }
    ) {
        this.scene = scene;

        this.planeGeometry = new Three.PlaneGeometry(1, 1, 1, 1);
        this.material = options.material;
        this.samplerMesh = options.samplerMesh;
        this.maxLeaves = options.maxLeaves ?? 1000;

        this.sampler = new MeshSurfaceSampler(this.samplerMesh)
            // .setRandomGenerator(mulberry32(12345))
            .build();

        this.instancedMesh = new Three.InstancedMesh(
            this.planeGeometry,
            this.material,
            this.maxLeaves
        );

        const depthUniforms = Three.UniformsUtils.clone(this.material.uniforms);
        const depthFragment = `#include <packing>
            varying vec2 vUv;
            uniform sampler2D uAlphaMap;
            void main() {
                  float a = texture2D(uAlphaMap, vUv).a;
                  if (a < 0.8) discard;
                  gl_FragColor = packDepthToRGBA( gl_FragCoord.z );
            }
        `;
        const depthMaterial = new Three.ShaderMaterial({
            vertexShader: BushVertexShader,
            fragmentShader: depthFragment,
            uniforms: depthUniforms,
            defines: { USE_INSTANCING: '' },
            side: Three.DoubleSide,
        });
        this.instancedMesh.customDepthMaterial = depthMaterial;
        this.instancedMesh.customDistanceMaterial = depthMaterial;

        this.instancedMesh.castShadow = true;
        this.instancedMesh.receiveShadow = true;

        this.currentLeafIndex = 0;
        this.bushes = [];

        this.instanceNormals = new Float32Array(this.maxLeaves * 3);
        this.instanceShadowColors = new Float32Array(this.maxLeaves * 3);
        this.instanceMidColors = new Float32Array(this.maxLeaves * 3);
        this.instanceHighlightColors = new Float32Array(this.maxLeaves * 3);
        this.instanceColorMultiplier = new Float32Array(this.maxLeaves * 3);

        this.scene.addObject(this.instancedMesh);
    }

    addBush(config: BushConfig = {}): BushInfo | null {
        const {
            position = new Three.Vector3(0, 0.0, 0),
            leafCount = 25,
            scale = 1.0,
            randomSeed = null,
            shadowColor = new Three.Color(0.01, 0.12, 0.01),
            midColor = new Three.Color(0.0, 0.25, 0.015),
            highlightColor = new Three.Color(0.25, 0.5, 0.007),
            colorMultiplier = new Three.Color(0.73, 0.89, 0.62),
        } = config;

        if (this.currentLeafIndex + leafCount > this.maxLeaves) {
            this.logger.warn('[BushManager] Maximum leaf count exceeded');
            return null;
        }

        const startIndex = this.currentLeafIndex;
        const dummy = new Three.Object3D();
        const positionLocal = new Three.Vector3();
        const normal = new Three.Vector3();

        let sampler = this.sampler;
        if (randomSeed !== null) {
            sampler = new MeshSurfaceSampler(this.samplerMesh)
                // .setRandomGenerator(mulberry32(randomSeed))
                .build();
        }

        for (let i = 0; i < leafCount; i++) {
            const instanceIndex = startIndex + i;
            const baseIndex = instanceIndex * 3;

            sampler.sample(positionLocal, normal);

            dummy.position.copy(positionLocal).add(position);

            const s = random() * 0.5 + scale;
            dummy.scale.set(s, s, s);

            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);

            this.instanceNormals[baseIndex] = normal.x;
            this.instanceNormals[baseIndex + 1] = normal.y;
            this.instanceNormals[baseIndex + 2] = normal.z;

            this.instanceShadowColors[baseIndex] = shadowColor.r;
            this.instanceShadowColors[baseIndex + 1] = shadowColor.g;
            this.instanceShadowColors[baseIndex + 2] = shadowColor.b;

            this.instanceMidColors[baseIndex] = midColor.r;
            this.instanceMidColors[baseIndex + 1] = midColor.g;
            this.instanceMidColors[baseIndex + 2] = midColor.b;

            this.instanceHighlightColors[baseIndex] = highlightColor.r;
            this.instanceHighlightColors[baseIndex + 1] = highlightColor.g;
            this.instanceHighlightColors[baseIndex + 2] = highlightColor.b;

            this.instanceColorMultiplier[baseIndex] = colorMultiplier.r;
            this.instanceColorMultiplier[baseIndex + 1] = colorMultiplier.g;
            this.instanceColorMultiplier[baseIndex + 2] = colorMultiplier.b;
        }

        const bush: BushInfo = {
            position: position.clone(),
            startIndex,
            leafCount,
            scale,
            shadowColor: shadowColor.clone(),
            midColor: midColor.clone(),
            highlightColor: highlightColor.clone(),
        };
        this.bushes.push(bush);
        this.currentLeafIndex += leafCount;

        this.updateMesh();

        return bush;
    }

    updateMesh(): void {
        this.instancedMesh.geometry.setAttribute(
            'instanceNormal',
            new Three.InstancedBufferAttribute(this.instanceNormals, 3)
        );
        this.instancedMesh.geometry.setAttribute(
            'instanceShadowColor',
            new Three.InstancedBufferAttribute(this.instanceShadowColors, 3)
        );
        this.instancedMesh.geometry.setAttribute(
            'instanceMidColor',
            new Three.InstancedBufferAttribute(this.instanceMidColors, 3)
        );
        this.instancedMesh.geometry.setAttribute(
            'instanceHighlightColor',
            new Three.InstancedBufferAttribute(this.instanceHighlightColors, 3)
        );
        this.instancedMesh.geometry.setAttribute(
            'instanceColorMultiplier',
            new Three.InstancedBufferAttribute(this.instanceColorMultiplier, 3)
        );

        this.instancedMesh.count = this.currentLeafIndex;
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    updateBushPosition(bushIndex: number, newPosition: Three.Vector3): void {
        if (bushIndex >= this.bushes.length) {
            return;
        }

        const bush = this.bushes[bushIndex];
        const offset = new Three.Vector3().subVectors(newPosition, bush.position);

        const dummy = new Three.Object3D();
        const matrix = new Three.Matrix4();

        for (let i = 0; i < bush.leafCount; i++) {
            const instanceIndex = bush.startIndex + i;

            this.instancedMesh.getMatrixAt(instanceIndex, matrix);
            dummy.position.setFromMatrixPosition(matrix);
            dummy.position.add(offset);

            const scale = new Three.Vector3();
            matrix.decompose(new Three.Vector3(), new Three.Quaternion(), scale);
            dummy.scale.copy(scale);

            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
        }

        bush.position.copy(newPosition);
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    removeBush(bushIndex: number): void {
        if (bushIndex >= this.bushes.length) {
            return;
        }

        const bush = this.bushes[bushIndex];
        const dummy = new Three.Object3D();
        dummy.scale.set(0, 0, 0);

        for (let i = 0; i < bush.leafCount; i++) {
            const instanceIndex = bush.startIndex + i;
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;

        this.bushes.splice(bushIndex, 1);
    }

    getBushCount(): number {
        return this.bushes.length;
    }

    getTotalLeafCount(): number {
        return this.currentLeafIndex;
    }

    update(): void {
        if (this.instancedMesh && this.instancedMesh.customDepthMaterial) {
            (this.instancedMesh.customDepthMaterial as Three.ShaderMaterial).uniforms.uTime.value =
                this.material.uniforms.uTime.value;
        }
    }

    dispose(): void {
        this.scene.removeObject(this.instancedMesh);

        if (this.instancedMesh.geometry) {
            this.instancedMesh.geometry.dispose();
        }

        if (this.instancedMesh.customDepthMaterial) {
            this.instancedMesh.customDepthMaterial.dispose();
        }

        if (this.instancedMesh.customDistanceMaterial) {
            this.instancedMesh.customDistanceMaterial.dispose();
        }

        this.bushes = [];
        this.currentLeafIndex = 0;

        this.instanceNormalAttr = null;
        this.instanceShadowColorAttr = null;
        this.instanceMidColorAttr = null;
        this.instanceHighlightColorAttr = null;
        this.instanceColorMultiplierAttr = null;
    }
}
