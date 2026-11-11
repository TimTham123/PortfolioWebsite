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

  // Spread the videos evenly through the photos.
  const items = [...photoItems];
  const gap = Math.floor(photoItems.length / (videoItems.length + 1)) || 1;
  videoItems.forEach((video, i) => items.splice(Math.min((i + 1) * gap + i, items.length), 0, video));

  return {
    items,
    // Video files are copied as they are (see eleventy.config.js).
    videoFiles: [...new Set(videos.files)],
    placeholder: photos.placeholder || videos.placeholder,
  };
}
