/*
  Travel page.

  1. Videos play by themselves, with the sound on, as they come onto the
     screen, and pause once they've gone off it, so they pick up from the
     same point when you come back. The volume is how much of the video is
     on screen: half on screen, half volume, so the sound fades out as a
     video scrolls away and back in as it returns. The first time each
     video is heard, its sound also fades in over 3 seconds.

     Some browsers won't play sound until the visitor has clicked or tapped
     the page: until then the video plays silently with a "Turn sound on"
     button, and the first click or tap anywhere brings the sound in (with
     the 3-second fade). If someone mutes a video, the rest stay muted until
     they turn the sound back on. A video someone pauses stays paused, and
     nothing plays by itself for people who've asked their device to reduce
     motion. (iPhones and iPads don't let a page change a video's volume,
     so there the sound plays without the fades.)

  2. Clicking a photo opens it in a popup, closed with the × in its corner,
     a click anywhere else, or Escape. Without JavaScript, a photo link
     simply opens the photo.
*/
(function () {
  "use strict";

  var gallery = document.querySelector(".gallery");
  if (!gallery) return;
  var toArray = function (list) { return Array.prototype.slice.call(list); };

  /* 1. Videos ------------------------------------------------------------- */

  var videos = toArray(gallery.querySelectorAll("video"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var soundOn = true;        // sound on, unless someone mutes a video
  var soundBlocked = false;  // the browser won't play sound yet
  var FIRST_FADE = 3000;     // ms: the first time a video is heard
  // Volume changes are smoothed (over about SMOOTH ms) and never swing from
  // silent to full in less than FULL_SWING ms, so scrolling fast doesn't
  // make the sound click. A video leaving the screen fades out, then pauses.
  var SMOOTH = 80;
  var FULL_SWING = 250;
  // iPhones and iPads don't let a page change a video's volume.
  var canFade = (function () {
    var test = document.createElement("video");
    test.volume = 0.5;
    return test.volume === 0.5;
  })();

  // How much of a video is on screen, from 0 to 1.
  function onScreen(video) {
    var box = video.getBoundingClientRect();
    var shown = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
    return Math.max(0, Math.min(1, shown / (box.height || 1)));
  }

  // Fade the sound out, then pause (straight away if there's nothing to hear).
  function autoPause(video) {
    if (video.paused || video.stopping) return;
    var level = video.setVolume == null ? video.volume : video.setVolume;
    if (!canFade || video.muted || level < 0.005) { stopNow(video); return; }
    video.stopping = true;
    // In case the page stops drawing frames (a background tab) mid-fade.
    video.stopTimer = setTimeout(function () { if (video.stopping) stopNow(video); }, 600);
    startFading();
  }

  function stopNow(video) {
    video.stopping = false;
    clearTimeout(video.stopTimer);
    if (video.paused) return;
    video.dataset.autoPaused = "true";
    video.pause();
  }

  // Muted by this script (because the browser said no), not by the visitor.
  function muteForNow(video) {
    video.dataset.autoMuted = "true";
    video.muted = true;
    if (video.heardFor < 250) video.heardFor = 0; // it hasn't really been heard yet
  }

  function autoPlay(video) {
    if (video.stopping) { // came back before it had faded out: carry on
      video.stopping = false;
      clearTimeout(video.stopTimer);
      return;
    }
    if (!video.paused || video.ended || video.dataset.userPaused || reduceMotion.matches) return;
    if (soundOn && !soundBlocked) {
      delete video.dataset.autoMuted;
      video.muted = false;
    } else if (soundOn) {
      muteForNow(video);
    } else {
      video.muted = true;
    }
    if (video.heardFor < FIRST_FADE) video.volume = video.setVolume = 0; // the first fade starts from silence
    video.dataset.autoPlay = "true";
    var playing = video.play();
    if (playing && playing.catch) {
      playing.catch(function () {
        if (video.muted) { delete video.dataset.autoPlay; return; } // no autoplay at all
        // No sound allowed yet: play silently until the visitor clicks or taps.
        soundBlocked = true;
        muteForNow(video);
        video.play().catch(function () { delete video.dataset.autoPlay; });
      });
    }
  }

  // The first click, tap or key press anywhere lets the sound in.
  function letSoundIn(event) {
    if (!soundBlocked) return;
    if (event.type === "keydown" && (event.key === "Escape" || event.repeat)) return;
    if (event.target.nodeName === "VIDEO") return; // its own controls look after themselves
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    soundBlocked = false;
    videos.forEach(function (video) {
      if (!video.dataset.autoMuted) return;
      delete video.dataset.autoMuted;
      video.muted = false;
    });
  }
  document.addEventListener("click", letSoundIn, true);
  document.addEventListener("keydown", letSoundIn, true);

  // The volume, every frame while anything's playing, eases towards: how
  // much of the video is on screen, times the first fade-in (over its first
  // 3 seconds of being heard), times the level the visitor has set with the
  // video's own volume control (full to begin with). Silence if it's on its
  // way out.
  var fading = null;
  function fade(now) {
    fading = null;
    videos.forEach(function (video) {
      if (video.paused) { video.lastFrame = null; return; }
      var dt = video.lastFrame == null ? 16 : Math.min(now - video.lastFrame, 100);
      if (!video.muted && video.lastFrame != null) video.heardFor += dt;
      video.lastFrame = now;
      var ramp = Math.min(1, video.heardFor / FIRST_FADE);
      video.gain = onScreen(video) * ramp;
      var target = video.stopping ? 0 : video.gain * video.level;
      var current = video.setVolume == null ? video.volume : video.setVolume;
      var step = (target - current) * (1 - Math.exp(-dt / SMOOTH));
      var most = Math.min(dt, 16) / FULL_SWING; // a slow frame just fades more slowly
      step = Math.max(-most, Math.min(most, step));
      var next = Math.abs(target - current - step) < 0.002 ? target : current + step;
      video.setVolume = Math.min(1, Math.max(0, Math.round(next * 10000) / 10000));
      if (Math.abs(video.volume - video.setVolume) > 0.00005) video.volume = video.setVolume;
      if (video.stopping && video.setVolume <= 0.002) stopNow(video);
      fading = fading || requestAnimationFrame(fade);
    });
  }
  function startFading() {
    if (!fading) fading = requestAnimationFrame(fade);
  }

  videos.forEach(function (video) {
    video.level = 1;
    video.heardFor = 0;
    video.wasMuted = video.muted;

    // "Turn sound on", over a video that's playing silently (clicking it,
    // like any click, lets the sound in).
    var button = document.createElement("button");
    button.className = "gallery__sound";
    button.type = "button";
    button.hidden = true;
    button.textContent = "Turn sound on";
    video.parentNode.appendChild(button);
    function showButton() {
      button.hidden = !(video.dataset.autoMuted && video.muted && !video.paused);
    }

    video.addEventListener("play", function () {
      var auto = video.dataset.autoPlay;
      delete video.dataset.autoPlay;
      delete video.dataset.autoPaused;
      delete video.dataset.userPaused;
      // Someone pressing play on one video pauses the others.
      if (!auto) videos.forEach(function (other) { if (other !== video) autoPause(other); });
      showButton();
      startFading();
    });
    video.addEventListener("pause", function () {
      video.stopping = false;
      clearTimeout(video.stopTimer);
      showButton();
      if (video.dataset.autoPaused || video.ended || document.hidden || onScreen(video) === 0) return;
      // Someone pressed pause (they've just clicked or pressed a key)...
      if (!navigator.userActivation || navigator.userActivation.isActive) {
        video.dataset.userPaused = "true";
        return;
      }
      // ...or the browser paused it, which (with the sound on) means it
      // won't allow sound yet: carry on silently.
      if (!video.muted) {
        soundBlocked = true;
        muteForNow(video);
        video.dataset.autoPlay = "true";
        video.play().catch(function () { delete video.dataset.autoPlay; });
      }
    });
    video.addEventListener("volumechange", function () {
      if (video.muted !== video.wasMuted) {
        video.wasMuted = video.muted;
        showButton();
        if (video.muted && video.dataset.autoMuted) return; // muted by this script
        delete video.dataset.autoMuted;
        soundOn = !video.muted; // the visitor's choice
        if (soundOn) soundBlocked = false;
      } else if (video.setVolume != null && Math.abs(video.volume - video.setVolume) > 0.02 && video.gain > 0.05) {
        // The visitor moved the volume slider: that's the new top level.
        video.level = Math.min(1, video.volume / video.gain);
        video.setVolume = video.volume;
      }
    });
  });

  if (videos.length && "IntersectionObserver" in window) {
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) autoPlay(entry.target);
        else autoPause(entry.target);
      });
    });
    videos.forEach(function (video) { watcher.observe(video); });
  }

  /* 2. The photo popup ------------------------------------------------------ */

  var links = toArray(gallery.querySelectorAll("a.gallery__item"));
  if (!links.length || typeof HTMLDialogElement !== "function") return;

  var dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.innerHTML =
    '<picture><source type="image/webp"><img class="lightbox__img" alt=""></picture>' +
    '<button class="lightbox__close" type="button" autofocus>' +
    '<span class="visually-hidden">Close</span><span aria-hidden="true">&times;</span></button>';
  document.body.appendChild(dialog);

  var source = dialog.querySelector("source");
  var image = dialog.querySelector("img");
  var opener = null;
  var ratio = 1.5;
  var resume = [];

  // The photo as big as the window allows, keeping its shape.
  function fit() {
    var room = 2 * 24 + 2 * 11; // margin around the window, plus its frame
    var width = Math.min(window.innerWidth - room, (window.innerHeight - room) * ratio);
    width = Math.max(Math.floor(width), 40);
    image.style.width = width + "px";
    image.style.height = Math.round(width / ratio) + "px";
    image.sizes = source.sizes = width + "px";
  }

  function open(link) {
    var tile = link.querySelector("img");
    var tileSource = link.querySelector("source");
    opener = link;
    ratio = Number(tile.getAttribute("width")) / Number(tile.getAttribute("height")) || 1.5;
    image.alt = tile.alt;
    dialog.setAttribute("aria-label", tile.alt);
    // Show the small photo straight away while the big one loads over it.
    image.style.backgroundImage = 'url("' + (tile.currentSrc || tile.src) + '")';
    fit();
    source.srcset = tileSource ? tileSource.srcset : "";
    image.srcset = tile.srcset;
    image.src = link.href;

    resume = videos.filter(function (video) { return !video.paused && !video.stopping; });
    resume.forEach(autoPause);
    document.documentElement.classList.add("has-lightbox");
    dialog.showModal();
  }

  dialog.addEventListener("close", function () {
    document.documentElement.classList.remove("has-lightbox");
    image.removeAttribute("srcset");
    image.removeAttribute("src");
    source.removeAttribute("srcset");
    resume.forEach(function (video) { if (onScreen(video) > 0) autoPlay(video); });
    resume = [];
    if (opener) opener.focus();
  });

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      // Let ⌘/Ctrl/Shift-click open the photo in a new tab as usual.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      open(link);
    });
  });

  dialog.querySelector(".lightbox__close").addEventListener("click", function () {
    dialog.close();
  });

  // A click outside the window (on the faded page around it) closes it.
  dialog.addEventListener("click", function (event) {
    if (event.target !== dialog) return;
    var box = dialog.getBoundingClientRect();
    var inside = event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) dialog.close();
  });

  window.addEventListener("resize", function () {
    if (dialog.open) fit();
  });
})();
