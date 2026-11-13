// Media components, usable on any page:
//
//   {% image { src: "media/sound-design/okiro/crate.jpg", alt: "…", caption: "…" } %}
//   {% image { src: "/assets/img/me.jpg", alt: "Me holding a microphone", caption: "(me)", ratio: "3/4" } %}
//   {% video { youtube: "https://youtu.be/VIDEO_ID", title: "Sound Design Reel", caption: "…" } %}
//   {% video { vimeo: "123456789", title: "…" } %}      or  {% video { src: "/assets/video/clip.mp4", title: "…" } %}
//   {% audio { src: "/assets/audio/clip.mp3", title: "Hub ambience", caption: "loop, 1:30" } %}
//   {% soundcloud { track: "1800618249", title: "Stalker loop", caption: "…" } %}
//   {% embed { src: "https://bandcamp.com/EmbeddedPlayer/…", title: "Bandcamp player", height: 120 } %}
//
// Leave src / youtube / vimeo / track empty ("") and a plain grey placeholder
// box is drawn instead, at the same size, so nothing shifts when the real
// thing goes in.

import path from "node:path";
import Image from "@11ty/eleventy-img";
import { youtubeId, watchUrl } from "./youtube.js";

// Pictures kept in the media/ folder (e.g. media/sound-design/okiro/crate.jpg)
// are resized when the site is built (480, 960 and 1920 pixels wide, WebP and
// JPEG), so big screenshots are fine. They open bigger in a popup when clicked.
const MEDIA_DIR = "media";
const MEDIA_WIDTHS = [480, 960, 1920];
// How wide a picture beside the text shows: a 15rem column on a big screen;
// three, then two, across under the text on smaller ones (see style.css).
const FIGURE_SIZES = "(max-width: 759.98px) 50vw, (max-width: 1099.98px) 33vw, 15rem";

function resize(src) {
  const folder = path.dirname(path.relative(MEDIA_DIR, src)).split(path.sep).join("/");
  return Image(src, {
    widths: MEDIA_WIDTHS,
    formats: ["webp", "jpeg"],
    outputDir: `_site/assets/media/${folder}/`,
    urlPath: `/assets/media/${folder}/`,
    filenameFormat: (id, file, width, format) => `${path.basename(file, path.extname(file))}-${width}.${format}`,
  });
}

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

/** Accepts a Vimeo ID or URL. */
const vimeoId = (value) => {
  const match = String(value).match(/(\d{6,})/);
  return match ? match[1] : String(value).trim();
};

// A small play triangle.
const playIcon = `<svg class="ph-play" viewBox="0 0 10 12" width="10" height="12" aria-hidden="true" focusable="false"><path d="M0 0l10 6-10 6z"/></svg>`;
// The play button on a video's picture.
const bigPlayIcon = `<svg viewBox="0 0 10 12" width="17" height="20" focusable="false"><path d="M0 0l10 6-10 6z"/></svg>`;

// Placeholder notes are the site's one other handwritten touch.
const note = (text) => `<span class="ph-note">${text}</span>`;

/* -------------------------------------------------------------------------- */

export async function image({ src = "", alt = "", caption = "", ratio = "4/3", width, height, loading = "lazy", sizes = FIGURE_SIZES, zoom = true } = {}) {
  if (src && src.startsWith(`${MEDIA_DIR}/`)) {
    const { webp, jpeg } = await resize(src);
    const big = jpeg[jpeg.length - 1];
    const srcset = (list) => list.map((size) => size.srcset).join(", ");
    const picture = `<picture><source type="image/webp" srcset="${srcset(webp)}" sizes="${escapeAttr(sizes)}"><img src="${jpeg[0].url}" srcset="${srcset(jpeg)}" sizes="${escapeAttr(sizes)}" width="${big.width}" height="${big.height}" alt="${escapeAttr(alt)}" loading="${escapeAttr(loading)}" decoding="async"></picture>`;
    const body = zoom ? `<a class="figure__zoom" href="${big.url}">${picture}</a>` : picture;
    return `<figure class="figure">${body}${figcaption(caption)}</figure>`;
  }
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

// A YouTube video starts as its picture with a play button: a link to the
// video on YouTube. site.js swaps in the player when it's pressed, so a page
// with lots of videos stays quick and YouTube's player (and its cookies) only
// loads for the videos someone plays. `thumb` picks the picture: YouTube's
// big one ("maxresdefault") by default; "sddefault" or "hqdefault" for the
// odd video that doesn't have one (it shows as a small grey box); or
// "maxres1", "maxres2", "maxres3" for a frame from a quarter, half or three
// quarters of the way through, when the usual picture isn't a good one.
export function video({ youtube = "", vimeo = "", src = "", poster = "", title = "Video", caption = "", ratio = "16/9", thumb = "maxresdefault" } = {}) {
  const aspect = `aspect-ratio: ${ratioCss(ratio)}`;
  let player = "";

  if (youtube) {
    const id = youtubeId(youtube);
    player = `<a class="yt" href="${escapeAttr(watchUrl(id))}" data-yt="${escapeAttr(id)}" data-title="${escapeAttr(title)}"><img src="https://i.ytimg.com/vi/${encodeURIComponent(id)}/${encodeURIComponent(thumb)}.jpg" alt="" loading="lazy" decoding="async"><span class="yt__play" aria-hidden="true">${bigPlayIcon}</span><span class="visually-hidden">Play video: ${escapeAttr(title)}</span></a>`;
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

// A SoundCloud player for one track. `track` is the number in the track's
// embed code (…/tracks/1800618249); a private track also needs its
// `secret` (the s-… part of its private link).
export function soundcloud({ track = "", secret = "", title = "SoundCloud track", caption = "" } = {}) {
  if (!track) return embed({ title, caption, height: 166 });
  const settings = new URLSearchParams({
    url: `https://api.soundcloud.com/tracks/${track}`,
    color: "#0a0a0a",
    auto_play: "false",
    hide_related: "true",
    show_comments: "false",
    show_user: "false",
    show_reposts: "false",
    show_teaser: "false",
    visual: "false",
  });
  if (secret) settings.set("secret_token", secret);
  return embed({ src: `https://w.soundcloud.com/player/?${settings}`, title: `${title} (SoundCloud player)`, caption, height: 166 });
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
