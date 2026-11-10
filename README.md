# Portfolio website

A personal portfolio with an early-web, hand-built feel: Times New Roman, blue
underlined links that turn purple once visited, engraved rules and a few
bevelled grey "system" details. It uses the three-column layout of the
reference: a right-aligned nav, a text column and a column of images, with
the footer at the bottom of the window.

It's a traditional multi-page site: every page is its own HTML file. It's built
with [Eleventy](https://www.11ty.dev/), which assembles the pages from a shared
layout so the navigation and footer only have to be written once. The finished
site is plain HTML and CSS plus one small script. It uses no web fonts, CDNs or
trackers, so nothing can break when an outside service changes or goes away.

## Running it

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
```

```bash
npm start
```

Then open <http://localhost:8080>. The page reloads as you save changes.

To build the finished site into the `_site/` folder:

```bash
npm run build
```

## Where things live

```
src/
├── _data/
│   ├── site.json          ← your name, footer text, email, logo, placeholder markers
│   ├── navigation.json    ← the menu (titles, order, dropdown items)
│   └── build.js           ← the year shown in the footer
├── _includes/
│   ├── layouts/
│   │   ├── base.njk       ← the page frame: nav | content | figures, footer
│   │   └── project.njk    ← base + « previous | next » links, for game projects
│   └── partials/          ← header, nav, footer and "last updated" line
├── assets/
│   ├── css/style.css      ← all the styling, with comments
│   ├── js/site.js         ← dropdown toggle (the only script)
│   └── img/               ← put your images here
├── index.njk              ← home page
├── sounds-of.njk
├── video-game-sound-design/
│   ├── index.njk          ← Video Game Sound Design overview
│   ├── sound-design-reel.njk
│   ├── cyberpedia.njk
│   ├── alchemeow.njk
│   ├── okiro.njk
│   └── a-little-bit-of-gore.njk
├── social-media-marketing.njk
├── my-music.njk
├── qualifications-and-other-credits.njk
├── contact.njk
└── 404.njk                ← "Not Found" page
lib/                       ← the media components and template filters
```

## Everyday edits

### Your name, email and logo

Edit `src/_data/site.json`:

- `name`: used in the browser tab, in the logo's description for screen
  readers, and at the top of the page on phones.
- `footerText`: the line in the footer, e.g. `"Your Name Sound Design"`. The
  year is added automatically.
- `email`: used on the Contact page.
- `logo`: the image in the bottom-right corner. Put your file in
  `src/assets/img/` and point this at it, e.g. `"/assets/img/logo.svg"`. It's
  shown at 190 × 90 px.

### Pages

Each page is a `.njk` file. It's HTML with a short settings block at the top:

```yaml
---
layout: layouts/base.njk      # project pages use layouts/project.njk
title: Cyberpedia             # browser tab title
description: One-line summary for search engines.
updated: 2026-11-10           # shown as "Last updated: …" at the bottom
placeholder: true             # adds "placeholder content" to that line
figures:                      # images in the right-hand column (optional)
  - src: /assets/img/cyberpedia-key-art.jpg
    alt: Cyberpedia key art
    caption: (key art)
    ratio: 3/4
---
<h1>Cyberpedia</h1>
<p class="standfirst">The italic line under the title.</p>
…
```

### The menu

Edit `src/_data/navigation.json`. The order there is the order in the menu.
Any item with `children` gets a `[+]` dropdown. To add a page, create the
`.njk` file and add a line for it here. Its address follows its file name, so
`src/my-music.njk` becomes `/my-music/`.

### Images, video and audio

Use these anywhere in a page:

```njk
{% image { src: "/assets/img/photo.jpg", alt: "What's in the photo", caption: "(caption)", ratio: "4/3" } %}

{% video { youtube: "https://youtu.be/VIDEO_ID", title: "Sound Design Reel", caption: "…" } %}
{% video { vimeo: "123456789", title: "…" } %}
{% video { src: "/assets/video/clip.mp4", title: "…" } %}

{% audio { src: "/assets/audio/ambience.mp3", title: "Hub ambience", caption: "loop, 1:30" } %}

{% embed { src: "https://bandcamp.com/EmbeddedPlayer/…", title: "Bandcamp player", height: 120 } %}
```

With an empty `src`, `youtube` or `vimeo` (`""`), each one draws a labelled
placeholder at the same size. When you fill it in, the placeholder becomes the
real thing and nothing else on the page moves. Put your own files in
`src/assets/` (for example `src/assets/audio/`). For the `embed`, paste the
`src` from the player's "embed" code on Bandcamp, Spotify or SoundCloud.

## Finding and replacing placeholder content

All of the current text and media is placeholder. It's marked so you can find
it on the page and in the code:

| On the page | In the code |
| --- | --- |
| Dashed frame with a `PLACEHOLDER` tag | `<div class="ph">` (with a `<!-- PLACEHOLDER -->` comment above it) |
| Yellow highlight on short text | `<span class="ph">`, and captions of placeholder images |
| Grey box or player labelled `PLACEHOLDER …` | `{% image %}`, `{% video %}`, `{% audio %}` or `{% embed %}` with no file/URL |
| `[square brackets]` | facts to fill in, such as `[City]` or `[2025]` |
| "· placeholder content" after Last updated | `placeholder: true` at the top of the page |

When a section is finished, delete its `class="ph"` (or the wrapper `div`) and
its comment. To preview the site without any markers, set
`"showPlaceholderMarkers": false` in `src/_data/site.json`.

Every external link (YouTube, Instagram, itch.io and so on) currently goes to the
platform's home page, and the email address is `hello@example.com`. Swap in your own.

## How it's designed

**References.** The look comes from the default styling of the early web (the
CERN "World Wide Web" page, and a hand-made mid-90s-style homepage). The layout
copies the reference screenshot: its column widths, positions and spacing were
measured and used directly.

| | |
| --- | --- |
| Background | `#f9f9f9` (from the layout reference) |
| Text | `#000`, Times New Roman / Times (system font) |
| Links | `#0000ee`, visited `#551a8b`, hover/active `#cc0000`, always underlined |
| Current page | grey `#666`, not underlined |
| Rules | engraved: `#9a9a9a` line over white |
| Details | Windows 9x greys `#c0c0c0` / `#808080`, selection in navy `#000080` |
| Body text | 17px on a 25px line, a full blank line between paragraphs |
| Nav | 18px, one item every 31.6px, right-aligned |
| Columns (wide screens) | nav, then 28px gap, 684px text, 28px gap, 226px images |
| Footer | about 104px tall, one centred line, logo 190 × 90 at the right |

**Responsive.** Wide screens (1120px and up) get the three columns. Between
760px and 1120px the images move below the text. Below 760px it's one
column, with your name and the menu at the top.

**The dropdown.** "Video Game Sound Design" is a link to its own overview page.
The `[+]` box next to it opens the five project pages underneath. It works by
click, tap or keyboard (Enter/Space; Escape closes it), not on hover, so nothing
jumps around as the mouse passes. It's open automatically when you're on one
of those pages, except on phones, where it starts closed to keep the page
content near the top. Without JavaScript the five pages are simply always listed.

**Accessibility.** The site has a skip link, a labelled nav with
`aria-current` on the current page, a real `<button>` with `aria-expanded` for
the dropdown, visible dotted focus outlines, colour contrast at WCAG AA or better,
and alt text on every image.

## Putting it online

Any static host works. Build with `npm run build` and publish the `_site/`
folder.

- **Netlify / Cloudflare Pages / Vercel:** build command `npm run build`,
  output directory `_site`.
- **GitHub Pages (set up):** `.github/workflows/deploy.yml` builds and publishes
  the site on every push, to <https://timtham123.github.io/PortfolioWebsite/>.
  One-time step: in the repo's **Settings → Pages**, set **Source** to
  **GitHub Actions**. Progress shows under the repo's **Actions** tab.
- **Old-school:** upload the contents of `_site/` to any web server over FTP.
