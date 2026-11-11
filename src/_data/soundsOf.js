// Data for the Sounds Of map, read from src/_data/sounds-of.csv.
//
// CSV columns (the first row must be these headings, in any order):
//   date         2026-03-01 or 1/3/2026 (day/month/year)
//   name         the artist
//   location     e.g. "Darwin, NT" – the state picks the marker colour
//   latitude     e.g. -12.46   (Google Maps: right-click a place, click the numbers)
//   longitude    e.g. 130.85
//   youtube      the video's link (or just its ID)
//   description  a sentence or two
//
// Episodes are sorted by date: that order is the route drawn on the map.

import fs from "node:fs";
import { parseCSV } from "../../lib/csv.js";
import { makeToMap } from "../../lib/projection.js";
import { viewBox, fit, outline, echo } from "../../lib/australia-map.js";
import { youtubeId, embedUrl, watchUrl } from "../../lib/youtube.js";

const CSV = new URL("./sounds-of.csv", import.meta.url);

// Muted marker colours, one per state or territory.
const STATE_COLOURS = {
  VIC: "#8fa3b8",
  NSW: "#9aab94",
  QLD: "#c9a67a",
  NT: "#c4928a",
  WA: "#a99bb5",
  SA: "#b5b07e",
  TAS: "#8db0a8",
  ACT: "#c7a0b0",
};
const SPARE_COLOURS = Object.values(STATE_COLOURS);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseDate(value) {
  const v = String(value).trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); // Australian day/month/year
  if (m) return new Date(Date.UTC(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]));
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

const round = (n, places = 2) => +n.toFixed(places);

export default function () {
  const toMap = makeToMap(fit);
  const rows = parseCSV(fs.readFileSync(CSV, "utf8"));

  const episodes = rows
    .map((row) => ({ ...row, when: parseDate(row.date), lat: parseFloat(row.latitude), lng: parseFloat(row.longitude) }))
    .filter((row) => row.when && Number.isFinite(row.lat) && Number.isFinite(row.lng))
    .sort((a, b) => a.when - b.when)
    .map((row, i) => {
      const state = (row.location.split(",").pop() || "").trim().toUpperCase();
      const id = youtubeId(row.youtube);
      const [x, y] = toMap(row.lat, row.lng);
      return {
        index: i,
        name: row.name,
        location: row.location,
        place: row.location.split(",")[0].trim(),
        description: row.description,
        date: row.when.toISOString().slice(0, 10),
        dateLong: `${row.when.getUTCDate()} ${MONTHS[row.when.getUTCMonth()]} ${row.when.getUTCFullYear()}`,
        month: `${MONTHS[row.when.getUTCMonth()].slice(0, 3)}`,
        year: row.when.getUTCFullYear(),
        video: id ? { id, embed: embedUrl(id), watch: watchUrl(id) } : null,
        colour: STATE_COLOURS[state] || SPARE_COLOURS[i % SPARE_COLOURS.length],
        x,
        y,
      };
    });

  // Episodes filmed in the same place are fanned out a little so each marker
  // can still be clicked.
  const groups = new Map();
  for (const ep of episodes) {
    const key = `${ep.x.toFixed(0)},${ep.y.toFixed(0)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ep);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.forEach((ep, k) => {
      const angle = (k / group.length) * Math.PI * 2 - Math.PI / 2;
      ep.x += Math.cos(angle) * 11;
      ep.y += Math.sin(angle) * 11;
    });
  }

  // Positions as percentages of the map, for the marker buttons.
  for (const ep of episodes) {
    ep.left = round((ep.x / viewBox.width) * 100, 3);
    ep.top = round((ep.y / viewBox.height) * 100, 3);
    ep.x = round(ep.x, 1);
    ep.y = round(ep.y, 1);
  }

  // The route: a gentle curve from each episode to the next, bowing away
  // from the middle of the country so it reads as a road trip round the edge.
  const cx = viewBox.width / 2;
  const cy = viewBox.height / 2;
  const segments = episodes.slice(1).map((ep, i) => {
    const a = episodes[i];
    const mx = (a.x + ep.x) / 2;
    const my = (a.y + ep.y) / 2;
    const dx = ep.x - a.x;
    const dy = ep.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
    const bow = Math.min(len * 0.18, 40);
    const qx = round(mx + nx * bow, 1);
    const qy = round(my + ny * bow, 1);
    return { d: `M${a.x} ${a.y}Q${qx} ${qy} ${ep.x} ${ep.y}` };
  });

  // Hand-lettered sea names.
  const labels = [
    { text: "Indian Ocean", lat: -26.5, lng: 109.5, rotate: -90 },
    { text: "Timor Sea", lat: -11.5, lng: 125.5, rotate: -8 },
    { text: "Coral Sea", lat: -17, lng: 151.5, rotate: 0 },
    { text: "Tasman Sea", lat: -36.5, lng: 154.5, rotate: -70 },
    { text: "Southern Ocean", lat: -38.5, lng: 128, rotate: 0 },
  ].map((label) => {
    const [x, y] = toMap(label.lat, label.lng);
    return { ...label, x: round(Math.min(Math.max(x, 20), viewBox.width - 20), 1), y: round(Math.min(Math.max(y, 24), viewBox.height - 12), 1) };
  });

  // Month labels for the timeline: shown where the month changes.
  episodes.forEach((ep, i) => {
    const prev = episodes[i - 1];
    ep.timelineLabel = !prev || prev.month !== ep.month || prev.year !== ep.year
      ? (!prev || prev.year !== ep.year ? `${ep.month} ${ep.year}` : ep.month)
      : "";
  });

  return { viewBox, outline, echo, episodes, segments, labels };
}
