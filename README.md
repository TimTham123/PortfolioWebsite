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
│   ├── sounds-of.csv      ← every Sounds Of stop on the road (drives the map)
│   ├── sounds-of-routes.json ← the roads between stops (npm run routes)
│   ├── soundsOf.js        ← places the stops and roads on the map
│   ├── travel.js          ← builds the Travel gallery from media/travel/
│   └── build.js           ← the year, and a version tag for the CSS/JS links
├── _includes/
│   ├── layouts/
│   │   ├── base.njk       ← the page: signature, index | text | images, footer
│   │   └── project.njk    ← base + ← previous / next → links, for sub-pages
│   └── partials/          ← signature, nav, footer, page date, Sounds Of map
├── assets/
│   ├── css/style.css      ← all the styling, with comments
│   ├── js/site.js         ← dropdown toggles
│   ├── js/sounds-of-map.js ← the map's markers, popup, timeline, route and zoom
│   ├── js/travel.js       ← Travel: the photo popup, videos that play as you scroll
│   ├── fonts/             ← Instrument Sans + Reenie Beanie (open-licence fonts)
│   └── img/               ← put your images here
│                            Me
├── index.njk              ← About Me (the home page)            /
├── interests/
│   ├── index.njk          ← Interests overview                 /interests/
│   ├── music.njk                                               /interests/music/
│   ├── climbing.njk                                            /interests/climbing/
│   ├── cat.njk                                                 /interests/cat/
│   └── travel.njk         ← photo and video gallery            /interests/travel/
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
lib/                       ← media components, filters, CSV reader, map outline and projection,
                             and sounds-of.js (reads the trip from the CSV; where it ends)
media/travel/              ← the Travel photos and videos
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
wide: true                    # (optional) run on past the right-hand margin, like Sounds Of and Travel
figures:                      # images beside the text (optional)
  - src: /assets/img/cyberpedia-key-art.jpg
    alt: Cyberpedia key art
    caption: (key art)
    ratio: 3/4
---
<h1 class="visually-hidden">Cyberpedia</h1>
<p class="standfirst">The grey line at the top.</p>
…
```

Everything is the same size. A heading is just a black line with a blank line
above it, and the text follows straight underneath. Page titles aren't shown
(the index already shows where you are), but each page keeps one, hidden with
`class="visually-hidden"`, for screen readers and search engines.

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

### The Sounds Of map

The map on the Sounds Of page is drawn from `src/_data/sounds-of.csv`. It's a
plain spreadsheet: open it in Excel, Numbers or Google Sheets, edit it, and
save it as CSV with the same name. Each row is a stop on the road. These are
the column headings (the order doesn't matter):

| Column | Example | Notes |
| --- | --- | --- |
| `date` | `2026-03-01` or `1/3/2026` | day/month/year is fine |
| `name` | `Grub` | the artist. Leave it empty for a stop with no episode yet (an empty marker) |
| `location` | `Gippsland, VIC` | the state at the end picks the marker colour |
| `latitude` | `-38.20` | in Google Maps, right-click the place and click the numbers to copy them |
| `longitude` | `146.54` | |
| `youtube` | `https://www.youtube.com/watch?v=qX9Ej2ddQ5k` | the full link or just the ID |
| `description` | `Grub is a singer-songwriter…` | a sentence or two |
| `via` | `Hughenden -20.84 144.2` | optional: towns the road goes through on the way to this stop (name, latitude, longitude; separate several with `;`) |

Stops are sorted by date, and that order is the route. A stop with no date
stays where it is in the list, straight after the row above it. After the
last stop, the route drives home to Melbourne (to change that, edit `HOME` in
`lib/sounds-of.js`). Each leg follows the roads, using driving routes saved in
`src/_data/sounds-of-routes.json` (from OpenStreetMap, via the free OSRM
router). After adding or moving stops, or changing a `via`, fetch the new
legs with:

```bash
npm run routes
```

Until you do, a new leg is drawn as a gentle curve. The whole route shows as
a faint dotted line, and inks itself in solid black as you move through the
stops; the coast is drawn in pencil grey so the two don't get mixed up.

The current file was built from the videos on the Sounds Of YouTube channel:
names, dates and the first lines of each description, with approximate
coordinates. The Big Dance Festival and Gippsland locations are guesses. The
empty stops (Brisbane, Mount Isa, Uluru, Kalgoorlie and two in Adelaide) have
no dates yet; Uluru is placed between Alice Springs and Darwin.

The episode list under the map is made from the same file, so it always
matches. The outline of Australia is generated from Natural Earth's public
domain coastline (`lib/australia-map.js`); there's no need to touch it.

### The Travel page

The Travel page has no text, just a grid of photos and videos. To fill it,
put your files in `media/travel/`:

- **Photos** (`.jpg`, `.png`, `.webp`) go in at full size. The build makes
  smaller copies for the grid, and clicking a photo opens the large one.
  Export iPhone photos as JPEG (HEIC won't work).
- **Videos** (`.mp4` is safest) are used as they are, so keep them small:
  under about 50 MB each, 1080p or less.
- **Order** follows the file names, so number them: `001.jpg`, `002.jpg`…
  The first video goes in the second and third rows, filling the middle two
  columns; the others are spread evenly down the page.
- **Descriptions**: a file name such as `014-kalgoorlie-sunset.jpg` becomes
  "Kalgoorlie sunset" for screen readers.

The grid is four photos across (three or two on smaller screens) and runs on
past the usual right-hand margin. Each photo is a 3:2 tile, cropped to fit;
clicking it opens the whole photo in a popup, closed with the × in its corner
or a click anywhere else. Portrait photos take two tiles, one above the
other, and each video takes four, two across and two down. Videos play by
themselves as you scroll to them and pause when you scroll past, carrying on
from the same point when you come back. Browsers only allow that with the
sound off, so they start muted; once a visitor turns the sound on, the rest
play with sound.
Until you add files, `placeholder-photo.jpg` and `placeholder-video.mp4` are
repeated to show the layout (100 photos, 3 videos). Once there's a real photo
they're ignored, and the same goes for the video once there's a real video.
Delete them when you're done.

## Finding and replacing placeholder content

All of the current text and media is placeholder. It's marked so you can find
it on the page and in the code:

| On the page | In the code |
| --- | --- |
| A small handwritten *placeholder* note in washed-out red beside the text | `<div class="ph">` (with a `<!-- PLACEHOLDER -->` comment above it) |
| Bracketed bits like `[2025]` | `<span class="ph">`, and captions of placeholder images |
| Grey box marked *placeholder* | `{% image %}`, `{% video %}`, `{% audio %}` or `{% embed %}` with no file/URL |
| `[square brackets]` | facts to fill in, such as `[City]` or `[2025]` |
| "· placeholder content" in the footer | `placeholder: true` at the top of the page |
| The same photo and video repeated on the Travel page | `media/travel/placeholder-photo.jpg` and `placeholder-video.mp4` |

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
| Placeholders | washed-out red notes `#a85555`, grey boxes `#f2f2f2`, small handwritten notes |
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
