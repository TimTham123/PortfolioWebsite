/*
  site.js: on every page. Everything works without it; it just makes a few
  things nicer. (A handful of pages add their own script too: travel.js,
  luna.js, sounds-of-map.js.)
*/
(function () {
  "use strict";

  var each = function (selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  };

  var root = document.documentElement;
  var phone = window.matchMedia("(max-width: 759.98px)");

  /*
    0. Phones. The index opens over the page from the Menu button in the
    header (and Close, Escape or a link shuts it again). The header tucks
    itself away while you scroll down a page and comes back as soon as you
    scroll up. On wider screens the index is always beside the page, so none
    of this applies.
  */
  var header = document.querySelector(".site-header");
  var menuButton = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");

  function setMenu(open, refocus) {
    if (!menuButton || !nav) return;
    root.classList.toggle("has-menu", open);
    menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    // Everything behind the index is out of reach while it's open.
    each(".skip-link, #main, .site-footer", function (el) { el.inert = open; });
    if (open) header.classList.remove("is-tucked");
    else if (refocus) menuButton.focus();
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      setMenu(menuButton.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !event.defaultPrevented && root.classList.contains("has-menu")) setMenu(false, true);
    });
    phone.addEventListener("change", function () {
      if (!phone.matches) setMenu(false);
    });
    // Coming back to a page with the browser's Back button: start closed.
    window.addEventListener("pageshow", function (event) {
      if (event.persisted) setMenu(false);
    });
  }

  if (header) {
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = Math.max(window.scrollY, 0);
      if (!phone.matches || root.classList.contains("has-menu")) { lastY = y; return; }
      if (Math.abs(y - lastY) < 8) return;
      header.classList.toggle("is-tucked", y > lastY && y > header.offsetHeight * 2);
      lastY = y;
    }, { passive: true });
    header.addEventListener("focusin", function () { header.classList.remove("is-tucked"); });
  }

  /*
    1. Dropdowns for "Interests" and "Sound Design" (any nav item with sub-pages).

    The [+] / [-] button opens and closes the list of sub-pages underneath it.
    It's a plain click/tap toggle (no hover) so it behaves the same with a
    mouse, a finger or a keyboard. Once open, a dropdown stays open on every
    page until it's closed (the script after the nav in nav.njk reads this
    back). Without JavaScript the sub-pages are simply always shown.
  */
  each(".nav-group", function (group) {
    var button = group.querySelector(".nav-toggle");
    if (!button) return;

    var key = group.getAttribute("data-key");

    function setOpen(open) {
      group.setAttribute("data-open", open ? "true" : "false");
      button.setAttribute("aria-expanded", open ? "true" : "false");
      try {
        var remembered = (JSON.parse(sessionStorage.getItem("nav-open")) || []).filter(function (k) { return k !== key; });
        if (open) remembered.push(key);
        sessionStorage.setItem("nav-open", JSON.stringify(remembered));
      } catch (e) { /* storage unavailable: it just won't be remembered */ }
    }

    button.addEventListener("click", function () {
      setOpen(button.getAttribute("aria-expanded") !== "true");
    });

    // Escape closes the dropdown and puts focus back on its button.
    group.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        event.preventDefault(); // (so it doesn't close the whole index on a phone too)
        setOpen(false);
        button.focus();
      }
    });
  });

  /*
    2. Wide tables, and the strip of pictures on a phone, scroll sideways.
    While one does, make its scroll box reachable with the keyboard (Tab to
    it, then use the arrow keys).
  */
  function updateScrollBoxes() {
    each(".table-scroll, .figures", function (box) {
      if (box.scrollWidth > box.clientWidth + 1) {
        var caption = box.querySelector("caption");
        var what = box.classList.contains("figures") ? "pictures" : "table";
        box.setAttribute("tabindex", "0");
        box.setAttribute("role", "region");
        box.setAttribute("aria-label", (caption ? caption.textContent + ", " : "") + what + ", scrolls sideways");
      } else {
        box.removeAttribute("tabindex");
        box.removeAttribute("role");
        box.removeAttribute("aria-label");
      }
    });
  }

  updateScrollBoxes();
  window.addEventListener("resize", updateScrollBoxes);
  phone.addEventListener("change", updateScrollBoxes); // the pictures move (base.njk)

  /*
    3. Picture popups. A picture that links to a bigger version of itself
    opens it in a popup instead, closed with the × in its corner, a click
    anywhere around it, or Escape. With more than one picture on the page,
    the arrows at the sides, the arrow keys or a swipe move to the previous
    or next. Used for the pictures beside the Sound Design pages
    (a.figure__zoom) and, through Site.lightbox, for the Travel photos
    (travel.js). Without JavaScript the link just opens the picture.
    `hooks.open` / `hooks.close` run as the popup opens and closes.
  */
  function lightbox(links, hooks) {
    links = Array.prototype.slice.call(links);
    if (!links.length || typeof HTMLDialogElement !== "function") return;
    hooks = hooks || {};

    var dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.innerHTML =
      '<picture><source type="image/webp"><img class="lightbox__img" alt=""></picture>' +
      '<button class="lightbox__close" type="button" autofocus>' +
      '<span class="visually-hidden">Close</span><span aria-hidden="true">&times;</span></button>' +
      (links.length > 1
        ? '<button class="lightbox__step" type="button" data-step="-1"><span class="visually-hidden">Previous picture</span><span aria-hidden="true">&larr;</span></button>' +
          '<button class="lightbox__step" type="button" data-step="1"><span class="visually-hidden">Next picture</span><span aria-hidden="true">&rarr;</span></button>'
        : "");
    document.body.appendChild(dialog);

    var source = dialog.querySelector("source");
    var image = dialog.querySelector("img");
    var opener = null;
    var shown = -1;
    var ratio = 1.5;

    // The picture as big as the window allows, keeping its shape.
    function fit() {
      var room = 2 * 24 + 2 * 11; // margin around the window, plus its frame
      var width = Math.min(window.innerWidth - room, (window.innerHeight - room) * ratio);
      width = Math.max(Math.floor(width), 40);
      image.style.width = width + "px";
      image.style.height = Math.round(width / ratio) + "px";
      image.sizes = source.sizes = width + "px";
    }

    function open(link) {
      var small = link.querySelector("img");
      var smallSource = link.querySelector("source");
      opener = link;
      shown = links.indexOf(link);
      ratio = Number(small.getAttribute("width")) / Number(small.getAttribute("height")) || 1.5;
      image.alt = small.alt;
      dialog.setAttribute("aria-label", small.alt);
      // Show the small picture straight away while the big one loads over it.
      image.style.backgroundImage = 'url("' + (small.currentSrc || small.src) + '")';
      fit();
      source.srcset = smallSource ? smallSource.srcset : "";
      image.srcset = small.srcset;
      image.src = link.href;
      if (dialog.open) return;
      if (hooks.open) hooks.open();
      document.documentElement.classList.add("has-lightbox");
      dialog.showModal();
    }

    // The previous or next picture (round in a loop). The page behind
    // follows along, so closing the popup leaves you at the last one seen.
    function step(by) {
      if (links.length < 2 || shown < 0) return;
      open(links[(shown + by + links.length) % links.length]);
    }

    Array.prototype.forEach.call(dialog.querySelectorAll(".lightbox__step"), function (button) {
      button.addEventListener("click", function () { step(Number(button.dataset.step)); });
    });

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        step(event.key === "ArrowRight" ? 1 : -1);
      }
    });

    // A swipe sideways on a phone or tablet.
    var swipe = null;
    dialog.addEventListener("touchstart", function (event) {
      swipe = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    dialog.addEventListener("touchend", function (event) {
      if (!swipe || !event.changedTouches.length) return;
      var dx = event.changedTouches[0].clientX - swipe.x;
      var dy = event.changedTouches[0].clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, { passive: true });

    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("has-lightbox");
      image.removeAttribute("srcset");
      image.removeAttribute("src");
      source.removeAttribute("srcset");
      if (hooks.close) hooks.close();
      if (opener) opener.focus();
    });

    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        // Let ⌘/Ctrl/Shift-click open the picture in a new tab as usual.
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
  }

  window.Site = { lightbox: lightbox };
  lightbox(document.querySelectorAll("a.figure__zoom"));

  /*
    4. YouTube videos load when they're played. Until then each one is just
    its picture with a play button, a link to the video on YouTube (see the
    video shortcode in lib/shortcodes.js). Pressing it swaps in the player,
    already playing.
  */
  each("a.yt", function (link) {
    link.addEventListener("click", function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      var frame = document.createElement("iframe");
      frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(link.getAttribute("data-yt")) + "?autoplay=1&rel=0";
      frame.title = link.getAttribute("data-title") || "YouTube video";
      frame.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      frame.setAttribute("allowfullscreen", "");
      frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      link.parentNode.replaceChild(frame, link);
      frame.focus();
    });
  });
})();
