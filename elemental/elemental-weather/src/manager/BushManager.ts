import * as Three from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

import BushVertexShader from '/@/shaders/Materials/bush/vertex.glsl';

import { random } from '/@/utils/math.ts';

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

    private scene: Three.Scene;
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

    constructor(scene: Three.Scene, { material, samplerMesh, maxLeaves = 1000 }: {material: Three.ShaderMaterial, samplerMesh: Three.Mesh, maxLeaves: number} ) {
        this.scene = scene;
        this.planeGeometry = new Three.PlaneGeometry(1, 1, 1, 1);
        this.material = material;
        this.samplerMesh = samplerMesh;
        this.maxLeaves = maxLeaves;

        this.sampler = new MeshSurfaceSampler(samplerMesh)
            .setRandomGenerator(mulberry32(12345))
            .build();

        this.instancedMesh = new Three.InstancedMesh(
            this.planeGeometry,
            material,
            maxLeaves
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

        this.instanceNormals = new Float32Array(maxLeaves * 3);
        this.instanceShadowColors = new Float32Array(maxLeaves * 3);
        this.instanceMidColors = new Float32Array(maxLeaves * 3);
        this.instanceHighlightColors = new Float32Array(maxLeaves * 3);
        this.instanceColorMultiplier = new Float32Array(maxLeaves * 3);

        this.instanceNormalAttr = null;
        this.instanceShadowColorAttr = null;
        this.instanceMidColorAttr = null;
        this.instanceHighlightColorAttr = null;
        this.instanceColorMultiplierAttr = null;

        this.scene.add(this.instancedMesh);
    }

    addBush({
                position = new Three.Vector3(0, 0.0, 0),
                leafCount = 25,
                scale = 1.0,
                randomSeed = null,
                shadowColor = new Three.Color(0.01, 0.12, 0.01),
                midColor = new Three.Color(0.0, 0.25, 0.015),
                highlightColor = new Three.Color(0.25, 0.5, 0.007),
                colorMultiplier = new Three.Color(0.73, 0.89, 0.62),
            }: BushConfig = {}) {
        if (this.currentLeafIndex + leafCount > this.maxLeaves) {
            console.warn('BushManager: Maximum leaf count exceeded');
            return null;
        }

        const startIndex = this.currentLeafIndex;
        const dummy = new Three.Object3D();
        const positionLocal = new Three.Vector3();
        const normal = new Three.Vector3();

        let sampler = this.sampler;
        if (randomSeed !== null) {
            sampler = new MeshSurfaceSampler(this.samplerMesh)
                .setRandomGenerator(mulberry32(randomSeed))
                .build();
        }

        for (let i = 0; i < leafCount; i++) {
            const instanceIndex = startIndex + i;

            sampler.sample(positionLocal, normal);

            dummy.position.copy(positionLocal).add(position);

            const s = random() * 0.5 + scale;
            dummy.scale.set(s, s, s);

            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);

            this.instanceNormals[instanceIndex * 3 + 0] = normal.x;
            this.instanceNormals[instanceIndex * 3 + 1] = normal.y;
            this.instanceNormals[instanceIndex * 3 + 2] = normal.z;

            this.instanceShadowColors[instanceIndex * 3 + 0] = shadowColor.r;
            this.instanceShadowColors[instanceIndex * 3 + 1] = shadowColor.g;
            this.instanceShadowColors[instanceIndex * 3 + 2] = shadowColor.b;

            this.instanceMidColors[instanceIndex * 3 + 0] = midColor.r;
            this.instanceMidColors[instanceIndex * 3 + 1] = midColor.g;
            this.instanceMidColors[instanceIndex * 3 + 2] = midColor.b;

            this.instanceHighlightColors[instanceIndex * 3 + 0] = highlightColor.r;
            this.instanceHighlightColors[instanceIndex * 3 + 1] = highlightColor.g;
            this.instanceHighlightColors[instanceIndex * 3 + 2] = highlightColor.b;

            this.instanceColorMultiplier[instanceIndex * 3 + 0] = colorMultiplier.r;
            this.instanceColorMultiplier[instanceIndex * 3 + 1] = colorMultiplier.g;
            this.instanceColorMultiplier[instanceIndex * 3 + 2] = colorMultiplier.b;
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

    updateMesh() {
        if (!this.instanceNormalAttr) {
            this.instanceNormalAttr = new Three.InstancedBufferAttribute(this.instanceNormals, 3);
            this.instanceShadowColorAttr = new Three.InstancedBufferAttribute(this.instanceShadowColors, 3);
            this.instanceMidColorAttr = new Three.InstancedBufferAttribute(this.instanceMidColors, 3);
            this.instanceHighlightColorAttr = new Three.InstancedBufferAttribute(this.instanceHighlightColors, 3);
            this.instanceColorMultiplierAttr = new Three.InstancedBufferAttribute(this.instanceColorMultiplier, 3);

            this.instancedMesh.geometry.setAttribute('instanceNormal', this.instanceNormalAttr);
            this.instancedMesh.geometry.setAttribute('instanceShadowColor', this.instanceShadowColorAttr);
            this.instancedMesh.geometry.setAttribute('instanceMidColor', this.instanceMidColorAttr);
            this.instancedMesh.geometry.setAttribute('instanceHighlightColor', this.instanceHighlightColorAttr);
            this.instancedMesh.geometry.setAttribute('instanceColorMultiplier', this.instanceColorMultiplierAttr);
        } else {
            this.instanceNormalAttr.needsUpdate = true;
            this.instanceShadowColorAttr.needsUpdate = true;
            this.instanceMidColorAttr.needsUpdate = true;
            this.instanceHighlightColorAttr.needsUpdate = true;
            this.instanceColorMultiplierAttr.needsUpdate = true;
        }

        this.instancedMesh.count = this.currentLeafIndex;
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    updateBushPosition(bushIndex: number, newPosition: Three.Vector3) {
        if (bushIndex >= this.bushes.length) return;

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

    removeBush(bushIndex: number) {
        if (bushIndex >= this.bushes.length) return;

        const bush = this.bushes[bushIndex];
        const dummy = new Three.Object3D();
        dummy.scale.set(0, 0, 0);

        for (let i = 0; i < bush.leafCount; i++) {
            const instanceIndex = bush.startIndex + i;
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
        
        const removedBush = this.bushes.splice(bushIndex, 1)[0];
        const removedCount = removedBush.leafCount;
        
        for (let i = bushIndex; i < this.bushes.length; i++) {
            this.bushes[i].startIndex -= removedCount;
        }
        
        this.currentLeafIndex -= removedCount;
        this.instancedMesh.count = this.currentLeafIndex;
    }

    getBushCount(): number {
        return this.bushes.length;
    }

    getTotalLeafCount(): number {
        return this.currentLeafIndex;
    }

    update() {
        if (this.instancedMesh && this.instancedMesh.customDepthMaterial) {
            (this.instancedMesh.customDepthMaterial as Three.ShaderMaterial).uniforms.uTime.value =
                this.material.uniforms.uTime.value;
        }
    }

    dispose() {
        this.scene.remove(this.instancedMesh);
        
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
