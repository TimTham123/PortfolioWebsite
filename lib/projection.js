// Map projection for the Sounds Of map.
//
// Albers equal-area conic with standard parallels 18°S and 36°S, centred on
// 134°E: the projection Geoscience Australia uses, so the country keeps its
// familiar shape.

const RAD = Math.PI / 180;
const PHI1 = -18 * RAD;
const PHI2 = -36 * RAD;
const LAMBDA0 = 134 * RAD;
const n = (Math.sin(PHI1) + Math.sin(PHI2)) / 2;
const C = Math.cos(PHI1) ** 2 + 2 * n * Math.sin(PHI1);
const RHO0 = Math.sqrt(C) / n;

/** Latitude/longitude in degrees -> projected [x, y] (y grows downwards). */
export function albers(lat, lng) {
  const theta = n * (lng * RAD - LAMBDA0);
  const rho = Math.sqrt(C - 2 * n * Math.sin(lat * RAD)) / n;
  return [rho * Math.sin(theta), -(RHO0 - rho * Math.cos(theta))];
}

/**
 * Returns a function: latitude/longitude -> [x, y] in the map's viewBox,
 * using the scale and offsets the map generator wrote into australia-map.js.
 */
export function makeToMap(fit) {
  return (lat, lng) => {
    const [x, y] = albers(lat, lng);
    return [(x - fit.minX) * fit.scale + fit.pad, (y - fit.minY) * fit.scale + fit.pad];
  };
}
