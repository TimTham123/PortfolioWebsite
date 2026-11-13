// Data for the Sounds Of map, read from src/_data/sounds-of.csv.
// The columns are explained in lib/sounds-of.js (and in the README).
//
// Each row is a stop on the road: an episode, or (with no artist name) an
// empty marker for a place still to be filled in. Stops are sorted by date,
// and that order is the route, which then heads home (HOME in
// lib/sounds-of.js).

import fs from "node:fs";
import { readStops, legKey, HOME } from "../../lib/sounds-of.js";
import { makeToMap } from "../../lib/projection.js";
import { viewBox, fit, outline, echo } from "../../lib/australia-map.js";
import { youtubeId, embedUrl, watchUrl } from "../../lib/youtube.js";

const CSV = new URL("./sounds-of.csv", import.meta.url);
// Road routes between stops, made by `npm run routes` (scripts/fetch-routes.mjs).
const ROUTES = new URL("./sounds-of-routes.json", import.meta.url);

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

const round = (n, places = 2) => +n.toFixed(places);
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

export default function () {
  const toMap = makeToMap(fit);
  const rows = readStops(fs.readFileSync(CSV, "utf8"));

  const episodes = rows.map((row, i) => {
    const state = (row.location.split(",").pop() || "").trim().toUpperCase();
    const id = youtubeId(row.youtube);
    const [x, y] = toMap(row.lat, row.lng);
    const when = row.when;
    const place = row.location.split(",")[0].trim();
    return {
      index: i,
      empty: !row.name,
      lat: row.lat,
      lng: row.lng,
      via: row.via.map(({ lat, lng }) => ({ lat, lng })),
      name: row.name,
      // What the stop is called on the map and in the timeline.
      title: row.name || place,
      location: row.location,
      place,
      description: row.description,
      date: when ? when.toISOString().slice(0, 10) : "",
      // A word in the date column (e.g. "unreleased") shows in place of a date.
      dateLong: when ? `${when.getUTCDate()} ${MONTHS[when.getUTCMonth()]} ${when.getUTCFullYear()}` : (row.date || "").trim(),
      month: when ? MONTHS[when.getUTCMonth()].slice(0, 3) : "",
      year: when ? when.getUTCFullYear() : null,
      video: id ? { id, embed: embedUrl(id), watch: watchUrl(id) } : null,
      colour: STATE_COLOURS[state] || SPARE_COLOURS[i % SPARE_COLOURS.length],
      x,
      y,
    };
  });

  // For the markers' labels and the status line.
  for (const ep of episodes) {
    ep.label = ep.empty
      ? `${ep.location}${ep.dateLong ? `, ${ep.dateLong}` : ""} (no episode yet)`
      : [ep.name, ep.location, ep.dateLong].filter(Boolean).join(", ");
  }

  // Stops in the same place (four in Melbourne, two at the Big Dance
  // Festival…) are drawn as a neat pile, each one a little up and to the
  // right of the one before, the latest on top; choose one and it comes to
  // the front, and Earlier / Later step through the rest. Places that are
  // close enough to touch (Melbourne and Phillip Island, Bellingen and the
  // Coffs Coast) are nudged apart, a little at a time, so each can still be
  // clicked, staying as near their real spot as they can.
  const MIN = 30; // map units between places (about 23px on a laptop; a marker is 11px)
  const STEP = 5; // map units between the markers in a pile, across and up
  const places = [];
  for (const ep of episodes) {
    const place = places.find((p) => Math.abs(p.x - ep.x) < 0.5 && Math.abs(p.y - ep.y) < 0.5);
    if (place) place.stops.push(ep);
    else places.push({ x: ep.x, y: ep.y, stops: [ep] });
  }
  for (let pass = 0; pass < 400; pass++) {
    let moved = false;
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const a = places[i];
        const b = places[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= MIN || d === 0) continue;
        const push = ((MIN - d) / 2) * 0.5;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  for (const place of places) {
    place.stops.forEach((ep, k) => {
      const offset = k - (place.stops.length - 1) / 2; // the pile sits centred on the place
      ep.x = place.x + offset * STEP;
      ep.y = place.y - offset * STEP;
      ep.pile = place.stops.length;
    });
  }

  // Positions as percentages of the map, for the marker buttons.
  for (const ep of episodes) {
    ep.left = round((ep.x / viewBox.width) * 100, 3);
    ep.top = round((ep.y / viewBox.height) * 100, 3);
    ep.x = round(ep.x, 1);
    ep.y = round(ep.y, 1);
  }

  // Where the trip ends.
  const [hx, hy] = HOME ? toMap(HOME.lat, HOME.lng) : [];
  const home = HOME ? { ...HOME, via: [], x: round(hx, 1), y: round(hy, 1) } : null;

  // The route follows the roads between stops (sounds-of-routes.json).
  // A leg without a saved road (a new stop, before `npm run routes`) is
  // drawn as a gentle curve instead.
  const roads = fs.existsSync(ROUTES) ? JSON.parse(fs.readFileSync(ROUTES, "utf8")) : {};
  const cx = viewBox.width / 2;
  const cy = viewBox.height / 2;
  function leg(a, b) {
    const road = roads[legKey(a, b)];
    if (road && road.length > 1) {
      const pts = road.map(([lat, lng]) => toMap(lat, lng));
      pts[0] = [a.x, a.y];
      pts[pts.length - 1] = [b.x, b.y];
      return "M" + pts.map(([x, y]) => `${round(x, 1)} ${round(y, 1)}`).join("L");
    }
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
    const bow = Math.min(len * 0.18, 40);
    const qx = round(mx + nx * bow, 1);
    const qy = round(my + ny * bow, 1);
    return `M${a.x} ${a.y}Q${qx} ${qy} ${b.x} ${b.y}`;
  }
  const segments = episodes.slice(1).map((ep, i) => ({ d: leg(episodes[i], ep) }));
  if (home && episodes.length) segments.push({ d: leg(episodes[episodes.length - 1], home), home: true });

  // Hand-lettered sea names, kept inside the map (sized for the biggest the
  // lettering gets, on phones).
  const LETTER = 44 * 0.42; // average letter width, in map units
  const labels = [
    { text: "Indian Ocean", lat: -26.5, lng: 109.5, rotate: -90 },
    { text: "Timor Sea", lat: -11.5, lng: 125.5, rotate: -8 },
    { text: "Coral Sea", lat: -13, lng: 149.5, rotate: 0 },
    { text: "Tasman Sea", lat: -36.5, lng: 154.5, rotate: -70 },
    { text: "Southern Ocean", lat: -38.5, lng: 128, rotate: 0 },
  ].map((label) => {
    const [x, y] = toMap(label.lat, label.lng);
    const half = (label.text.length * LETTER) / 2;
    const turn = (Math.abs(label.rotate) * Math.PI) / 180;
    const across = half * Math.abs(Math.cos(turn)) + 26 * Math.abs(Math.sin(turn));
    const down = half * Math.abs(Math.sin(turn)) + 26 * Math.abs(Math.cos(turn));
    return {
      ...label,
      x: round(clamp(x, across + 6, viewBox.width - across - 6), 1),
      y: round(clamp(y, down + 6, viewBox.height - down - 6), 1),
    };
  });

  // Month labels for the timeline: shown where the month changes.
  let previous = null;
  for (const ep of episodes) {
    ep.timelineLabel = "";
    if (!ep.month) continue;
    if (!previous || previous.month !== ep.month || previous.year !== ep.year) {
      ep.timelineLabel = !previous || previous.year !== ep.year ? `${ep.month} ${ep.year}` : ep.month;
    }
    previous = ep;
  }

  const episodeCount = episodes.filter((ep) => !ep.empty).length;
  return { viewBox, outline, echo, episodes, episodeCount, segments, home, labels };
}
