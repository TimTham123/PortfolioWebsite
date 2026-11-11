// Media components, usable on any page:
//
//   {% image { src: "/assets/img/me.jpg", alt: "Me holding a microphone", caption: "(me)", ratio: "3/4" } %}
//   {% video { youtube: "https://youtu.be/VIDEO_ID", title: "Sound Design Reel", caption: "…" } %}
//   {% video { vimeo: "123456789", title: "…" } %}      or  {% video { src: "/assets/video/clip.mp4", title: "…" } %}
//   {% audio { src: "/assets/audio/clip.mp3", title: "Hub ambience", caption: "loop, 1:30" } %}
//   {% embed { src: "https://bandcamp.com/EmbeddedPlayer/…", title: "Bandcamp player", height: 120 } %}
//
// Leave src / youtube / vimeo empty ("") and a plain grey placeholder box is
// drawn instead, at the same size, so nothing shifts when the real thing goes in.

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

// A small play triangle.
const playIcon = `<svg class="ph-play" viewBox="0 0 10 12" width="10" height="12" aria-hidden="true" focusable="false"><path d="M0 0l10 6-10 6z"/></svg>`;

// Placeholder notes are the site's one other handwritten touch.
const note = (text) => `<span class="ph-note">${text}</span>`;

/* -------------------------------------------------------------------------- */

export function image({ src = "", alt = "", caption = "", ratio = "4/3", width, height, loading = "lazy" } = {}) {
  if (!src) {
    return `<figure class="figure">
<div class="ph-box" style="aspect-ratio: ${ratioCss(ratio)}" role="img" aria-label="Placeholder image: ${escapeAttr(alt)}">
<span class="ph-box__label">${escapeAttr(alt)}</span>
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
<div class="ph-box ph-box--video" style="${aspect}" role="img" aria-label="Placeholder video: ${escapeAttr(title)}">
${playIcon}
<span class="ph-box__label">${escapeAttr(title)}</span>
${note(`placeholder video &middot; ${ratioLabel(ratio)}`)}
</div>
${figcaption(caption, true)}
</figure>`;
}

export function audio({ src = "", title = "Audio clip", caption = "" } = {}) {
  const label = `${title}${caption ? ` <span class="audio__detail">${caption}</span>` : ""}`;

  if (src) {
    return `<figure class="audio"><figcaption>${label}</figcaption><audio controls preload="none" src="${escapeAttr(src)}"><a href="${escapeAttr(src)}">Download ${escapeAttr(title)}</a></audio></figure>`;
  }

  return `<figure class="audio">
<figcaption>${label}</figcaption>
<div class="ph-audio" role="img" aria-label="Placeholder audio player: ${escapeAttr(title)}">
${playIcon}
<span class="ph-audio__track" aria-hidden="true"></span>
<span class="ph-audio__time" aria-hidden="true">0:00</span>
${note("placeholder")}
</div>
</figure>`;
}

export function embed({ src = "", title = "Embedded media", caption = "", height = 152, ratio = "" } = {}) {
  const size = ratio ? `aspect-ratio: ${ratioCss(ratio)}` : `height: ${Number(height)}px`;

  if (src) {
    return `<figure class="media"><div class="media__frame media__frame--embed" style="${size}"><iframe src="${escapeAttr(src)}" title="${escapeAttr(title)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>${figcaption(caption)}</figure>`;
  }

  return `<figure class="media">
<div class="ph-box ph-box--video" style="${size}" role="img" aria-label="Placeholder embedded player: ${escapeAttr(title)}">
${playIcon}
<span class="ph-box__label">${escapeAttr(title)}</span>
${note("placeholder &middot; e.g. Bandcamp, Spotify or SoundCloud")}
</div>
${figcaption(caption, true)}
</figure>`;
}
