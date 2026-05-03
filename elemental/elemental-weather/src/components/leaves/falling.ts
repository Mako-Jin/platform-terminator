import * as Three from 'three';
import ResourcesManager from "/@/resources/manager.ts";
import SeasonManager from "/@/manager/SeasonManager.ts";
import ColorManager from "/@/manager/ColorManager.ts";


export class FallingLeavesSystem {
    private count: number;
    private scene: Three.Scene;
    private bounds: any;
    private seasonManager: SeasonManager;
    private colorManager: ColorManager;
    private material: Three.MeshStandardMaterial;
    private mesh: Three.InstancedMesh;
    private dummy: Three.Object3D;
    private particles: Array<{
        pos: Three.Vector3;
        vel: Three.Vector3;
        rot: Three.Euler;
        rotSpeed: Three.Vector3;
        scale: number;
    }>;
    
    constructor(scene: Three.Scene, geometry: Three.BufferGeometry, bounds: any) {
        this.count = 35;
        this.scene = scene;
        this.bounds = bounds;
        this.seasonManager = SeasonManager.getInstance();
        this.colorManager = ColorManager.getInstance();

        const leafColor = this.getFallingLeavesColor();
        console.log('[FallingLeavesSystem] Initial leaf color:', leafColor);
        
        this.material = new Three.MeshStandardMaterial({
            color: leafColor,
        });

        this.mesh = new Three.InstancedMesh(geometry, this.material, this.count);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        this.dummy = new Three.Object3D();
        this.particles = [];

        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                pos: new Three.Vector3(),
                vel: new Three.Vector3(),
                rot: new Three.Euler(),
                rotSpeed: new Three.Vector3(),
                scale: 1,
            });
            this.respawn(this.particles[i]);
            this.particles[i].pos.y =
                Math.random() * (bounds.yMax - bounds.yMin) + bounds.yMin;
        }

        this.seasonManager.onSeasonChange((data) => {
            this.onSeasonChanged(data.season, data.previousSeason);
        });
    }

    private getFallingLeavesColor(): Three.Color {
        const currentSeason = this.seasonManager.season;
        const seasonConfig = this.seasonManager.getSeasonConfig(currentSeason);
        
        console.log('[FallingLeavesSystem] Getting color for season:', currentSeason);
        console.log('[FallingLeavesSystem] Season config:', seasonConfig);
        
        if (seasonConfig?.fallingLeaves) {
            const fallingLeavesConfig = seasonConfig.fallingLeaves as any;
            console.log('[FallingLeavesSystem] FallingLeaves config:', fallingLeavesConfig);
            
            if (fallingLeavesConfig.color) {
                const colorValue = fallingLeavesConfig.color;
                console.log('[FallingLeavesSystem] Color value:', colorValue, 'Type:', typeof colorValue);
                
                if (colorValue instanceof Three.Color) {
                    console.log('[FallingLeavesSystem] Returning Three.Color');
                    return colorValue;
                } else if (Array.isArray(colorValue) && colorValue.length === 3) {
                    console.log('[FallingLeavesSystem] Creating color from array:', colorValue);
                    return new Three.Color(colorValue[0], colorValue[1], colorValue[2]);
                }
            }
        }
        
        console.log('[FallingLeavesSystem] Using default color');
        return new Three.Color(1.0, 0.388, 0.278);
    }

    onSeasonChanged(newSeason: string, oldSeason: string) {
        const leafColor = this.getFallingLeavesColor();
        this.material.color.copy(leafColor);
    }

    respawn(p: {
        pos: Three.Vector3;
        vel: Three.Vector3;
        rot: Three.Euler;
        rotSpeed: Three.Vector3;
        scale: number;
    }) {
        p.pos.x = this.bounds.originX + (Math.random() - 0.5) * this.bounds.xRange;
        p.pos.y = this.bounds.yMax - Math.random();
        p.pos.z = this.bounds.originZ + (Math.random() - 0.5) * this.bounds.zRange;

        p.vel.set(
            (Math.random() - 0.2) * 0.05,
            -(Math.random() * 0.01 + 0.02),
            (Math.random() - 0.7) * 0.05
        );

        p.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        p.rotSpeed.set(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );

        p.scale = 0.0;
    }

    update(dt: number) {
        const cappedDt = Math.min(dt, 0.1);
        for (let i = 0; i < this.count; i++) {
            const p = this.particles[i];

            p.pos.add(p.vel);
            p.rot.x += p.rotSpeed.x;
            p.rot.y += p.rotSpeed.y;
            p.rot.z += p.rotSpeed.z;

            if (p.scale < 0.8) {
                p.scale = Three.MathUtils.lerp(
                    p.scale,
                    0.8,
                    Math.min(cappedDt * 2.0, 1.0)
                );
            }

            p.pos.z -= Math.sin(p.pos.y) * 0.001;

            this.dummy.position.copy(p.pos);
            this.dummy.rotation.copy(p.rot);
            const s = p.scale;
            this.dummy.scale.set(s, s, s);
            this.dummy.updateMatrix();

            this.mesh.setMatrixAt(i, this.dummy.matrix);

            if (p.pos.y < 0.0) {
                this.respawn(p);
            }
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
}


export default class FallingLeaves {
    
    private resourcesManager: ResourcesManager;
    private fallingLeavesSystemOne: FallingLeavesSystem;
    private fallingLeavesSystemTwo: FallingLeavesSystem;
    
    constructor(scene: Three.Scene) {
        
        this.resourcesManager = ResourcesManager.getInstance();
        
        const leafModelData = this.resourcesManager.getItem<any>("leafModel");
        if (!leafModelData) {
            console.error('[FallingLeaves] leafModel not found in ResourcesManager');
            return;
        }
        
        const leafGeometry = leafModelData.scene.children[0].geometry;
        const tree1Bounds = {
            yMin: 1.0,
            yMax: 7.5,
            xRange: 6.0,
            zRange: -2.0,
            originX: -4.0,
            originZ: 10,
        };
        const tree2Bounds = {
            yMin: 1.0,
            yMax: 7.5,
            xRange: 6.0,
            zRange: -1.0,
            originX: 4.0,
            originZ: -10,
        };
        this.fallingLeavesSystemOne = new FallingLeavesSystem(
            scene,
            leafGeometry.clone(),
            tree1Bounds
        );
        this.fallingLeavesSystemTwo = new FallingLeavesSystem(
            scene,
            leafGeometry.clone(),
            tree2Bounds
        );
    }

    update(delta: number) {
        this.fallingLeavesSystemOne?.update(delta);
        this.fallingLeavesSystemTwo?.update(delta);
    }
}
