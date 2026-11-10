// Template filters. Each export becomes a Nunjucks filter of the same name.

const toDate = (value) => (value instanceof Date ? value : new Date(value));

/** 2026-11-10 -> "10 November 2026" */
export function readableDate(value) {
  return toDate(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** 2026-11-10 -> "2026-11-10" (for <time datetime="">) */
export function isoDate(value) {
  return toDate(value).toISOString().slice(0, 10);
}

/** True when `url` is inside the section that starts at `sectionUrl`. */
export function inSection(url, sectionUrl) {
  return typeof url === "string" && url.startsWith(sectionUrl);
}

/**
 * Previous / next links between the sub-pages of a navigation group,
 * e.g. the five Video Game Sound Design pages. Wraps around, webring-style.
 */
export function pager(navigation, url) {
  for (const item of navigation) {
    const children = item.children || [];
    const i = children.findIndex((child) => child.url === url);
    if (i !== -1) {
      const n = children.length;
      return {
        parent: item,
        prev: children[(i - 1 + n) % n],
        next: children[(i + 1) % n],
      };
    }
  }
  return null;
}
