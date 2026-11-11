// YouTube helpers shared by the media shortcodes and the Sounds Of map.

/** Accepts a YouTube ID or any common YouTube URL; returns the 11-character ID. */
export function youtubeId(value = "") {
  const match = String(value).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return match ? match[1] : String(value).trim();
}

/** Privacy-friendly embed URL (no cookies until the viewer presses play). */
export const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`;

export const watchUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
