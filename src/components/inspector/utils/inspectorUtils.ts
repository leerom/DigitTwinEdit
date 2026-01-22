export const MIXED_VALUE = '---';

export function getCommonValue<T>(values: T[]): T | typeof MIXED_VALUE {
  if (values.length === 0) return MIXED_VALUE;
  const first = values[0];
  for (let i = 1; i < values.length; i++) {
    const current = values[i];
    if (typeof first === 'number' && typeof current === 'number') {
      if (Math.abs((first as number) - (current as number)) >= 0.0001) return MIXED_VALUE;
    } else {
      if (current !== first) return MIXED_VALUE;
    }
  }
  return first;
}

export const radToDeg = (rad: number) => Math.round(rad * (180 / Math.PI) * 100) / 100;
export const degToRad = (deg: number) => deg * (Math.PI / 180);
