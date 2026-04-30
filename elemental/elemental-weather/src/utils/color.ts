import * as Three from 'three';

export type ColorInput = Three.Color | [number, number, number] | number;

export type ConfigValue =
  | number
  | [number, number, number]
  | Three.Color
  | ConfigObject
  | any;

export interface ConfigObject {
  [key: string]: ConfigValue;
}

/**
 * 颜色插值器 - 支持多种颜色格式的线性插值
 */
export default class ColorInterpolator {
  /**
   * 线性插值两个颜色值
   * @param color1 - 起始颜色
   * @param color2 - 结束颜色
   * @param t - 插值因子 (0-1)
   * @returns 插值后的 Three.Color
   */
  static lerpColor(color1: ColorInput, color2: ColorInput, t: number): Three.Color {
    const c1 = this.toColor(color1);
    const c2 = this.toColor(color2);

    return new Three.Color(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t
    );
  }

  /**
   * 线性插值两个颜色数组
   * @param arr1 - 起始颜色数组 [r, g, b]
   * @param arr2 - 结束颜色数组 [r, g, b]
   * @param t - 插值因子 (0-1)
   * @returns 插值后的颜色数组 [r, g, b]
   */
  static lerpArray(arr1: [number, number, number], arr2: [number, number, number], t: number): [number, number, number] {
    return [
      arr1[0] + (arr2[0] - arr1[0]) * t,
      arr1[1] + (arr2[1] - arr1[1]) * t,
      arr1[2] + (arr2[2] - arr1[2]) * t,
    ];
  }

  /**
   * 线性插值两个数值
   * @param val1 - 起始值
   * @param val2 - 结束值
   * @param t - 插值因子 (0-1)
   * @returns 插值后的数值
   */
  static lerpValue(val1: number, val2: number, t: number): number {
    return val1 + (val2 - val1) * t;
  }

  /**
   * 将各种格式的颜色转换为 Three.Color
   * @param color - 颜色输入（Three.Color、数组或十六进制数字）
   * @returns Three.Color 实例
   */
  static toColor(color: ColorInput): Three.Color {
    if (color instanceof Three.Color) {
      return color;
    }

    if (Array.isArray(color)) {
      if (color.length === 3) {
        return new Three.Color(color[0], color[1], color[2]);
      }
      console.warn('Color array must have 3 elements [r, g, b]:', color);
      return new Three.Color(0xffffff);
    }

    if (typeof color === 'number') {
      return new Three.Color(color);
    }

    console.warn('Invalid color format:', color);
    return new Three.Color(0xffffff);
  }

  /**
   * 深度插值配置对象
   * 递归处理嵌套的配置对象，对颜色、数组和数值进行插值
   *
   * @param dayConfig - 白天配置对象
   * @param nightConfig - 夜晚配置对象
   * @param timeFactor - 时间因子 (0=完全白天, 1=完全夜晚)
   * @returns 插值后的配置对象
   *
   * @example
   * const config = ColorInterpolator.interpolateConfig(
   * dayLightingConfig,
   * nightLightingConfig,
   * 0.5 // 黄昏时刻
   * );
   */
  static interpolateConfig<T extends ConfigObject>(
      dayConfig: T | null | undefined,
      nightConfig: T | null | undefined,
      timeFactor: number
  ): T | null | undefined {
      if (!dayConfig || !nightConfig) {
          return dayConfig || nightConfig;
      }

      const result: ConfigObject = {};

      for (const key in dayConfig) {
          if (Object.prototype.hasOwnProperty.call(dayConfig, key)) {
              const dayValue = dayConfig[key];
              const nightValue = nightConfig[key];

              if (nightValue === undefined) {
                  result[key] = dayValue;
                  continue;
              }

              result[key] = this.interpolateValue(dayValue, nightValue, timeFactor);
          }
      }

      return result as T;
  }

    /**
     * 插值单个值（内部方法）
     * 根据值的类型自动选择合适的插值方法
     */
    private static interpolateValue(
        dayValue: ConfigValue,
        nightValue: ConfigValue,
        timeFactor: number
    ): ConfigValue {
        const dayType = typeof dayValue;
        const nightType = typeof nightValue;

        if (dayType !== nightType) {
            console.warn('Type mismatch between day and night values, using day value');
            return dayValue;
        }

        if (dayType === 'number' && nightType === 'number') {
            return this.lerpValue(dayValue as number, nightValue as number, timeFactor);
        }

        if (Array.isArray(dayValue) && Array.isArray(nightValue)) {
            if (dayValue.length === 3 && nightValue.length === 3) {
                return this.lerpArray(
                    dayValue as [number, number, number],
                    nightValue as [number, number, number],
                    timeFactor
                );
            }
        }

        if (dayValue instanceof Three.Color || nightValue instanceof Three.Color) {
            return this.lerpColor(
                dayValue as ColorInput,
                nightValue as ColorInput,
                timeFactor
            );
        }

        if (dayType === 'object' && nightType === 'object' && dayValue !== null && nightValue !== null) {
            return this.interpolateConfig(
                dayValue as ConfigObject,
                nightValue as ConfigObject,
                timeFactor
            );
        }

        return timeFactor < 0.5 ? dayValue : nightValue;
    }

    /**
     * 创建平滑的时间过渡曲线
     * 使用缓动函数使颜色过渡更自然
     *
     * @param linearFactor - 线性时间因子 (0-1)
     * @param easing - 缓动类型 ('linear' | 'easeInOut' | 'smoothstep')
     * @returns 缓动后的时间因子
     */
    static applyEasing(linearFactor: number, easing: 'linear' | 'easeInOut' | 'smoothstep' = 'smoothstep'): number {
        switch (easing) {
            case 'linear':
                return linearFactor;

            case 'easeInOut':
                return linearFactor < 0.5
                    ? 2 * linearFactor * linearFactor
                    : -1 + (4 - 2 * linearFactor) * linearFactor;

            case 'smoothstep':
                return linearFactor * linearFactor * (3 - 2 * linearFactor);

            default:
                return linearFactor;
        }
    }
}
