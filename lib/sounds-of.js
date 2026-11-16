// The Sounds Of trip: every stop on the road, read from
// src/_data/sounds-of.csv. Shared by the map (src/_data/soundsOf.js) and the
// road fetcher (scripts/fetch-routes.mjs), so both see the same route.
//
// CSV columns (the first row must be these headings, in any order):
//   date         2026-03-01 or 1/3/2026 (day/month/year). Or a word such as
//                "unreleased" or "coming soon", or just the year, shown
//                instead of a date; or empty if not known.
//   name         the artist. Leave it empty for a stop that isn't an
//                episode (an interview, a visit): it has a hollow marker.
//                An artist with no video yet is an episode still to come,
//                with a hollow marker too, until its video is added.
//   location     e.g. "Darwin, NT". The state picks the marker colour
//   latitude     e.g. -12.46   (Google Maps: right-click a place, click the numbers)
//   longitude    e.g. 130.85
//   youtube      the video's link (or just its ID)
//   description  a sentence or two
//   via          optional: towns the road passes through on the way to this
//                stop, as name latitude longitude, separated by semicolons,
//                e.g. "Hughenden -20.84 144.2"
//
// And for a stop that isn't an episode (these are all optional):
//   title        what it's called on its card, e.g. "On 4ZZZ" (otherwise
//                the place's name)
//   links        links on its card, as text | address, separated by
//                semicolons, e.g. "Photos (Instagram) | https://…"
//   audio        a sound file on its card, e.g. /assets/audio/interview.mp3
//                (the file goes in src/assets/audio/)
//   photo        a photo on its card: a file in media/, e.g.
//                media/sounds-of/uluru.jpg, or "to come" for a grey box
//                until there is one
//
// Stops are sorted by date, and that order is the route. A stop with no
// date stays where it is in the list, straight after the row above it.

import { parseCSV } from "./csv.js";

// Where the trip ends: the route's last leg comes back here.
export const HOME = { location: "Melbourne, VIC", lat: -37.81, lng: 144.96 };

export function parseDate(value) {
  const v = String(value || "").trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); // Australian day/month/year
  if (m) return new Date(Date.UTC(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]));
  if (/^\d{4}$/.test(v)) return null; // just a year: shown as it is, like a word
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

/** "Hughenden -20.84 144.2; Julia Creek -20.66 141.75" -> [{ name, lat, lng }, …] */
export function parseVia(value) {
  return String(value || "")
    .split(";")
    .map((part) => {
      const numbers = part.match(/-?\d+(?:\.\d+)?/g) || [];
      if (numbers.length < 2) return null;
      const lat = parseFloat(numbers[numbers.length - 2]);
      const lng = parseFloat(numbers[numbers.length - 1]);
      const name = part.replace(/-?\d+(?:\.\d+)?/g, "").replace(/[,()]/g, " ").trim();
      return Number.isFinite(lat) && Number.isFinite(lng) ? { name, lat, lng } : null;
    })
    .filter(Boolean);
}

/** "Photos (Instagram) | https://…; …" -> [{ text, url }, …] */
export function parseLinks(value) {
  return String(value || "")
    .split(";")
    .map((part) => {
      const [text, url] = part.split("|").map((s) => (s || "").trim());
      return url ? { text: text || url, url } : null;
    })
    .filter(Boolean);
}

/** The key a leg of road is saved under in sounds-of-routes.json. */
export function legKey(from, to) {
  return [from, ...(to.via || []), to].map((p) => `${p.lat},${p.lng}`).join("|");
}

/** Every stop on the trip, in order. */
export function readStops(csvText) {
  let lastDate = null;
  return parseCSV(csvText)
    .map((row, order) => {
      const when = parseDate(row.date);
      if (when) lastDate = when;
      return {
        ...row,
        order,
        when,
        sortDate: when || lastDate || new Date(0),
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude),
        via: parseVia(row.via),
      };
    })
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
    .sort((a, b) => a.sortDate - b.sortDate || a.order - b.order);
}
