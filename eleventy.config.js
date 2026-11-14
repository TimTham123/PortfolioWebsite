import { HtmlBasePlugin } from "@11ty/eleventy";
import * as filters from "./lib/filters.js";
import * as shortcodes from "./lib/shortcodes.js";
import { smartQuotes } from "./lib/typography.js";

export default function (eleventyConfig) {
  // Lets the site live in a sub-folder (e.g. GitHub Pages) via --pathprefix.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Static files are copied as-is: CSS, JS, images, audio, video…
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Travel videos are copied as they are; travel photos are resized by
  // src/_data/travel.js. Rebuild when the folder changes.
  eleventyConfig.addPassthroughCopy({ "media/travel/*.{mp4,webm,m4v,mov}": "assets/travel" });
  eleventyConfig.addWatchTarget("media/travel/");

  // Filters used by the templates (see lib/filters.js).
  for (const [name, fn] of Object.entries(filters)) {
    eleventyConfig.addFilter(name, fn);
  }

  // Media components: {% image %}, {% video %}, {% audio %}, {% embed %}.
  // Each one shows a labelled placeholder until it is given a real file/URL.
  for (const [name, fn] of Object.entries(shortcodes)) {
    eleventyConfig.addShortcode(name, fn);
  }

  // Curly quotes and apostrophes in every page's text (lib/typography.js).
  eleventyConfig.addTransform("smart-quotes", function (content) {
    return (this.page.outputPath || "").endsWith(".html") ? smartQuotes(content) : content;
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
