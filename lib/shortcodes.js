// Media components, usable on any page:
//
//   {% image { src: "/assets/img/me.jpg", alt: "Me holding a microphone", caption: "(me)", ratio: "3/4" } %}
//   {% video { youtube: "https://youtu.be/VIDEO_ID", title: "Sound Design Reel", caption: "…" } %}
//   {% video { vimeo: "123456789", title: "…" } %}      or  {% video { src: "/assets/video/clip.mp4", title: "…" } %}
//   {% audio { src: "/assets/audio/clip.mp3", title: "Hub ambience", caption: "loop, 1:30" } %}
//   {% embed { src: "https://bandcamp.com/EmbeddedPlayer/…", title: "Bandcamp player", height: 120 } %}
//
// Leave src / youtube / vimeo empty ("") and a labelled PLACEHOLDER is drawn
// instead, at the same size, so nothing shifts when the real thing goes in.

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

// Little "image" icon, like the one old browsers drew while a picture loaded.
const pictureIcon = `<svg class="ph-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><rect x=".5" y="1.5" width="15" height="13" fill="#fff" stroke="#808080"/><rect x="2" y="3" width="12" height="10" fill="#9cf"/><circle cx="11" cy="6" r="1.5" fill="#fc0"/><path d="M2 13l4-6 3 4 2-2 3 4z" fill="#090"/></svg>`;

// Bevelled grey "play" button (Windows 9x-style), for media placeholders.
const playButton = (w, h, cls) =>
  `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false" shape-rendering="crispEdges">` +
  `<rect width="${w}" height="${h}" fill="#c0c0c0"/>` +
  `<path d="M0 0h${w}v1H1v${h - 1}H0z" fill="#fff"/>` +
  `<path d="M${w - 1} 1h1v${h - 1}H0v-1h${w - 1}z" fill="#000"/>` +
  `<path d="M${w - 2} 2h1v${h - 3}H1v-1h${w - 3}z" fill="#808080"/>` +
  `<path d="M${Math.round(w * 0.4)} ${Math.round(h * 0.28)}v${Math.round(h * 0.44)}l${Math.round(h * 0.38)}-${Math.round(h * 0.22)}z" fill="#000" shape-rendering="auto"/>` +
  `</svg>`;

/* -------------------------------------------------------------------------- */

export function image({ src = "", alt = "", caption = "", ratio = "4/3", width, height, loading = "lazy" } = {}) {
  if (!src) {
    return `<figure class="figure">
<div class="ph-media ph-image" style="aspect-ratio: ${ratioCss(ratio)}" role="img" aria-label="Placeholder image: ${escapeAttr(alt)}">
<span class="ph-media__alt">${pictureIcon}<span>${escapeAttr(alt)}</span></span>
<span class="ph-media__tag">Placeholder image &middot; ${ratioLabel(ratio)}</span>
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
<div class="ph-media ph-video" style="${aspect}" role="img" aria-label="Placeholder video: ${escapeAttr(title)}">
${playButton(46, 32, "ph-video__play")}
<span class="ph-media__label">${escapeAttr(title)}</span>
<span class="ph-media__tag">Placeholder video &middot; ${ratioLabel(ratio)} &middot; YouTube, Vimeo or MP4</span>
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
<div class="ph-audio" role="img" aria-label="Placeholder audio player: ${escapeAttr(title)}">
${playButton(26, 22, "ph-audio__btn")}
<span class="ph-audio__track" aria-hidden="true"></span>
<span class="ph-audio__time" aria-hidden="true">0:00</span>
<span class="ph-media__tag">Placeholder audio</span>
</div>
</figure>`;
}

export function embed({ src = "", title = "Embedded media", caption = "", height = 152, ratio = "" } = {}) {
  const size = ratio ? `aspect-ratio: ${ratioCss(ratio)}` : `height: ${Number(height)}px`;

  if (src) {
    return `<figure class="media"><div class="media__frame media__frame--embed" style="${size}"><iframe src="${escapeAttr(src)}" title="${escapeAttr(title)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>${figcaption(caption)}</figure>`;
  }

  return `<figure class="media">
<div class="ph-media ph-embed" style="${size}" role="img" aria-label="Placeholder embedded player: ${escapeAttr(title)}">
<span class="ph-media__alt">${playButton(26, 22, "ph-embed__btn")}<span>${escapeAttr(title)}</span></span>
<span class="ph-media__tag">Placeholder embed &middot; e.g. Bandcamp, Spotify or SoundCloud</span>
</div>
${figcaption(caption, true)}
</figure>`;
}
