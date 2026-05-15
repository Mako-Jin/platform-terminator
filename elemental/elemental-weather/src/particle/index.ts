import * as Three from 'three';
import { random } from '/@/utils';

const GRAVITY = new Three.Vector3(0, -0.09, 0);
const DRAG = -0.5;

// ✅ 粒子类
export class Particle {
  position: Three.Vector3;
  velocity: Three.Vector3;
  life: number;
  maxLife: number;
  id: number;
  attachedEmitter: Emitter | null;
  attachedShape: EmitterShape | null;

  constructor() {
    this.position = new Three.Vector3(0, 0, 0);
    this.velocity = new Three.Vector3();
    this.life = 0;
    this.maxLife = 5;
    this.id = 0;
    this.attachedEmitter = null;
    this.attachedShape = null;
  }

  reset(): void {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.life = 0;
    this.maxLife = 5;
    this.attachedEmitter = null;
    this.attachedShape = null;
  }
}

// ✅ 基础发射器形状类
export class EmitterShape {
  emit(particle: Particle): void {
    particle.position.set(0, 0, 0);
  }
}


// ✅ 点形状类
export class PointShape extends EmitterShape {
  position: Three.Vector3;
  positionRadiusVariance: number;
  tempVec: Three.Vector3;

  constructor() {
    super();
    this.position = new Three.Vector3();
    this.positionRadiusVariance = 0;
    this.tempVec = new Three.Vector3();
  }

  emit(particle: Particle): void {
    particle.position.copy(this.position);

    if (this.positionRadiusVariance > 0) {
      const phi = random() * Math.PI * 2;
      const theta = random() * Math.PI;
      const radius = random() * this.positionRadiusVariance;

      this.tempVec.set(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi)
      );
      this.tempVec.multiplyScalar(radius);
      particle.position.add(this.tempVec);
    }
  }
}

// ✅ 粒子渲染器参数类
export class ParticleRendererParams {
    maxParticles = 100;
    group = new Three.Group();

    constructor() {}
}

// ✅ 粒子渲染器类
export class ParticleRenderer {
  particlesGeometry: Three.BufferGeometry | null;
  particleMesh: Three.Points | null;
  material: Three.ShaderMaterial | Three.Material | null;
  lastParticleCount: number;

  constructor() {
    this.particlesGeometry = null;
    this.particleMesh = null;
    this.material = null;
    this.lastParticleCount = 0;
  }

  dispose(): void {
    if (this.particleMesh) {
      this.particleMesh.removeFromParent();
      this.particleMesh = null;
    }

    if (this.particlesGeometry) {
      this.particlesGeometry.dispose();
      this.particlesGeometry = null;
    }

    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }

  initialize(material: Three.ShaderMaterial | Three.Material, params: ParticleRendererParams): void {
    this.particlesGeometry = new Three.BufferGeometry();

    const positions = new Float32Array(params.maxParticles * 3);
    const particleData = new Float32Array(params.maxParticles * 2);

    this.particlesGeometry.setAttribute(
      'position',
      new Three.Float32BufferAttribute(positions, 3)
    );
    this.particlesGeometry.setAttribute(
      'particleData',
      new Three.Float32BufferAttribute(particleData, 2)
    );

    const positionAttr = this.particlesGeometry.attributes.position as Three.BufferAttribute;
    const particleDataAttr = this.particlesGeometry.attributes.particleData as Three.BufferAttribute;
    positionAttr.setUsage(Three.DynamicDrawUsage);
    particleDataAttr.setUsage(Three.DynamicDrawUsage);
    this.particlesGeometry.boundingSphere = new Three.Sphere(new Three.Vector3(), 1000);

    this.particleMesh = new Three.Points(this.particlesGeometry, material);
    this.material = material;

    params.group.add(this.particleMesh);
  }

  updateFromParticles(particles: Particle[], totalTimeElapsed: number): void {
    if (!this.particleMesh || !this.particlesGeometry) {
      return;
    }

    if (this.material) {
      (this.material as Three.ShaderMaterial).uniforms.uTime.value = totalTimeElapsed;
    }

    const positions = this.particlesGeometry.attributes.position.array as Float32Array<number>;
    const particleData = this.particlesGeometry.attributes.particleData.array as Float32Array<number>;
    const count = particles.length;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const i3 = i * 3;
      const i2 = i * 2;

      positions[i3] = p.position.x;
      positions[i3 + 1] = p.position.y;
      positions[i3 + 2] = p.position.z;

      particleData[i2] = p.life / p.maxLife;
      particleData[i2 + 1] = p.id;
    }

    this.particlesGeometry.attributes.position.needsUpdate = true;
    this.particlesGeometry.attributes.particleData.needsUpdate = true;

    if (count !== this.lastParticleCount) {
      this.particlesGeometry.setDrawRange(0, count);
      this.particlesGeometry.computeBoundingSphere();
      this.lastParticleCount = count;
    }
  }
}

export type OnParticleCallback = (particle: Particle) => void;

// ✅ 发射器参数类
export class EmitterParams {
  maxLife: number = 5;
  velocityMagnitude: number = 0;
  velocityMagnitudeVariance: number = 0;
  rotation: Three.Quaternion = new Three.Quaternion();
  rotationAngularVariance: number = 0;

  maxParticles: number = 100;
  maxEmission: number = 100;
  emissionRate: number = 1;
  gravity: boolean = false;
  gravityStrength: number = 1;
  dragCoefficient: number = DRAG;
  renderer: ParticleRenderer | null = null;
  shape: EmitterShape = new PointShape();

  // ✅ 烟雾旋转参数
  swirlX: number = 0;
  swirlZ: number = 0;

  onCreated: ((particle: Particle) => void) | null = null;
  onUpdate: ((particle: Particle) => void) | null = null;
  onDestroy: ((particle: Particle) => void) | null = null;

  constructor() {}
}

// ✅ 发射器类
export class Emitter {
  particles: Particle[];
  particlePool: Particle[];
  emissionTime: number;
  numParticlesEmitted: number;
  params: EmitterParams;
  dead: boolean;
  tempVec: Three.Vector3;
  hasOnCreated: boolean;
  hasOnUpdate: boolean;
  hasOnDestroy: boolean;
  secondsPerParticle: number;

  constructor(params: EmitterParams) {
    this.params = params;
    this.particles = [];
    this.particlePool = [];
    this.emissionTime = 0;
    this.numParticlesEmitted = 0;
    this.dead = false;
    this.tempVec = new Three.Vector3();

    this.hasOnCreated = typeof params.onCreated === 'function';
    this.hasOnUpdate = typeof params.onUpdate === 'function';
    this.hasOnDestroy = typeof params.onDestroy === 'function';

    this.secondsPerParticle = 1 / params.emissionRate;

    for (let i = 0; i < params.maxParticles; i++) {
      const p = new Particle();
      p.id = random();
      this.particlePool.push(p);
    }
  }

  dispose(): void {
    if (this.params.onDestroy) {
      for (let i = 0; i < this.particles.length; ++i) {
        this.params.onDestroy(this.particles[i]);
      }
    }
    this.particles = [];
    this.particlePool = [];

    if (this.params.renderer) {
      this.params.renderer.dispose();
    }
  }

  get StillActive(): boolean {
    if (this.dead) {
      return false;
    }

    return (
      this.numParticlesEmitted < this.params.maxEmission ||
      this.particles.length > 0
    );
  }

  stop(): void {
    this.params.maxEmission = 0;
  }

  kill(): void {
    this.dead = true;
  }

  acquireParticle(): Particle {
    return this.particlePool.pop() || new Particle();
  }

  releaseParticle(particle: Particle): void {
    particle.reset();
    this.particlePool.push(particle);
  }

  canCreateParticle(): boolean {
    if (this.dead) {
      return false;
    }

    return (
      this.emissionTime >= this.secondsPerParticle &&
      this.particles.length < this.params.maxParticles &&
      this.numParticlesEmitted < this.params.maxEmission
    );
  }

  emitParticle(): Particle {
    const p = this.acquireParticle();
    if (p.id === 0) {
      p.id = random();
    }

    this.params.shape.emit(p);
    p.maxLife = this.params.maxLife;

    const phi = random() * 2 * Math.PI;
    const theta = random() * this.params.rotationAngularVariance;

    p.velocity.set(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    );

    const velocity =
      this.params.velocityMagnitude +
      (random() * 2 - 1) * this.params.velocityMagnitudeVariance;
    p.velocity.multiplyScalar(velocity);
    p.velocity.applyQuaternion(this.params.rotation);

    if (this.hasOnCreated) {
      this.params.onCreated!(p);
    }

    return p;
  }

  updateEmission(elapsedTime: number): void {
    if (this.dead) {
      return;
    }

    this.emissionTime += elapsedTime;

    while (this.canCreateParticle()) {
      this.emissionTime -= this.secondsPerParticle;
      this.numParticlesEmitted++;
      const particle = this.emitParticle();
      this.particles.push(particle);
    }
  }

  updateParticle(p: Particle, elapsedTime: number): void {
    p.life += elapsedTime;
    p.life = Math.min(p.life, p.maxLife);

    if (this.params.gravity) {
      this.tempVec.copy(GRAVITY);
    } else {
      this.tempVec.set(0, 0, 0);
    }

    this.tempVec.addScaledVector(p.velocity, -this.params.dragCoefficient);
    this.tempVec.multiplyScalar(this.params.gravityStrength);
    p.velocity.addScaledVector(this.tempVec, elapsedTime);
    p.position.addScaledVector(p.velocity, elapsedTime);

    if (this.hasOnUpdate) {
      this.params.onUpdate!(p);
    }

    if (p.life >= p.maxLife && this.hasOnDestroy) {
      this.params.onDestroy!(p);
    }
  }

  updateParticles(elapsedTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      this.updateParticle(p, elapsedTime);

      if (p.life >= p.maxLife) {
        this.releaseParticle(p);
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  update(elapsedTime: number, totalTimeElapsed: number): void {
    this.updateEmission(elapsedTime);
    this.updateParticles(elapsedTime);

    if (this.params.renderer) {
      this.params.renderer.updateFromParticles(this.particles, totalTimeElapsed);
    }
  }
}

// ✅ 粒子系统类
export class ParticleSystem {
  private emitters: Emitter[];

  constructor() {
    this.emitters = [];
  }

  dispose(): void {
    for (let i = 0; i < this.emitters.length; i++) {
      this.emitters[i].dispose();
    }
  }

  get StillActive(): boolean {
    for (let i = 0; i < this.emitters.length; i++) {
      if (this.emitters[i].StillActive) {
        return true;
      }
    }
    return false;
  }

  addEmitter(emitter: Emitter): void {
    this.emitters.push(emitter);
  }

  update(elapsedTime: number, totalTimeElapsed: number): void {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];

      if (!e.StillActive) {
        e.dispose();
        this.emitters[i] = this.emitters[this.emitters.length - 1];
        this.emitters.pop();
      } else {
        e.update(elapsedTime, totalTimeElapsed);
      }
    }
  }
}
