import MersenneTwister from 'mersennetwister';
import * as Three from 'three';


const MT_ = new MersenneTwister(7);


// ✅ 插值帧接口
interface InterpolantFrame {
    time: number;
    value: number | number[] | Three.Color;
}


// ✅ 饱和函数
function saturate(v: number): number {
    return Math.min(1, Math.max(0, v));
}


// ✅ 反向插值
function inverseLerp(a: number, b: number, v: number): number {
    return saturate((v - a) / (b - a));
}


// ✅ 重映射
function remap(a: number, b: number, c: number, d: number, v: number): number {
    return c + (d - c) * inverseLerp(a, b, v);
}


// ✅ 线性插值
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}


// ✅ 钳制
function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
}


// ✅ 随机数
function random(): number {
    return MT_.random();
}


// ✅ 基础插值器类
class Interpolant {
    private frames: InterpolantFrame[];
    protected Interpolantor: Three.LinearInterpolant;
    protected resultBuffer: Float32Array;

    constructor(frames: InterpolantFrame[], stride: number) {
        this.frames = frames;
        const times: number[] = [];
        const values: number[] = [];
        
        for (let i = 0; i < frames.length; i++) {
            times.push(frames[i].time);
            const value = frames[i].value;
            
            // 处理不同类型的值
            if (typeof value === 'number') {
                values.push(value);
            } else if (Array.isArray(value)) {
                values.push(...value);
            } else if (value instanceof Three.Color) {
                values.push(value.r, value.g, value.b);
            }
        }
        
        this.resultBuffer = new Float32Array(stride);
        this.Interpolantor = new Three.LinearInterpolant(
            new Float32Array(times),
            new Float32Array(values),
            stride,
            this.resultBuffer
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evaluate(time: number): any {
        this.Interpolantor.evaluate(time);
        return this.onEvaluate(this.resultBuffer);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected onEvaluate(result: Float32Array): any {
        return result;
    }

    public getFrames(): InterpolantFrame[] {
        return this.frames;
    }
}


// ✅ 三维向量插值器
class Vec3Interpolant extends Interpolant {
    constructor(frames: InterpolantFrame[]) {
        super(frames, 3);
    }

    protected override onEvaluate(result: Float32Array): Three.Vector3 {
        return new Three.Vector3(result[0], result[1], result[2]);
    }
}


// ✅ 浮点数插值器
class FloatInterpolant extends Interpolant {
    constructor(frames: { time: number; value: number }[]) {
        // 将单个数值转换为数组格式
        const processedFrames: InterpolantFrame[] = frames.map(frame => ({
            time: frame.time,
            value: [frame.value]
        }));
        
        super(processedFrames, 1);
    }

    protected override onEvaluate(result: Float32Array): number {
        return result[0];
    }

    toTexture(): Three.DataTexture {
        const frames = this.getFrames();
        const maxFrameTime = frames[frames.length - 1].time;

        let smallestStep = 0.5;
        for (let i = 1; i < frames.length; i++) {
            const stepSize = (frames[i].time - frames[i - 1].time) / maxFrameTime;
            smallestStep = Math.min(smallestStep, stepSize);
        }
        const recommendedSize = Math.ceil(1 / smallestStep);

        const width = recommendedSize + 1;

        const data = new Uint8Array(width * 4);

        for (let i = 0; i < width; i++) {
            const t = i / (width - 1);
            const value = this.evaluate(t * maxFrameTime);

            const byteValue = Math.max(0, Math.min(255, Math.floor(value * 255)));
            data[i * 4] = byteValue;
            data[i * 4 + 1] = byteValue;
            data[i * 4 + 2] = byteValue;
            data[i * 4 + 3] = 255;
        }

        const dt = new Three.DataTexture(
            data,
            width,
            1,
            Three.RGBAFormat,
            Three.UnsignedByteType
        );
        dt.minFilter = Three.LinearFilter;
        dt.magFilter = Three.LinearFilter;
        dt.wrapS = Three.ClampToEdgeWrapping;
        dt.wrapT = Three.ClampToEdgeWrapping;
        dt.generateMipmaps = false;
        dt.needsUpdate = true;

        return dt;
    }
}


// ✅ 颜色插值器
class ColorInterpolant extends Interpolant {
    constructor(frames: { time: number; value: Three.Color }[]) {
        // 将 Color 对象转换为 RGB 数组格式
        const processedFrames: InterpolantFrame[] = frames.map(frame => ({
            time: frame.time,
            value: [frame.value.r, frame.value.g, frame.value.b]
        }));
        
        super(processedFrames, 3);
    }

    protected override onEvaluate(result: Float32Array): Three.Color {
        return new Three.Color(result[0], result[1], result[2]);
    }

    toTexture(alphaInterpolant: FloatInterpolant): Three.DataTexture {
        const frames = this.getFrames();
        const alphaFrames = alphaInterpolant.getFrames();

        const maxFrameTime = Math.max(
            frames[frames.length - 1].time,
            alphaFrames[alphaFrames.length - 1].time
        );

        let smallestStep = 0.5;
        for (let i = 1; i < frames.length; i++) {
            const stepSize = (frames[i].time - frames[i - 1].time) / maxFrameTime;
            smallestStep = Math.min(smallestStep, stepSize);
        }
        for (let i = 1; i < alphaFrames.length; i++) {
            const stepSize =
                (alphaFrames[i].time - alphaFrames[i - 1].time) / maxFrameTime;
            smallestStep = Math.min(smallestStep, stepSize);
        }
        const recommendedSize = Math.ceil(1 / smallestStep);

        const width = recommendedSize + 1;

        const data = new Uint8Array(width * 4);

        for (let i = 0; i < width; i++) {
            const t = i / (width - 1);
            const color = this.evaluate(t * maxFrameTime);
            const alpha = alphaInterpolant.evaluate(t * maxFrameTime);

            data[i * 4] = Math.max(0, Math.min(255, Math.floor(color.r * 255)));
            data[i * 4 + 1] = Math.max(0, Math.min(255, Math.floor(color.g * 255)));
            data[i * 4 + 2] = Math.max(0, Math.min(255, Math.floor(color.b * 255)));
            data[i * 4 + 3] = Math.max(0, Math.min(255, Math.floor(alpha * 255)));
        }

        const dt = new Three.DataTexture(
            data,
            width,
            1,
            Three.RGBAFormat,
            Three.UnsignedByteType
        );
        dt.minFilter = Three.LinearFilter;
        dt.magFilter = Three.LinearFilter;
        dt.wrapS = Three.ClampToEdgeWrapping;
        dt.wrapT = Three.ClampToEdgeWrapping;
        dt.generateMipmaps = false;
        dt.needsUpdate = true;

        return dt;
    }
}


export {
    saturate,
    inverseLerp,
    clamp,
    remap,
    lerp,
    random,
    Vec3Interpolant,
    FloatInterpolant,
    ColorInterpolant,
};

export type {
    InterpolantFrame,
};
