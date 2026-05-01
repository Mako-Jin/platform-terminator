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

export default class ColorInterpolator {
  static lerpColor(color1: ColorInput, color2: ColorInput, t: number): Three.Color {
    const c1 = this.toColor(color1);
    const c2 = this.toColor(color2);

    return new Three.Color(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t
    );
  }

  static lerpArray(arr1: [number, number, number], arr2: [number, number, number], t: number): [number, number, number] {
    return [
      arr1[0] + (arr2[0] - arr1[0]) * t,
      arr1[1] + (arr2[1] - arr1[1]) * t,
      arr1[2] + (arr2[2] - arr1[2]) * t,
    ];
  }

  static lerpValue(val1: number, val2: number, t: number): number {
    return val1 + (val2 - val1) * t;
  }

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

    static batchInterpolate(
        configs: Record<string, { day?: ConfigObject; night?: ConfigObject }>,
        timeFactor: number
    ): Record<string, ConfigObject | null | undefined> {
        const result: Record<string, ConfigObject | null | undefined> = {};

        for (const [componentName, config] of Object.entries(configs)) {
            if (config) {
                result[componentName] = this.interpolateConfig(
                    config.day,
                    config.night,
                    timeFactor
                );
            }
        }

        return result;
    }

    static colorToArray(color: Three.Color): [number, number, number] {
        return [color.r, color.g, color.b];
    }

    static arrayToColor(array: [number, number, number]): Three.Color {
        return new Three.Color(array[0], array[1], array[2]);
    }
}
