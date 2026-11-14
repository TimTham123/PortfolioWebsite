// How loud is each YouTube video on the site? Paste this whole file into the
// browser's console on youtube.com (in Chrome: open youtube.com, press F12,
// choose Console, type "allow pasting" if it asks, paste, press Enter).
//
// It finds every video on the site's pages (the Sound Design projects and the
// Sounds Of episodes), reads the loudness YouTube itself works out for each
// one (the "content loudness" in Stats for nerds), and prints a table. It only
// reads; nothing is changed. The results are copied to the clipboard too.
//
// "vs YouTube" is how far each video is from the level YouTube plays at (about
// -14 LUFS). YouTube turns louder videos down to that level, but never turns
// quieter ones up, so anything below about -1 dB plays quieter than the rest:
// that video needs its sound turned up by that many dB and uploading again
// (scripts/normalize-loudness.sh does it in one go). See the README, "Even
// video volume".
(async () => {
  const site = "https://timtham123.github.io/PortfolioWebsite";
  // Every video on the site when this was written (14 November 2026). Any
  // added since are found by reading the pages, if youtube.com allows it.
  const known = {
    "/sound-design/alchemeow/": ["BoqlfDL6nE4", "W4_7UcXP5Rg", "MP__TdD27Bg", "PwZ0O2aWIKA", "ezrB8ZG0ZxE", "KdkcZYDK_nk", "UntehcP54to", "4HSnTX_pgqA"],
    "/sound-design/cyberpedia/": ["sNgPT3m4pEo", "kUfHofRGstI", "rsAPzWTGN-I", "wuKtNwq_lL4", "0Ui_v2Cev7Y", "0MPxDL-id9s"],
    "/sound-design/okiro/": ["rfTi4LxGYUo", "hyFF5IgKoWw", "zpJihLQnGNk", "NwFI9bfstCA", "jFsKeBc8OC8"],
    "/sound-design/a-little-bit-of-gore/": ["EI_Ai8QRa8k", "6uZszkqPYvs", "XlGIT1-iayo", "vKw8gzmcEpI", "FhD7wP9znoA", "TlowvgaDqh4", "j0sC2IQvA4M"],
    "/sound-design/hubworld/": ["o6zwMPDenAY", "n3-l2fnHx1c", "Gj9WLMUlhGM"],
    "/sound-design/feedra/": ["u5PyVFrtbTo", "xR68Hf3g1fY", "vN-01wupS9s", "Yqd6STmF5hA"],
    "/sounds-of/": ["OVTzG_S-WMo", "rHyBoVq-kCU", "dxMHPN0y4lQ", "hB0pCNFPIFw", "uYBy12z4WNM", "es-UXDPu6hs", "dy01EN56-s4", "jONU3c6GPHY", "qX9Ej2ddQ5k", "Wfg3ZxkV6Hc", "hTbrGV3Heq0", "UPYs_OT2IpA", "izGJl2ZPyqQ", "9F95-GvSdY4", "VFv-ZBRBjqI", "MGMN3CtRCEY", "i3GO281rztI", "QzYO_udcP4U", "mC7RkgoCmzM", "5nvnmgdgNNc", "JuoxNbSyEG0", "4Pf_9VMmegg", "8cxANvi9kIs", "C5psRgS8Wwc", "1sZrKHjwMrg", "nuOVLLn99I4", "xBT1mNdv1gE", "Zb1tGLKwVgk", "oXrMM0spPq4", "0MOiFMUs7As", "fSYB1D8eYLk", "j-IBitzROZc", "3DbKiVNvU6E", "9KJpviqSW8Q", "zmlKCE9fz6A"],
  };
  const videos = new Map(); // id -> the page it's on
  for (const [page, ids] of Object.entries(known)) ids.forEach((id) => videos.set(id, page));
  const get = async (url) => {
    for (let tries = 0; tries < 3; tries++) {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.text();
      } catch (error) { /* try again */ }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    return "";
  };
  for (const page of Object.keys(known)) {
    const html = await get(site + page);
    for (const m of html.matchAll(/data-yt="([\w-]{11})"|youtube-nocookie\.com\/embed\/([\w-]{11})/g)) {
      const id = m[1] || m[2];
      if (!videos.has(id)) videos.set(id, page);
    }
  }
  console.log(`Measuring ${videos.size} videos…`);
  const rows = [];
  for (const [id, page] of videos) {
    const html = await get(`/watch?v=${id}`);
    const loudness = html.match(/"loudnessDb":(-?[\d.]+)/);
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const db = loudness ? Math.round(Number(loudness[1]) * 10) / 10 : null;
    rows.push({
      page,
      title: title.replace(/ - YouTube$/, ""),
      id,
      "vs YouTube (dB)": db,
      "turn up by (dB)": db !== null && db < -1 ? Math.round(-db * 10) / 10 : "",
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  rows.sort((a, b) => (a["vs YouTube (dB)"] ?? 99) - (b["vs YouTube (dB)"] ?? 99));
  console.table(rows);
  copy(rows.map((r) => [r.id, r["vs YouTube (dB)"], r.page, r.title].join("\t")).join("\n"));
  console.log("The results are on the clipboard: paste them back to Claude.");
})();
