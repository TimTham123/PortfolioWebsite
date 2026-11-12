// Fetches the driving route along real roads between each pair of
// consecutive Sounds Of stops (and from the last stop home), through any
// "via" towns, and saves it to src/_data/sounds-of-routes.json, which the
// map draws.
//
// Run after changing src/_data/sounds-of.csv:   npm run routes
// Uses the public OSRM demo router (OpenStreetMap data); legs already saved
// are kept, so it only asks for what's new.

import fs from "node:fs";
import { readStops, legKey, HOME } from "../lib/sounds-of.js";

const CSV = new URL("../src/_data/sounds-of.csv", import.meta.url);
const OUT = new URL("../src/_data/sounds-of-routes.json", import.meta.url);
const ROUTER = "https://router.project-osrm.org/route/v1/driving/";

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

const stops = readStops(fs.readFileSync(CSV, "utf8"));
const legs = stops.slice(1).map((to, i) => [stops[i], to]);
if (HOME && stops.length) legs.push([stops[stops.length - 1], { ...HOME, via: [] }]);
const label = (stop) => stop.name || stop.location;

const saved = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const routes = {};

for (const [a, b] of legs) {
  const key = legKey(a, b);
  if (a.lat === b.lat && a.lng === b.lng && !b.via.length) continue;
  if (saved[key]) { routes[key] = saved[key]; continue; }
  const points = [a, ...b.via, b].map((p) => `${p.lng},${p.lat}`).join(";");
  const res = await fetch(`${ROUTER}${points}?overview=full&geometries=geojson`, {
    headers: { "User-Agent": "portfolio-site-route-builder" },
  });
  const json = await res.json();
  if (json.code !== "Ok") { console.warn(`No route: ${label(a)} → ${label(b)}`); continue; }
  const line = simplify(json.routes[0].geometry.coordinates, 0.008);
  routes[key] = line.map(([lng, lat]) => [+lat.toFixed(3), +lng.toFixed(3)]);
  const through = b.via.length ? ` (via ${b.via.map((v) => v.name || `${v.lat},${v.lng}`).join(", ")})` : "";
  console.log(`${label(a)} → ${label(b)}${through}: ${Math.round(json.routes[0].distance / 1000)} km, ${routes[key].length} points`);
  await new Promise((r) => setTimeout(r, 1100)); // be polite to the free server
}

fs.writeFileSync(OUT, JSON.stringify(routes) + "\n");
console.log(`Saved ${Object.keys(routes).length} routes.`);
