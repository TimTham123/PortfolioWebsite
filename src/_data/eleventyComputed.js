// Worked out for every page.
//
// shareImage: the picture shown when the page's link is shared (messages,
// social media). A page can choose one with `share:` at the top
// ({ url, width, height, alt }, as Sounds Of does); otherwise it's the page's
// first picture from media/ (the Sound Design projects), at 960px wide; and
// otherwise base.njk uses the signature card (/assets/img/share.png).

import path from "node:path";
import Image from "@11ty/eleventy-img";

export default {
  shareImage: async (data) => {
    if (data.share) return data.share;
    const first = data.figures && data.figures[0];
    if (!first || !first.src || !first.src.startsWith("media/")) return null;
    const folder = path.dirname(path.relative("media", first.src)).split(path.sep).join("/");
    // The same names the {% image %} shortcode gives the resized pictures.
    const stats = await Image(first.src, {
      statsOnly: true,
      widths: [480, 960, 1920],
      formats: ["jpeg"],
      urlPath: `/assets/media/${folder}/`,
      outputDir: `_site/assets/media/${folder}/`,
      filenameFormat: (id, file, width, format) => `${path.basename(file, path.extname(file))}-${width}.${format}`,
    });
    const jpeg = stats.jpeg.find((size) => size.width === 960) || stats.jpeg[stats.jpeg.length - 1];
    return { url: jpeg.url, width: jpeg.width, height: jpeg.height, alt: first.alt || "" };
  },
};
