// Media components, usable on any page:
//
//   {% image { src: "/assets/img/me.jpg", alt: "Me holding a microphone", caption: "(me)", ratio: "3/4" } %}
//   {% video { youtube: "https://youtu.be/VIDEO_ID", title: "Sound Design Reel", caption: "…" } %}
//   {% video { vimeo: "123456789", title: "…" } %}      or  {% video { src: "/assets/video/clip.mp4", title: "…" } %}
//   {% audio { src: "/assets/audio/clip.mp3", title: "Hub ambience", caption: "loop, 1:30" } %}
//   {% embed { src: "https://bandcamp.com/EmbeddedPlayer/…", title: "Bandcamp player", height: 120 } %}
//
// Leave src / youtube / vimeo empty ("") and a pencil SKETCH of the thing is
// drawn instead (a box with an X for a photo, a play button for a video...),
// at the same size, so nothing shifts when the real thing goes in.

const escapeAttr = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/** "16:9" or "16 / 9" -> "16/9" (CSS aspect-ratio) */
const ratioCss = (ratio = "4/3") => String(ratio).replace(":", "/").replace(/\s+/g, "");
/** "16/9" -> "16:9" (label) */
const ratioLabel = (ratio) => ratioCss(ratio).replace("/", ":");

const figcaption = (html, isPlaceholder = false) =>
  html ? `<figcaption${isPlaceholder ? ' class="ph"' : ""}>${html}</figcaption>` : "";

/** Accepts a YouTube ID or any common YouTube URL. */
const youtubeId = (value) => {
  const match = String(value).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return match ? match[1] : String(value).trim();
};

/** Accepts a Vimeo ID or URL. */
const vimeoId = (value) => {
  const match = String(value).match(/(\d{6,})/);
  return match ? match[1] : String(value).trim();
};

/* ---- Pencil sketches ------------------------------------------------------ */

const svgOpen = (cls, viewBox, stretch = false, size = 0) =>
  `<svg class="${cls}" viewBox="${viewBox}"${size ? ` width="${size}" height="${size}"` : ""}${stretch ? ' preserveAspectRatio="none"' : ""} aria-hidden="true" focusable="false">`;

// A wobbly hand-drawn rectangle that stretches to any size.
const frame = (inside = "") =>
  svgOpen("sketch__frame", "0 0 100 100", true) +
  `<path d="M1.6 2.4C28 1.3 63 2.9 98.3 1.7c.6 30.4-.5 63.2.4 96.4-31.6.9-64.3-.4-96.6.5-.8-31.8.4-64.4-.5-96.2z"/>` +
  inside +
  `</svg>`;

// The X that marks "a picture goes here".
const cross = `<path class="sketch__faint" d="M4 5C35 34 66 64 95.5 95.5M95.8 4.6C66 35 36 64 4.4 95.2"/>`;

// A circled play triangle.
const play = (size, cls = "sketch__play") =>
  svgOpen(cls, "0 0 48 48", false, size) +
  `<path d="M24 4.5c10.6-.3 19.3 8.6 19.4 19.2.2 10.8-8.4 19.6-19.2 19.8C13.4 43.7 4.4 35.1 4.5 24.3 4.6 13.6 13.1 4.8 24 4.5z"/>` +
  `<path d="M19.2 15.6c5 2.6 9.8 5.4 14.4 8.6-4.7 3-9.4 5.9-14.3 8.4-.3-5.7-.4-11.3-.1-17z"/>` +
  `</svg>`;

// A scribbled waveform (same squiggle every build).
const waveform = (() => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let d = "M0 12";
  for (let x = 2; x <= 240; x += 2) {
    const envelope = 2 + 9 * Math.abs(Math.sin(x / 23)) * (0.55 + 0.45 * Math.sin(x / 61 + 1));
    const y = 12 + (x % 4 === 0 ? -1 : 1) * envelope * (0.4 + 0.6 * rand());
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return svgOpen("sketch-audio__wave", "0 0 240 24", true) + `<path d="${d}"/></svg>`;
})();

const note = (text) => `<span class="sketch__note">${text}</span>`;

/* -------------------------------------------------------------------------- */

export function image({ src = "", alt = "", caption = "", ratio = "4/3", width, height, loading = "lazy" } = {}) {
  if (!src) {
    return `<figure class="figure">
<div class="sketch" style="aspect-ratio: ${ratioCss(ratio)}" role="img" aria-label="Placeholder image: ${escapeAttr(alt)}">
${frame(cross)}
<span class="sketch__label">${escapeAttr(alt)}</span>
${note(`placeholder &middot; ${ratioLabel(ratio)}`)}
</div>
${figcaption(caption, true)}
</figure>`;
  }
  const size = width && height ? ` width="${Number(width)}" height="${Number(height)}"` : "";
  return `<figure class="figure"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${size} loading="${escapeAttr(loading)}" decoding="async">${figcaption(caption)}</figure>`;
}

export function video({ youtube = "", vimeo = "", src = "", poster = "", title = "Video", caption = "", ratio = "16/9" } = {}) {
  const aspect = `aspect-ratio: ${ratioCss(ratio)}`;
  let player = "";

  if (youtube) {
    player = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId(youtube))}" title="${escapeAttr(title)}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  } else if (vimeo) {
    player = `<iframe src="https://player.vimeo.com/video/${encodeURIComponent(vimeoId(vimeo))}?dnt=1" title="${escapeAttr(title)}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  } else if (src) {
    const posterAttr = poster ? ` poster="${escapeAttr(poster)}"` : "";
    player = `<video controls preload="metadata" src="${escapeAttr(src)}"${posterAttr}>Your browser can't play this video. <a href="${escapeAttr(src)}">Download it</a>.</video>`;
  }

  if (player) {
    return `<figure class="media"><div class="media__frame" style="${aspect}">${player}</div>${figcaption(caption)}</figure>`;
  }

  return `<figure class="media">
<div class="sketch sketch--video" style="${aspect}" role="img" aria-label="Placeholder video: ${escapeAttr(title)}">
${frame()}
${play(56)}
<span class="sketch__label">${escapeAttr(title)}</span>
${note(`placeholder video &middot; ${ratioLabel(ratio)} &middot; YouTube, Vimeo or MP4`)}
</div>
${figcaption(caption, true)}
</figure>`;
}

export function audio({ src = "", title = "Audio clip", caption = "" } = {}) {
  const label = `<b>${title}</b>${caption ? ` &mdash; ${caption}` : ""}`;

  if (src) {
    return `<figure class="audio"><figcaption>${label}</figcaption><audio controls preload="none" src="${escapeAttr(src)}"><a href="${escapeAttr(src)}">Download ${escapeAttr(title)}</a></audio></figure>`;
  }

  return `<figure class="audio">
<figcaption class="ph">${label}</figcaption>
<div class="sketch-audio" role="img" aria-label="Placeholder audio player: ${escapeAttr(title)}">
${play(34, "sketch-audio__play")}
${waveform}
<span class="sketch-audio__time">0:00</span>
${note("placeholder audio")}
</div>
</figure>`;
}

export function embed({ src = "", title = "Embedded media", caption = "", height = 152, ratio = "" } = {}) {
  const size = ratio ? `aspect-ratio: ${ratioCss(ratio)}` : `height: ${Number(height)}px`;

  if (src) {
    return `<figure class="media"><div class="media__frame media__frame--embed" style="${size}"><iframe src="${escapeAttr(src)}" title="${escapeAttr(title)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>${figcaption(caption)}</figure>`;
  }

  return `<figure class="media">
<div class="sketch sketch--embed" style="${size}" role="img" aria-label="Placeholder embedded player: ${escapeAttr(title)}">
${frame()}
${play(40)}
<span class="sketch__label">${escapeAttr(title)}</span>
${note("placeholder embed &middot; e.g. Bandcamp, Spotify or SoundCloud")}
</div>
${figcaption(caption, true)}
</figure>`;
}
