# Portfolio website

Callum Tham's portfolio. A dead-simple site: a white page, one typeface at one
size, black and grey. The index (the nav) sits in the left column and the page
sits beside it. What you can click is grey and where you are is black. The one
handwritten touch is the signature at the top.

It's a traditional multi-page site: every page is its own HTML file. It's built
with [Eleventy](https://www.11ty.dev/), which assembles the pages from a shared
layout so the navigation and footer only have to be written once. The finished
site is plain HTML and CSS plus one small script. Its two fonts are stored in
the site itself, and it uses no CDNs or trackers, so nothing can break when an
outside service changes or goes away.

**Live site:** <https://timtham123.github.io/PortfolioWebsite/>

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
│   ├── site.json          ← your name, footer text, email, placeholder markers
│   ├── navigation.json    ← the index (sections, pages, dropdown items)
│   └── build.js           ← the year shown in the footer
├── _includes/
│   ├── layouts/
│   │   ├── base.njk       ← the page: signature, index | text | images, footer
│   │   └── project.njk    ← base + ← previous / next → links, for sub-pages
│   └── partials/          ← signature, nav, footer and the page date
├── assets/
│   ├── css/style.css      ← all the styling, with comments
│   ├── js/site.js         ← dropdown toggle (the only script)
│   ├── fonts/             ← Instrument Sans + Reenie Beanie (open-licence fonts)
│   └── img/               ← put your images here
│                            Me
├── index.njk              ← About Me (the home page)            /
├── interests/
│   ├── index.njk          ← Interests overview                 /interests/
│   ├── music.njk                                               /interests/music/
│   ├── climbing.njk                                            /interests/climbing/
│   └── cat.njk                                                 /interests/cat/
│                            Work
├── sounds-of.njk                                               /sounds-of/
├── sound-design/
│   ├── index.njk          ← Sound Design overview              /sound-design/
│   ├── reel.njk           ← Game Sound Design Reel             /sound-design/reel/
│   ├── alchemeow.njk                                           /sound-design/alchemeow/
│   ├── cyberpedia.njk                                          /sound-design/cyberpedia/
│   ├── okiro.njk                                               /sound-design/okiro/
│   ├── a-little-bit-of-gore.njk                                /sound-design/a-little-bit-of-gore/
│   └── hubworld.njk                                            /sound-design/hubworld/
├── social-media-strategy.njk                                   /social-media-strategy/
│
├── qualifications.njk     ← Qualifications and Additional Credits  /qualifications/
├── contact.njk                                                 /contact/
└── 404.njk                ← "Not Found" page
lib/                       ← the media components and template filters
```

## Everyday edits

### Your name and email

Edit `src/_data/site.json`:

- `name`: the handwritten signature at the top of every page, and the browser
  tab.
- `footerText`: the small line in the footer. The year is added automatically.
- `email`: used on the Contact page.

### Pages

Each page is a `.njk` file. It's HTML with a short settings block at the top:

```yaml
---
layout: layouts/base.njk      # project pages use layouts/project.njk
title: Cyberpedia             # browser tab title
description: One-line summary for search engines.
updated: 2026-11-10           # "Updated …" in the footer
placeholder: true             # adds "placeholder content" to that line
figures:                      # images beside the text (optional)
  - src: /assets/img/cyberpedia-key-art.jpg
    alt: Cyberpedia key art
    caption: (key art)
    ratio: 3/4
---
<h1>Cyberpedia</h1>
<p class="standfirst">The grey line under the title.</p>
…
```

Everything is the same size. A heading is just a black line with a blank line
above it, and the text follows straight underneath.

### The index (navigation)

Edit `src/_data/navigation.json`. The order there is the order in the index,
in three levels:

- **Sections** with no page of their own (`Me`, `Work`) show as black labels.
- **Pages** sit under them. A page with `children` (Interests, Sound Design)
  gets a `+` dropdown.
- **Sub-pages** sit under those, and get ← previous / next → links to each
  other.

A top-level item with a `url` (Qualifications and Additional Credits, Contact)
is a plain link. To add a page, create the `.njk` file and add a line for it
here. Its address follows its file name and folder, so
`src/sound-design/hubworld.njk` becomes `/sound-design/hubworld/`.

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

With an empty `src`, `youtube` or `vimeo` (`""`), each one draws a plain grey
placeholder box at the same size. When you fill it in, the placeholder becomes
the real thing and nothing else on the page moves. Put your own files in
`src/assets/` (for example `src/assets/audio/`). For the `embed`, paste the
`src` from the player's "embed" code on Bandcamp, Spotify or SoundCloud.

## Finding and replacing placeholder content

All of the current text and media is placeholder. It's marked so you can find
it on the page and in the code:

| On the page | In the code |
| --- | --- |
| A small handwritten *placeholder* note beside the text | `<div class="ph">` (with a `<!-- PLACEHOLDER -->` comment above it) |
| Short bits in grey | `<span class="ph">`, and captions of placeholder images |
| Grey box marked *placeholder* | `{% image %}`, `{% video %}`, `{% audio %}` or `{% embed %}` with no file/URL |
| `[square brackets]` | facts to fill in, such as `[City]` or `[2025]` |
| "· placeholder content" in the footer | `placeholder: true` at the top of the page |

When a section is finished, delete its `class="ph"` (or the wrapper `div`) and
its comment. To preview the site without any markers, set
`"showPlaceholderMarkers": false` in `src/_data/site.json`.

Every external link (YouTube, Instagram, itch.io and so on) currently goes to the
platform's home page, and the email address is `hello@example.com`. Swap in your own.

## How it's designed

**References.** [anthonyeslick.com](https://anthonyeslick.com/) and the sites
collected on [Dead Simple Sites](https://deadsimplesites.com/): no decoration,
one size of type, hierarchy from spacing and grey versus black.

| | |
| --- | --- |
| Page | white |
| Text | `#0a0a0a`, Instrument Sans, 17px on a 1.42 line, everywhere |
| Links | grey `#737373`; black and underlined when you point at them |
| Current page | black (and its section, on project pages) |
| Signature | your name in Reenie Beanie, top left |
| Placeholders | grey boxes `#f2f2f2`, small handwritten notes |
| Columns (wide screens) | index 16rem, 2rem gap, text 35rem, 2rem gap, images 15rem |

**Responsive.** Wide screens (1100px and up) get index | text | images.
Between 760px and 1100px the images move below the text. Below 760px it's one
column: signature, index, then the page.

**The index.** Me and Work are black labels with their pages indented
underneath; Qualifications and Additional Credits and Contact close the list.
Each level steps in a little, like an outline.

**The dropdowns.** "Interests" and "Sound Design" link to their own overview
pages. The `+` next to each opens its sub-pages underneath, indented. It works
by click, tap or keyboard (Enter/Space; Escape closes it), not on hover, so
nothing jumps around as the mouse passes. It's open automatically when you're
on one of those pages, except on phones, where it starts closed to keep the
page near the top. Without JavaScript the sub-pages are simply always listed.

**Accessibility.** The site has a skip link, a labelled nav with
`aria-current` on the current page, a real `<button>` with `aria-expanded` for
the dropdown, visible focus outlines, colour contrast at WCAG AA or better,
links spaced at least 24px apart, and alt text on every image.

## Putting it online

Any static host works. Build with `npm run build` and publish the `_site/`
folder.

- **GitHub Pages (set up):** `.github/workflows/deploy.yml` builds and publishes
  the site on every push, to <https://timtham123.github.io/PortfolioWebsite/>.
  Progress shows under the repo's **Actions** tab.
- **Netlify / Cloudflare Pages / Vercel:** build command `npm run build`,
  output directory `_site`.
- **Old-school:** upload the contents of `_site/` to any web server over FTP.
