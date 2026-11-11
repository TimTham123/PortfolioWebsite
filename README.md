# Portfolio website

Callum Tham's portfolio, designed as a stitched notebook. Every page is a sheet
of almost-white paper with a green-threaded spine down the left and a red
margin line separating the index (the nav) from the page. The frame of the
page is handwritten: the `<title>Callum Tham</title>` heading, the nav, page
titles, captions and notes. The body text is set in a clean typeface so it
stays professional. The layout follows the original reference: a
right-aligned nav, a text column and a column of images.

It's a traditional multi-page site: every page is its own HTML file. It's built
with [Eleventy](https://www.11ty.dev/), which assembles the pages from a shared
layout so the navigation and footer only have to be written once. The finished
site is plain HTML and CSS plus one small script. Its two fonts are stored in
the site itself, and it uses no CDNs or trackers, so nothing can break when an
outside service changes or goes away.

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
│   │   └── project.njk    ← base + ← previous | next → links, for game projects
│   └── partials/          ← title row, nav, footer and the page date
├── assets/
│   ├── css/style.css      ← all the styling, with comments
│   ├── js/site.js         ← dropdown toggle (the only script)
│   ├── fonts/             ← Reenie Beanie + IBM Plex Sans (open-licence fonts)
│   └── img/               ← put your images here
├── index.njk              ← About Me (the home page)
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

- `name`: the handwritten `<title>` at the top of every page, and the
  browser tab.
- `footerText`: the line in the footer, e.g. `"Callum Tham Sound Design"`. The
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
updated: 2026-11-10           # the date written at the top right of the page
placeholder: true             # adds "placeholder page" next to the date
figures:                      # images in the right-hand column (optional)
  - src: /assets/img/cyberpedia-key-art.jpg
    alt: Cyberpedia key art
    caption: (key art)
    ratio: 3/4
---
<h1>Cyberpedia</h1>             ← drawn by hand, as <h1> Cyberpedia </h1>
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

With an empty `src`, `youtube` or `vimeo` (`""`), each one draws a pencil
sketch of the thing at the same size: a box with an X for a photo, a box with
a play button for a video, a scribbled waveform for audio. When you fill it in, the placeholder becomes the
real thing and nothing else on the page moves. Put your own files in
`src/assets/` (for example `src/assets/audio/`). For the `embed`, paste the
`src` from the player's "embed" code on Bandcamp, Spotify or SoundCloud.

## Finding and replacing placeholder content

All of the current text and media is placeholder. It's marked so you can find
it on the page and in the code:

| On the page | In the code |
| --- | --- |
| Grey "pencil" text with a red *placeholder* note in the margin | `<div class="ph">` (with a `<!-- PLACEHOLDER -->` comment above it) |
| Short bits in grey pencil | `<span class="ph">`, and captions of placeholder images |
| Pencil sketch labelled *placeholder* | `{% image %}`, `{% video %}`, `{% audio %}` or `{% embed %}` with no file/URL |
| `[square brackets]` | facts to fill in, such as `[City]` or `[2025]` |
| "· placeholder page" next to the date | `placeholder: true` at the top of the page |

Once a section is real, removing its `class="ph"` turns it from pencil into ink.

When a section is finished, delete its `class="ph"` (or the wrapper `div`) and
its comment. To preview the site without any markers, set
`"showPlaceholderMarkers": false` in `src/_data/site.json`.

Every external link (YouTube, Instagram, itch.io and so on) currently goes to the
platform's home page, and the email address is `hello@example.com`. Swap in your own.

## How it's designed

**References.** Handwritten HTML in notebooks: a kraft-paper notebook with a
stab-bound spine and code written in three pens, and a page of HTML in blue
ballpoint. The layout keeps the original reference site's structure.

| | |
| --- | --- |
| Paper | almost-white `#fbfaf6`, with a faint fibre grain |
| Spine | shaded strip, crease, pale green thread through stitch holes |
| Margin line | printed red rule `#e2a19b` between the nav and the page |
| Ink | warm black `#2b211a` for text, pencil `#57524b` for notes and drafts |
| Pens | blue `#2a3c96` for links, red `#a82a22` for circles, underlines and tags |
| Handwriting | Reenie Beanie: title, nav, page titles, captions, notes, footer |
| Body text | IBM Plex Sans, 17px on a 1.6 line |
| Marks | current page circled in red; section headings underlined in red |
| Columns (wide screens) | nav, 40px gutter with the margin line, 660px text, 40px, 230px images |

**Responsive.** Wide screens (1120px and up) get the three columns. Between
760px and 1120px the images move below the text. Below 760px it's one
column with a narrower spine: the title and the menu sit on top, divided from
the page by a pencil line.

**The dropdown.** "Video Game Sound Design" is a link to its own overview page.
The hand-drawn `[+]` box next to it opens the five project pages underneath. It
works by click, tap or keyboard (Enter/Space; Escape closes it), not on hover,
so nothing jumps around as the mouse passes. It's open automatically when
you're on one of those pages, except on phones, where it starts closed to keep
the page content near the top. Without JavaScript the five pages are simply
always listed.

**Accessibility.** The site has a skip link, a labelled nav with
`aria-current` on the current page, a real `<button>` with `aria-expanded` for
the dropdown, visible dashed focus outlines, colour contrast at WCAG AA or
better, and alt text on every image. The decorative code tags are hidden from
screen readers.

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
