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
│   ├── site.json          ← your name, email, placeholder markers
│   ├── navigation.json    ← the index (sections, pages, dropdown items)
│   ├── sounds-of.csv      ← every Sounds Of stop on the road (drives the map)
│   ├── sounds-of-routes.json ← the roads between stops (npm run routes)
│   ├── soundsOf.js        ← places the stops and roads on the map
│   ├── travel.js          ← builds the Travel gallery from media/travel/
│   └── build.js           ← a version tag for the CSS/JS links
├── _includes/
│   ├── layouts/
│   │   ├── base.njk       ← the page: signature, index | text | images, footer
│   │   └── project.njk    ← base + ← previous / next → links, for sub-pages
│   └── partials/          ← signature, nav, footer, page date, Sounds Of map
├── assets/
│   ├── css/style.css      ← all the styling, with comments
│   ├── js/site.js         ← phone menu, dropdowns, picture popups, YouTube videos that load when played
│   ├── js/sounds-of-map.js ← the map's markers, popup, timeline, route and zoom
│   ├── js/travel.js       ← Travel: videos that play as you scroll (the photo popup is site.js's)
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
│   ├── index.njk          ← Sound Design overview (About Me links here) /sound-design/
│   ├── alchemeow.njk                                           /sound-design/alchemeow/
│   ├── cyberpedia.njk                                          /sound-design/cyberpedia/
│   ├── okiro.njk                                               /sound-design/okiro/
│   ├── a-little-bit-of-gore.njk                                /sound-design/a-little-bit-of-gore/
│   ├── hubworld.njk                                            /sound-design/hubworld/
│   └── feedra.njk         ← Feedra Prototype                   /sound-design/feedra/
├── social-media-marketing.njk                                  /social-media-marketing/
│
├── qualifications.njk     ← Qualifications and Additional Credits  /qualifications/
├── contact.njk                                                 /contact/
└── 404.njk                ← "Not Found" page
lib/                       ← media components, filters, CSV reader, map outline and projection,
                             and sounds-of.js (reads the trip from the CSV; where it ends)
media/travel/              ← the Travel photos and videos
media/sound-design/        ← pictures for the Sound Design pages, one folder per project
```

## Everyday edits

### Your name and email

Edit `src/_data/site.json`:

- `name`: the handwritten signature at the top of every page, and the browser
  tab.
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
signoff:                      # (optional) a handwritten quote at the very bottom, like About Me
  quote: Practicing an art…
  by: Kurt Vonnegut
figures:                      # pictures beside the text (optional)
  - src: media/sound-design/cyberpedia/bookworth.jpg
    alt: Bookworth, a book with glasses and a bow tie
    caption: Bookworth, your museum assistant.
---
<h1 class="page-title">Cyberpedia</h1>
<p class="standfirst">The grey line at the top.</p>
…
```

Text is all one size. A section starts with its heading (`<h2>`): a size
up, in medium weight, with a faint line and some room above it, so sections
stand apart; the text follows straight underneath. A sub-heading (`<h3>`) is
text-sized, in medium weight. For a label inside a
line, such as "Email:", use `<b>`. Each page starts with its title,
`<h1 class="page-title">`: it's hidden where the index sits beside the page
(the index already shows where you are), and handwritten at the top of the
page on phones. It's always there for screen readers and search engines.
(About Me's title is its greeting, "Hi, I'm Callum.", handwritten at every
size: `<h1 class="greeting">`. Sounds
Of's, "Sounds Of Australia", is handwritten and centred over the map at
every size: `<h1 class="sm-heading wide">`.)

### The index (navigation)

Edit `src/_data/navigation.json`. The order there is the order in the index,
in three levels:

- **Sections** with no page of their own (`Me`, `Work`) show as black labels.
- **Pages** sit under them. A page with `children` (Interests, Sound Design)
  gets a `+` dropdown. With `"link": false` (Interests, Sound Design) its name isn't a link:
  clicking it opens and closes the list instead. Once a dropdown has been
  open, it stays open from page to page until it's closed.
- **Sub-pages** sit under those, and get ← previous / next → links to each
  other.

A top-level item with a `url` (Qualifications and Additional Credits, Contact)
is a plain link. To add a page, create the `.njk` file and add a line for it
here. Its address follows its file name and folder, so
`src/sound-design/hubworld.njk` becomes `/sound-design/hubworld/`.

### Images, video and audio

Use these anywhere in a page:

```njk
{% image { src: "media/sound-design/okiro/crate.jpg", alt: "What's in the picture", caption: "(caption)" } %}
{% image { src: "/assets/img/photo.jpg", alt: "What's in the photo", caption: "(caption)", ratio: "4/3" } %}

{% video { youtube: "https://youtu.be/VIDEO_ID", title: "Okiro audio showcase", caption: "…" } %}
{% video { vimeo: "123456789", title: "…" } %}
{% video { src: "/assets/video/clip.mp4", title: "…" } %}

{% audio { src: "/assets/audio/ambience.mp3", title: "Hub ambience", caption: "loop, 1:30" } %}

{% soundcloud { track: "1800618249", title: "Stalker loop", caption: "…" } %}
{% soundcloud { track: "1926277409", secret: "s-1ooah7pqqAV", title: "Wonder", caption: "…" } %}

{% embed { src: "https://bandcamp.com/EmbeddedPlayer/…", title: "Bandcamp player", height: 120 } %}
```

With an empty `src`, `youtube`, `vimeo` or `track` (`""`), each one draws a
plain grey placeholder box at the same size. When you fill it in, the
placeholder becomes the real thing and nothing else on the page moves.

- **Pictures in `media/`** (like the Sound Design ones, in
  `media/sound-design/<project>/`) are resized when the site is built (480,
  960 and 1920 pixels wide, WebP and JPEG), so full-size screenshots are fine.
  Clicking one opens it bigger in a popup (× or a click outside closes it;
  the arrows, the arrow keys or a swipe go to the page's other pictures).
  Other files go in `src/assets/` and are used as they are.
- **YouTube videos** start as the video's picture with a play button, and the
  player loads (already playing) when it's pressed, so pages with lots of
  videos stay quick. If a video's picture is a poor one, add
  `thumb: "maxres1"` (or `"maxres2"`, `"maxres3"`) for a frame from a quarter,
  half or three quarters of the way through; for a video with no big picture
  (it shows as a small grey box), use `thumb: "sddefault"`.
- **SoundCloud**: `track` is the number in the track's embed code
  (`…/tracks/1800618249`); a private track also needs its `secret`, the `s-…`
  part of its private link.
- **Embeds**: paste the `src` from the player's "embed" code on Bandcamp or
  Spotify. Players from other sites (these and SoundCloud) load as they come
  near the screen rather than all at once with the page, since each is a few
  megabytes.

Two layouts help on busy pages: wrap videos in `<div class="media-grid">` to
put them two across where there's room, and use `<ul class="points">` for a
list of longer points (each gets a dash, and wrapped lines stay indented).

Lists of pages with pictures:

- **Music's releases** are a grid of covers (`<ul class="covers">`), four
  across (two on phones). The covers are in `media/music/`, from Spotify; for
  a new release, add its cover there and copy one of the `<li>`s.
- **Sound Design's projects** (`<ul class="projects">`) show a picture from
  each project's page beside its name, year and a line about it.
- **Interests** (`<dl class="index">`) lists each interest with a line about
  it.
- A long list can be folded away under a "+" with `<details class="more">`
  and a `<summary>` (as Qualifications does with every Sounds Of episode).

### The Sounds Of map

The map on the Sounds Of page is drawn from `src/_data/sounds-of.csv`. It's a
plain spreadsheet: open it in Excel, Numbers or Google Sheets, edit it, and
save it as CSV with the same name. Each row is a stop on the road. These are
the column headings (the order doesn't matter):

| Column | Example | Notes |
| --- | --- | --- |
| `date` | `2026-03-01` or `1/3/2026` | day/month/year is fine. A word such as `unreleased` shows instead of a date; leave it empty if you don't know it (the stop stays where it is in the list) |
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
stops; the coast is drawn in pencil grey so the two don't get mixed up. The
state borders are fainter pencil lines, and the timeline under the map names
the state each time the road crosses into a new one.

The map puts being easy to read ahead of being exact:

- No two markers ever touch. Markers stay the same size on screen at every
  zoom, so on a small map (a phone, or zoomed right out) places near each
  other would overlap. Whenever the map's size or zoom changes,
  `assets/js/sounds-of-map.js` spreads the dots out just enough to keep them
  18px apart, centre to centre (`SPACE`), each as near its real spot as it
  can be, and redraws the route to meet them. Zooming in brings them back
  to where they really are.
- Stops with the same latitude and longitude (the four Melbourne episodes,
  the two at the Big Dance Festival) are drawn as a short diagonal line of
  dots, and each dot can be clicked. The drive home ends on the first
  Melbourne dot, where the trip began.
- Without JavaScript, the dots in a line are `--pile-step` apart (in
  `style.css`), and places close enough to touch are nudged apart when the
  site is built (`MIN` in `src/_data/soundsOf.js`).
- To move a place, change its latitude and longitude in the CSV.

The current file was built from the videos on the Sounds Of YouTube channel:
names, dates and the first lines of each description, with approximate
coordinates. The Big Dance Festival stop sits north of Melbourne, and Des
Sheridan's east of Phillip Island, so neither crowds Melbourne. The
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
  Videos go in the middle two columns: the first in the second and third
  rows, and each one after that five rows of photos further down.
- **Descriptions**: a file name such as `014-kalgoorlie-sunset.jpg` becomes
  "Kalgoorlie sunset" for screen readers.

The grid is four photos across (three or two on smaller screens) and runs on
past the usual right-hand margin. Each photo is a 3:2 tile, cropped to fit;
clicking it opens the whole photo in a popup, closed with the × in its corner
or a click anywhere else, with arrows (or the arrow keys, or a swipe on a
phone) to go through the rest. Portrait photos take two tiles, one above the
other, and each video takes four, two across and two down. Videos play by
themselves, with the sound on, as they come onto the screen, and pause once
they've gone off it, carrying on from the same point when you come back. The
volume is how much of the video is on screen (half on screen, half volume),
so the sound fades out as a video scrolls away and back in as it returns;
the first time each video is heard, it also fades in over 3 seconds. Some
browsers won't play sound until a visitor has clicked or tapped the page:
until then the video plays silently with a "Turn sound on" button, and the
first click or tap anywhere brings the sound in. iPhones and iPads don't let
a website change a video's volume, so there the sound plays without the
fades.

The photos were resized to at most 2400px wide when they were added, with
their camera details stripped out (the site never shows them bigger than
1800px). If the folder is ever empty, any files named `placeholder-…` are
repeated to show the layout instead.

### Even video volume

Every video should sit at the same loud level: **-14 LUFS** (integrated),
with true peaks under **-1 dBTP**. That's what YouTube and Spotify play at,
so nothing on the site is quieter than it would be there.

- **The Travel videos** are the site's own files, and all three measure
  -14.1 LUFS, within 0.1 dB of each other. Before adding a new one, run it
  through `scripts/normalize-loudness.sh` (below).
- **The YouTube videos** (the Sound Design projects and the Sounds Of
  episodes) can't be evened out by the site: a page can only turn a YouTube
  player down, never past 100%, and Apple's phones and iPads ignore even
  that. YouTube itself turns videos louder than -14 LUFS down to that level,
  but leaves quieter ones as they are, so **a quiet video has to be made
  louder and uploaded again**. Then put its new link in the page (or the
  CSV, for an episode).

To find the quiet ones, open youtube.com in Chrome, press F12, choose
Console, type `allow pasting` if it asks, then paste the whole of
`scripts/youtube-loudness.js` and press Enter. It reads the loudness YouTube
works out for every video on the site (the "content loudness" in Stats for
nerds) and lists them, quietest first, with how many dB each needs turning
up. It only reads; nothing is changed.

To fix a video, either export it again from your editor at -14 LUFS (peaks
under -1 dBTP), or run the file through the script, which turns the sound up
or down by one steady amount without touching the picture (it needs
[ffmpeg](https://ffmpeg.org/)):

```bash
scripts/normalize-loudness.sh my-video.mp4
```

It writes `my-video-14lufs.mp4` next to it, ready to upload.

### Link previews

When a page's link is shared (messages, social media, LinkedIn), it shows the
page's title, its description and a picture: the page's first picture from
`media/` if it has one (the Sound Design projects), or one chosen with
`share:` at the top of the page (Sounds Of uses a snapshot of its map,
`src/assets/img/share-sounds-of.png`), or else a card with the signature
(`src/assets/img/share.png`). See `src/_data/eleventyComputed.js`.

## Finding and replacing placeholder content

Some text and media is still placeholder: things to fill in, marked in the
code. **Visitors never see placeholders**, so the live site always looks
finished. To see them (with a small handwritten *placeholder* note in
washed-out red beside each), add `?placeholders` to any address, for example
`https://timtham123.github.io/PortfolioWebsite/?placeholders`. Your browser
remembers until you visit an address ending in `?placeholders=off`. (Setting
`"showPlaceholders": true` in `src/_data/site.json` shows them to everyone.)

| In the code | What it is |
| --- | --- |
| `<div class="ph">`, `<tr class="ph">` (with a `<!-- PLACEHOLDER -->` comment) | text still to write |
| `<span class="ph">[…]</span>` | a fact to fill in, such as `[Role]` or `[2025]` |
| `{% image %}`, `{% video %}`, `{% audio %}` or `{% embed %}` with no file/URL | a picture or player still to add |
| `placeholder: true` at the top of a page | "placeholder content" in its footer, when previewing |

When something's finished, delete its `class="ph"` (or the wrapper `div`) and
its comment, and it appears for everyone.

Still to fill in:

- **Contact:** your email address (`"email"` in `src/_data/site.json`; until
  it's set, Contact leads with Instagram, TikTok and YouTube), and links to
  LinkedIn, Bandcamp and itch.io if you want them.
- **Social Media Marketing:** the intro, what you do, a client case study,
  results and tools. Only the Sounds Of channels show for now.
- **Feedra Prototype:** your role, a sentence on what you did, the team and
  the tools.
- **Music and Qualifications:** the Operation Karma EP's title; a CV PDF.
- **Photos:** a portrait (About Me), at the mixing desk (Contact), playing
  live (Music), climbing (Climbing), Luna (Cat), and two for Social Media
  Marketing.

## How it's designed

**References.** [anthonyeslick.com](https://anthonyeslick.com/) and the sites
collected on [Dead Simple Sites](https://deadsimplesites.com/): no decoration,
one size of type, hierarchy from spacing and grey versus black. (Section
headings are the one step up in size, so long pages are easy to scan.)

| | |
| --- | --- |
| Page | white |
| Text | `#0a0a0a`, Instrument Sans, 17px on a 1.42 line, everywhere |
| Section headings | 20px Instrument Sans Medium (500), a faint `#e4e4e4` line above |
| Sub-headings and labels | text-sized, Instrument Sans Medium (500) |
| Links | grey `#737373`; black and underlined when you point at them |
| Current page | black (and its section, on project pages) |
| Signature | your name in Reenie Beanie, top left |
| Placeholders | hidden from visitors; with `?placeholders`, washed-out red notes `#a85555` and grey boxes `#f2f2f2` |
| Columns (wide screens) | index 16rem, 2rem gap, text 35rem, 2rem gap, images 15rem |

**Responsive.** Wide screens (1100px and up) get index | text | images.
Between 760px and 1100px the images move below the text. Where the credits
tables (Music, Qualifications) don't have room for their four columns, each
credit stacks up beside its year instead.

**Phones (below 760px)** get their own layout rather than a squashed one:

- The header is the signature and a **Menu** button. The index opens over the
  whole page, a little bigger for thumbs, with the section you're in already
  open; Close, Escape or picking a page shuts it. The header tucks itself
  away as you scroll down a page and comes back as soon as you scroll up.
- Each page starts with its title, handwritten, then the grey opening line.
- The page's pictures come next, as a strip you swipe through sideways (the
  next one peeks in from the edge), instead of waiting at the bottom. They
  all fit the same height, whatever their shape.
- The Sounds Of map runs edge to edge, and an episode opens as a card under
  the timeline, so the map stays in view while you watch.
- Photo popups swipe from one picture to the next.

Without JavaScript the index is simply listed under the signature and the
pictures follow the text.

**The index.** Me and Work are black labels with their pages indented
underneath; Qualifications and Additional Credits and Contact close the list.
Each level steps in a little, like an outline.

**The dropdowns.** "Interests" and "Sound Design" aren't pages in the index:
clicking either name opens its sub-pages underneath, indented (the Sound
Design overview page still exists, and About Me links to it). It works by
click, tap or keyboard (Enter/Space; Escape closes it), not on hover, so
nothing jumps around as the mouse passes. It's open automatically when you're
on one of those pages, and on wider screens, once opened, it stays open from
page to page. On phones only the section you're in starts open, so the whole
index fits on the screen. Without JavaScript the sub-pages are simply always
listed.

**Accessibility.** The site has a skip link, a labelled nav with
`aria-current` on the current page, real `<button>`s with `aria-expanded` for
the dropdowns and the phone Menu (the page behind is out of reach while the
index is open over it), visible focus outlines, colour contrast at WCAG AA or
better, links spaced at least 24px apart, and alt text on every image.

## Putting it online

Any static host works. Build with `npm run build` and publish the `_site/`
folder.

- **GitHub Pages (set up):** `.github/workflows/deploy.yml` builds and publishes
  the site on every push, to <https://timtham123.github.io/PortfolioWebsite/>.
  Progress shows under the repo's **Actions** tab.
- **Netlify / Cloudflare Pages / Vercel:** build command `npm run build`,
  output directory `_site`.
- **Old-school:** upload the contents of `_site/` to any web server over FTP.
