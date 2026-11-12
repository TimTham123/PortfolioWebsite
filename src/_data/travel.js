// The Travel gallery, made from whatever is in media/travel/.
//
// Drop photos (.jpg, .png, .webp…) and videos (.mp4, .webm) into that folder.
// They're shown in filename order, so number them (001.jpg, 002.jpg…) to set
// the order. A descriptive filename ("kalgoorlie-sunset.jpg") becomes the
// photo's description for screen readers.
//
// Photos are resized when the site is built (small and large versions, WebP
// and JPEG), so full-size camera files are fine.
//
// Until there are real files, the sample "placeholder-…" photo and video are
// repeated to show the full layout (100 photos, 3 videos). As soon as any
// real photo or video is added, the placeholders are ignored.

import fs from "node:fs";
import path from "node:path";
import Image from "@11ty/eleventy-img";

const DIR = path.resolve("media/travel");
const PLACEHOLDER_COUNT = { photos: 100, videos: 3 };
const PHOTO = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;
const VIDEO = /\.(mp4|webm|m4v|mov)$/i;

const isPlaceholder = (file) => /^placeholder/i.test(file);
const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/** "002-kalgoorlie_sunset.jpg" -> "Kalgoorlie sunset" */
function describe(file) {
  const words = file.replace(/\.[^.]+$/, "").replace(/^[\d\s._-]+/, "").replace(/[_-]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "";
}

// Where each video goes in the grid, which is four photos across; a video
// fills a 2 x 2 block, always in the middle two columns. The first takes rows
// 2-3; each one after that comes five rows of photos further down (rows 2-3,
// 9-10, 16-17…). On a big screen each
// video is pinned to its spot (see style.css), so portrait photos (two tiles
// tall) can't push it about; `before` is how many photos come before it in
// the page, so it's also read out in about the right place.
const COLUMNS = 4;
const ROWS_BETWEEN = 5;
function videoPlaces(photoCells, videoCount) {
  const total = photoCells.reduce((sum, cells) => sum + cells, 0);
  const places = [];
  for (let k = 0; k < videoCount; k++) {
    const row = 2 + k * (2 + ROWS_BETWEEN);
    const column = 2;
    const cellsBefore = (row - 1) * COLUMNS + (column - 1) - 4 * k;
    let before = 0;
    for (let cells = 0; before < photoCells.length && cells < cellsBefore; before++) cells += photoCells[before];
    before = Math.max(before, k ? places[k - 1].before : 0);
    // Pinned only if there are enough photos to fill the rows around it.
    const pinned = total >= (row + 1) * COLUMNS - 4 * (k + 1);
    places.push({ row: pinned ? row : null, column: pinned ? column : null, before });
  }
  return places;
}

function pick(files, test, count) {
  const all = files.filter((f) => test.test(f));
  const real = all.filter((f) => !isPlaceholder(f));
  if (real.length) return { files: real, placeholder: false };
  const samples = all.filter(isPlaceholder);
  if (!samples.length) return { files: [], placeholder: false };
  return { files: Array.from({ length: count }, (_, i) => samples[i % samples.length]), placeholder: true };
}

export default async function () {
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => !f.startsWith(".")).sort(byName) : [];
  const photos = pick(files, PHOTO, PLACEHOLDER_COUNT.photos);
  const videos = pick(files, VIDEO, PLACEHOLDER_COUNT.videos);

  // Resize each photo once, however many times it appears.
  const sizes = new Map();
  for (const file of new Set(photos.files)) {
    sizes.set(file, await Image(path.join(DIR, file), {
      widths: [480, 960, 1800],
      formats: ["webp", "jpeg"],
      outputDir: "_site/assets/travel/",
      urlPath: "/assets/travel/",
    }));
  }

  const photoItems = photos.files.map((file, i) => {
    const meta = sizes.get(file);
    const jpeg = meta.jpeg;
    const largest = jpeg[jpeg.length - 1];
    return {
      type: "photo",
      alt: photos.placeholder ? `Travel photo ${i + 1} (placeholder)` : describe(file) || `Travel photo ${i + 1}`,
      width: jpeg[0].width,
      height: jpeg[0].height,
      // Portrait photos get a tile twice as tall.
      tall: jpeg[0].height > jpeg[0].width,
      fallback: jpeg[0].url,
      webp: meta.webp.map((s) => s.srcset).join(", "),
      jpeg: jpeg.map((s) => s.srcset).join(", "),
      full: largest.url,
    };
  });

  const videoItems = videos.files.map((file, i) => ({
    type: "video",
    src: `/assets/travel/${file}`,
    title: videos.placeholder ? `Travel video ${i + 1} (placeholder)` : describe(file) || `Travel video ${i + 1}`,
  }));

  // Put the videos in among the photos (see videoPlaces).
  const places = videoPlaces(photoItems.map((photo) => (photo.tall ? 2 : 1)), videoItems.length);
  videoItems.forEach((video, v) => { video.row = places[v].row; video.column = places[v].column; });
  const items = [];
  photoItems.forEach((photo, i) => {
    videoItems.forEach((video, v) => { if (places[v].before === i) items.push(video); });
    items.push(photo);
  });
  videoItems.forEach((video, v) => { if (places[v].before >= photoItems.length) items.push(video); });

  return {
    items,
    // Video files are copied as they are (see eleventy.config.js).
    videoFiles: [...new Set(videos.files)],
    placeholder: photos.placeholder || videos.placeholder,
  };
}
