/**
 * Unit converters for running (client-safe, no DB).
 */

export function kmToMiles(km: number): number {
  return km * 0.621371192;
}

export function milesToKm(mi: number): number {
  return mi / 0.621371192;
}

/** Decimal min/km → decimal min/mi */
export function paceMinPerKmToMinPerMile(minPerKm: number): number {
  return minPerKm / 0.621371192;
}

/** Decimal min/mi → decimal min/km */
export function paceMinPerMileToMinPerKm(minPerMi: number): number {
  return minPerMi * 0.621371192;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
