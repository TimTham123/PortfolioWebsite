// Fetches the driving route along real roads between each pair of
// consecutive Sounds Of episodes (by date) and saves it to
// src/_data/sounds-of-routes.json, which the map draws.
//
// Run after changing src/_data/sounds-of.csv:   npm run routes
// Uses the public OSRM demo router (OpenStreetMap data); pairs already saved
// are skipped, so it only asks for what's new.

import fs from "node:fs";
import { parseCSV } from "../lib/csv.js";

const CSV = new URL("../src/_data/sounds-of.csv", import.meta.url);
const OUT = new URL("../src/_data/sounds-of-routes.json", import.meta.url);
const ROUTER = "https://router.project-osrm.org/route/v1/driving/";

const parseDate = (v) => {
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return Date.UTC(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]);
  return Date.parse(v);
};

export const pairKey = (a, b) => `${a.lat},${a.lng}|${b.lat},${b.lng}`;

// Douglas-Peucker on [lng, lat] points (tolerance in degrees).
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(dx, dy) || 1);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [a, b];
  return simplify(pts.slice(0, idx + 1), tol).slice(0, -1).concat(simplify(pts.slice(idx), tol));
}

const episodes = parseCSV(fs.readFileSync(CSV, "utf8"))
  .map((r) => ({ when: parseDate(r.date), lat: +r.latitude, lng: +r.longitude, name: r.name }))
  .filter((r) => Number.isFinite(r.when) && Number.isFinite(r.lat) && Number.isFinite(r.lng))
  .sort((a, b) => a.when - b.when);

const saved = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const routes = {};

for (let i = 1; i < episodes.length; i++) {
  const a = episodes[i - 1], b = episodes[i];
  const key = pairKey(a, b);
  if (a.lat === b.lat && a.lng === b.lng) continue;
  if (saved[key]) { routes[key] = saved[key]; continue; }
  const url = `${ROUTER}${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": "portfolio-site-route-builder" } });
  const json = await res.json();
  if (json.code !== "Ok") { console.warn(`No route: ${a.name} → ${b.name}`); continue; }
  const line = simplify(json.routes[0].geometry.coordinates, 0.008);
  routes[key] = line.map(([lng, lat]) => [+lat.toFixed(3), +lng.toFixed(3)]);
  console.log(`${a.name} → ${b.name}: ${Math.round(json.routes[0].distance / 1000)} km, ${routes[key].length} points`);
  await new Promise((r) => setTimeout(r, 1100)); // be polite to the free server
}

fs.writeFileSync(OUT, JSON.stringify(routes) + "\n");
console.log(`Saved ${Object.keys(routes).length} routes.`);
