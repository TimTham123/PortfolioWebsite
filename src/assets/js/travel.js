/*
  Travel page.

  1. Videos play by themselves as you scroll to them, and pause when you
     scroll past, so they pick up from the same point when you come back.
     Browsers only let a video start on its own with the sound off, so they
     start muted; once someone turns the sound on, the rest play with sound.
     A video someone pauses stays paused, and nothing plays by itself for
     people who've asked their device to reduce motion.

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
  var soundOn = false;

  function autoPause(video) {
    if (video.paused) return;
    video.dataset.autoPaused = "true";
    video.pause();
  }

  function autoPlay(video) {
    if (!video.paused || video.ended || video.dataset.userPaused || reduceMotion.matches) return;
    video.muted = !soundOn;
    var playing = video.play();
    if (playing && playing.catch) {
      playing.catch(function () {
        // Not allowed with sound: try again without it.
        if (!video.muted) {
          video.muted = true;
          video.play().catch(function () { /* the browser won't autoplay at all */ });
        }
      });
    }
  }

  videos.forEach(function (video) {
    video.addEventListener("play", function () {
      delete video.dataset.autoPaused;
      delete video.dataset.userPaused;
      // One at a time.
      videos.forEach(function (other) { if (other !== video) autoPause(other); });
    });
    video.addEventListener("pause", function () {
      // Only a pause while the video is on screen counts as someone pausing
      // it (browsers pause off-screen or background videos themselves).
      if (video.dataset.autoPaused || video.ended || document.hidden || Number(video.dataset.seen || 0) < 0.25) return;
      video.dataset.userPaused = "true";
    });
    video.addEventListener("volumechange", function () {
      soundOn = !video.muted && video.volume > 0;
    });
  });

  if (videos.length && "IntersectionObserver" in window) {
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.dataset.seen = entry.intersectionRatio.toFixed(2);
        if (entry.intersectionRatio >= 0.5) autoPlay(entry.target);
        else if (entry.intersectionRatio < 0.25) autoPause(entry.target);
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
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

    resume = videos.filter(function (video) { return !video.paused; });
    resume.forEach(autoPause);
    document.documentElement.classList.add("has-lightbox");
    dialog.showModal();
  }

  dialog.addEventListener("close", function () {
    document.documentElement.classList.remove("has-lightbox");
    image.removeAttribute("srcset");
    image.removeAttribute("src");
    source.removeAttribute("srcset");
    resume.forEach(autoPlay);
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
