// Curly quotes and apostrophes in the text of every page, however they were
// typed: "it's" becomes "it’s", and 'quotes' and "quotes" become ‘quotes’ and
// “quotes”, and a hyphen used as a dash (" - ") becomes an en dash (" – ").
// Only the text between tags changes; tags and their attributes,
// and anything inside <script>, <style>, <pre>, <code> or <textarea>, are
// left exactly as they are.

const SKIP = /^<(script|style|pre|code|textarea)\b/i;

export function curl(text) {
  return text
    .replace(/ - /g, " – ") // a hyphen with a space either side, used as a dash
    .replace(/'(?=\d\ds\b)/g, "’") // ’90s
    .replace(/(\w)'(?=\w)/g, "$1’") // it’s, Chris’s
    .replace(/(^|[\s([–—])'/g, "$1‘") // an opening quote
    .replace(/'/g, "’") // every other one closes (Des’, the series’)
    .replace(/(^|[\s([–—])"/g, "$1“")
    .replace(/"/g, "”");
}

export function smartQuotes(html) {
  let skipping = null;
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (skipping) {
          if (part.toLowerCase().startsWith(`</${skipping}`)) skipping = null;
        } else {
          const tag = part.match(SKIP);
          if (tag && !part.endsWith("/>")) skipping = tag[1].toLowerCase();
        }
        return part;
      }
      return skipping ? part : curl(part);
    })
    .join("");
}
