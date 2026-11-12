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

// Where each video goes: how many photos come before it. The grid is four
// photos across, and a video fills a 2 x 2 block. The first video takes the
// second and third rows of the middle two columns; the rest are spread evenly
// down the page, on the left, then the right, and so on.
const COLUMNS = 4;
function videoSlots(photoCount, videoCount) {
  if (!videoCount) return [];
  const slots = [Math.min(5, photoCount)]; // after the first row and one photo
  const rows = Math.ceil((photoCount + videoCount * 4) / COLUMNS);
  const rest = videoCount - 1;
  const spacing = (rows - 3 - rest * 2) / (rest + 1); // rows of photos between videos
  for (let k = 1; k <= rest; k++) {
    const row = Math.round(3 + spacing * k + 2 * (k - 1)) + 1;
    const column = k % 2 ? 1 : 3;
    const before = (row - 1) * COLUMNS + (column - 1) - 4 * k;
    slots.push(Math.min(photoCount, Math.max(slots[k - 1], before)));
  }
  return slots;
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

  // Put the videos in among the photos (see videoSlots).
  const slots = videoSlots(photoItems.length, videoItems.length);
  const items = [];
  photoItems.forEach((photo, i) => {
    videoItems.forEach((video, v) => { if (slots[v] === i) items.push(video); });
    items.push(photo);
  });
  videoItems.forEach((video, v) => { if (slots[v] >= photoItems.length) items.push(video); });

  return {
    items,
    // Video files are copied as they are (see eleventy.config.js).
    videoFiles: [...new Set(videos.files)],
    placeholder: photos.placeholder || videos.placeholder,
  };
}
