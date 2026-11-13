/*
  Sounds Of map: markers, a popup with each episode's video, a timeline, a
  route that inks itself in as you move through the stops, and zoom.

  Stops come from the JSON block the page writes out (from
  src/_data/sounds-of.csv), already in order. A stop with no episode yet has
  an empty marker. After the last stop the route heads home, and that last
  leg is inked when you reach the last stop.

  Zoom: the + / − buttons, Ctrl/⌘ + scroll or a trackpad pinch, double-click,
  and two-finger pinch on phones. Drag to move around once zoomed in. Zooming
  changes the SVG's viewBox, so the drawing stays sharp and the markers stay
  the same size.
*/
(function () {
  "use strict";

  var root = document.querySelector("[data-sounds-of-map]");
  var dataBlock = document.getElementById("sounds-of-data");
  if (!root || !dataBlock) return;

  var episodes = JSON.parse(dataBlock.textContent);
  var last = episodes.length - 1;
  if (last < 0) return;

  var $ = function (selector) { return root.querySelector(selector); };
  var $$ = function (selector) { return Array.prototype.slice.call(root.querySelectorAll(selector)); };

  var stage = $(".sm__stage");
  var svg = $(".sm__map");
  var displacement = svg.querySelector("feDisplacementMap");
  var markers = $$(".sm__marker");
  var ticks = $$(".sm__tick");
  var segments = $$(".sm__route-ink path");
  var homeDot = $(".sm__home");
  var homeLeg = segments.length > last; // the drive home after the last stop
  var popup = $(".sm__popup");
  var place = $(".sm__place");
  var status = $(".sm__status");
  var track = $(".sm__track");
  var tickList = $(".sm__ticks");
  var hint = $(".sm__hint");
  var earlier = $('.sm__step[data-step="-1"]');
  var later = $('.sm__step[data-step="1"]');
  var zoomInButton = $('[data-zoom="in"]');
  var zoomOutButton = $('[data-zoom="out"]');
  var field = {
    date: $(".sm__date"),
    name: $(".sm__name"),
    location: $(".sm__location"),
    empty: $(".sm__empty"),
    video: $(".sm__video"),
    description: $(".sm__description"),
    watch: $(".sm__watch a"),
  };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var current = -1; // the selected episode (none to begin with)
  var inked = 0;    // how many legs of the route are drawn in black

  root.classList.add("is-ready");
  status.textContent += " Choose a marker, or use the timeline, to follow the road.";

  /* Zoom and pan --------------------------------------------------------- */

  var W = svg.viewBox.baseVal.width;
  var H = svg.viewBox.baseVal.height;
  var MIN_ZOOM = 1;
  var MAX_ZOOM = 6;
  var PEN_WOBBLE = Number(displacement.getAttribute("scale"));
  var view = { k: 1, cx: W / 2, cy: H / 2 };
  var animation = null;

  function clampView(v) {
    v.k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k));
    var w = W / v.k;
    var h = H / v.k;
    v.cx = Math.min(W - w / 2, Math.max(w / 2, v.cx));
    v.cy = Math.min(H - h / 2, Math.max(h / 2, v.cy));
    return v;
  }

  // Where a map point currently sits in the stage, as percentages.
  function toStage(x, y) {
    var w = W / view.k;
    var h = H / view.k;
    return { left: ((x - (view.cx - w / 2)) / w) * 100, top: ((y - (view.cy - h / 2)) / h) * 100 };
  }

  function render() {
    var w = W / view.k;
    var h = H / view.k;
    svg.setAttribute("viewBox", [view.cx - w / 2, view.cy - h / 2, w, h].join(" "));
    stage.style.setProperty("--zoom", view.k);
    displacement.setAttribute("scale", (PEN_WOBBLE / view.k).toFixed(3));

    markers.forEach(function (marker, i) {
      var at = toStage(episodes[i].x, episodes[i].y);
      marker.style.left = at.left + "%";
      marker.style.top = at.top + "%";
      // Off-screen markers can't be tabbed to.
      marker.style.visibility = at.left < -2 || at.left > 102 || at.top < -2 || at.top > 102 ? "hidden" : "";
    });
    if (current >= 0) {
      var spot = toStage(episodes[current].x, episodes[current].y);
      place.style.left = spot.left + "%";
      place.style.top = spot.top + "%";
      place.classList.toggle("is-left", spot.left > 62);
    }

    root.classList.toggle("is-zoomed", view.k > 1.001);
    zoomInButton.setAttribute("aria-disabled", view.k >= MAX_ZOOM - 0.001 ? "true" : "false");
    zoomOutButton.setAttribute("aria-disabled", view.k <= MIN_ZOOM + 0.001 ? "true" : "false");
  }

  // Screen position -> map point, plus where it sits across the stage (0–1).
  function pointAt(clientX, clientY) {
    var r = stage.getBoundingClientRect();
    var fx = (clientX - r.left) / r.width;
    var fy = (clientY - r.top) / r.height;
    return { x: view.cx + (fx - 0.5) * (W / view.k), y: view.cy + (fy - 0.5) * (H / view.k), fx: fx, fy: fy };
  }

  // The view for zoom `k` that keeps map point `p` under the same screen spot.
  function viewAround(k, p) {
    k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
    return clampView({ k: k, cx: p.x - (p.fx - 0.5) * (W / k), cy: p.y - (p.fy - 0.5) * (H / k) });
  }

  function setView(target) {
    if (animation) cancelAnimationFrame(animation);
    animation = null;
    view = clampView(target);
    render();
  }

  // Glide to a view (buttons, double-click, following the route).
  function glideTo(target) {
    target = clampView(target);
    if (reduceMotion.matches) return setView(target);
    if (animation) cancelAnimationFrame(animation);
    var from = { k: view.k, cx: view.cx, cy: view.cy };
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / 260);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      // Zoom on a log scale so it feels even.
      view.k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e);
      view.cx = from.cx + (target.cx - from.cx) * e;
      view.cy = from.cy + (target.cy - from.cy) * e;
      render();
      animation = t < 1 ? requestAnimationFrame(frame) : null;
    }
    animation = requestAnimationFrame(frame);
  }

  function zoomBy(factor) {
    var r = stage.getBoundingClientRect();
    glideTo(viewAround(view.k * factor, pointAt(r.left + r.width / 2, r.top + r.height / 2)));
  }

  zoomInButton.addEventListener("click", function () { zoomBy(1.8); });
  zoomOutButton.addEventListener("click", function () { zoomBy(1 / 1.8); });
  $('[data-zoom="reset"]').addEventListener("click", function () {
    glideTo({ k: 1, cx: W / 2, cy: H / 2 });
  });

  // Ctrl/⌘ + scroll (or a trackpad pinch, which arrives as the same thing).
  // A plain scroll scrolls the page, with a reminder.
  var hintTimer = null;
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  function showHint() {
    hint.textContent = "Hold " + (isMac ? "⌘" : "Ctrl") + " and scroll to zoom";
    hint.classList.add("is-visible");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { hint.classList.remove("is-visible"); }, 1400);
  }

  stage.addEventListener("wheel", function (event) {
    if (popup.contains(event.target)) return; // let the popup scroll
    if (!event.ctrlKey && !event.metaKey) { showHint(); return; }
    event.preventDefault();
    var delta = event.deltaY * (event.deltaMode === 1 ? 18 : 1);
    setView(viewAround(view.k * Math.exp(-delta * 0.0025), pointAt(event.clientX, event.clientY)));
  }, { passive: false });

  // Safari's trackpad pinch.
  var gestureStartZoom = 1;
  stage.addEventListener("gesturestart", function (event) { event.preventDefault(); gestureStartZoom = view.k; });
  stage.addEventListener("gesturechange", function (event) {
    event.preventDefault();
    setView(viewAround(gestureStartZoom * event.scale, pointAt(event.clientX, event.clientY)));
  });

  stage.addEventListener("dblclick", function (event) {
    if (event.target.closest(".sm__popup, .sm__zoom, .sm__marker")) return;
    glideTo(viewAround(view.k * 2, pointAt(event.clientX, event.clientY)));
  });

  // Dragging to move around, and two-finger pinch.
  var pointers = new Map();
  var pinch = null;
  var dragged = false;

  stage.addEventListener("pointerdown", function (event) {
    if (event.target.closest(".sm__popup, .sm__zoom, .sm__marker")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragged = false;
    if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      pinch = {
        k: view.k,
        distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
        at: pointAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2),
      };
    }
  });

  stage.addEventListener("pointermove", function (event) {
    var before = pointers.get(event.pointerId);
    if (!before) return;
    var now = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, now);

    if (pointers.size >= 2 && pinch) {
      var pts = Array.from(pointers.values());
      var distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      var mid = pointAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      setView(viewAround(pinch.k * (distance / pinch.distance), { x: pinch.at.x, y: pinch.at.y, fx: mid.fx, fy: mid.fy }));
      dragged = true;
      return;
    }

    if (view.k <= 1.001) return; // nothing to move at full size
    var dx = now.x - before.x;
    var dy = now.y - before.y;
    if (!dragged && Math.abs(dx) + Math.abs(dy) < 3) return;
    if (!dragged) {
      dragged = true;
      root.classList.add("is-dragging");
      try { stage.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    }
    var r = stage.getBoundingClientRect();
    setView({ k: view.k, cx: view.cx - (dx / r.width) * (W / view.k), cy: view.cy - (dy / r.height) * (H / view.k) });
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) root.classList.remove("is-dragging");
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  // Keep a chosen episode in view when zoomed in.
  function bringIntoView(ep) {
    if (view.k <= 1.001) return;
    var at = toStage(ep.x, ep.y);
    if (at.left < 12 || at.left > 88 || at.top < 12 || at.top > 88) {
      glideTo({ k: view.k, cx: ep.x, cy: ep.y });
    }
  }

  /* The route ------------------------------------------------------------ */

  // Each leg starts hidden behind a dash as long as itself; sliding the dash
  // away draws the line.
  segments.forEach(function (path) {
    var length = path.getTotalLength();
    path.style.strokeDasharray = length + " " + length;
    path.style.strokeDashoffset = length;
    path.dataset.length = length;
  });

  // Draw (or rub out) the legs up to stop `index`, one after another. At the
  // last stop the drive home is drawn too, ending in a dot.
  function inkTo(index) {
    var target = Math.max(index, 0);
    if (index === last && homeLeg) target = last + 1;
    var count = Math.abs(target - inked);
    if (!count) return;
    var each = reduceMotion.matches ? 0 : Math.max(110, Math.min(480, 2600 / count));
    var forward = target > inked;
    for (var k = 0; k < count; k++) {
      var path = segments[forward ? inked + k : inked - 1 - k];
      path.style.transitionDuration = each + "ms";
      path.style.transitionDelay = k * each + "ms";
      path.style.strokeDashoffset = forward ? 0 : path.dataset.length;
      // (a leg between two stops in the same place has no length, so the
      // class, not the dash, says whether it's drawn)
      path.classList.toggle("is-inked", forward);
    }
    inked = target;
    if (homeDot) {
      homeDot.style.transitionDelay = forward ? count * each + "ms" : "0ms";
      root.classList.toggle("is-home", inked > last);
    }
  }

  /* The timeline line ---------------------------------------------------- */

  function centre(el) {
    return el.offsetLeft + el.offsetWidth / 2;
  }

  function layoutTimeline() {
    var first = centre(ticks[0].parentNode);
    tickList.style.setProperty("--start", first + "px");
    tickList.style.setProperty("--end", centre(ticks[last].parentNode) - first + "px");
    tickList.style.setProperty("--ink", current < 0 ? "0px" : centre(ticks[current].parentNode) - first + "px");
  }

  function keepTickInView(index) {
    var item = ticks[index].parentNode;
    if (track.scrollWidth <= track.clientWidth) return;
    track.scrollTo({
      left: centre(item) - track.clientWidth / 2,
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  }

  /* The popup ------------------------------------------------------------ */

  // A fresh iframe each time (changing an iframe's address would add steps
  // to the browser's Back button).
  function showVideo(ep) {
    field.video.textContent = "";
    field.video.hidden = !ep.video;
    if (!ep.video) return;
    var frame = document.createElement("iframe");
    frame.src = ep.video.embed;
    frame.title = "Sounds Of: " + ep.name;
    frame.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allowFullscreen = true;
    field.video.appendChild(frame);
  }

  function openPopup(ep) {
    field.date.textContent = ep.dateLong;
    field.date.hidden = !ep.dateLong;
    field.name.textContent = ep.title;
    field.location.textContent = ep.location;
    field.empty.hidden = !ep.empty;
    field.description.textContent = ep.description || "";
    field.description.hidden = !ep.description;
    field.watch.href = ep.video ? ep.video.watch : "https://www.youtube.com/@soundsofchannel";
    field.watch.parentNode.hidden = !ep.video;
    showVideo(ep);
    // Sit on the side of the map away from the marker.
    popup.classList.toggle("is-left", toStage(ep.x, ep.y).left > 50);
    popup.hidden = false;
    popup.scrollTop = 0;
    root.classList.add("is-open");
  }

  function closePopup() {
    if (popup.hidden) return;
    popup.hidden = true;
    field.video.textContent = ""; // stops the video
    root.classList.remove("is-open");
  }

  // On a phone the popup is a card under the timeline, so the map stays in
  // view above it; on anything wider it sits over the map, beside the stop.
  var phone = window.matchMedia("(max-width: 599.98px)");
  var timeline = $(".sm__timeline");
  var zoomBox = $(".sm__zoom");
  function placePopup() {
    if (phone.matches) timeline.after(popup);
    else stage.insertBefore(popup, zoomBox);
  }
  placePopup();
  phone.addEventListener("change", placePopup);

  /* Choosing an episode -------------------------------------------------- */

  function select(index) {
    if (index < 0 || index > last) return;
    var ep = episodes[index];
    current = index;

    markers.forEach(function (marker, i) {
      marker.classList.toggle("is-current", i === index);
      if (i === index) marker.setAttribute("aria-current", "true");
      else marker.removeAttribute("aria-current");
    });
    ticks.forEach(function (tick, i) {
      tick.classList.toggle("is-current", i === index);
      tick.classList.toggle("is-past", i < index);
      if (i === index) tick.setAttribute("aria-current", "true");
      else tick.removeAttribute("aria-current");
    });

    inkTo(index);
    layoutTimeline();
    keepTickInView(index);

    place.textContent = ep.place;
    // Past the end of a line of dots (style.css spaces them --pile-step apart).
    place.style.setProperty("--reach", ((ep.pile || 1) - 1) / 2);
    render();
    bringIntoView(ep);

    earlier.setAttribute("aria-disabled", index === 0 ? "true" : "false");
    later.setAttribute("aria-disabled", index === last ? "true" : "false");

    status.textContent = "Stop " + (index + 1) + " of " + episodes.length + ": " + ep.label;
    openPopup(ep);
  }

  function step(by) {
    var next = current < 0 ? (by > 0 ? 0 : -1) : current + by;
    if (next >= 0 && next <= last) select(next);
  }

  /* Events --------------------------------------------------------------- */

  markers.concat(ticks).forEach(function (button) {
    button.addEventListener("click", function () {
      select(Number(button.dataset.index));
    });
  });

  earlier.addEventListener("click", function () { step(-1); });
  later.addEventListener("click", function () { step(1); });

  $(".sm__close").addEventListener("click", function () {
    closePopup();
    if (current >= 0) markers[current].focus();
  });

  // A click on the map itself (not a marker or the popup, and not the end of
  // a drag) closes the popup.
  stage.addEventListener("click", function (event) {
    if (dragged) { dragged = false; return; }
    if (event.target === stage || event.target.closest(".sm__map")) closePopup();
  });

  root.addEventListener("keydown", function (event) {
    if (popup.contains(event.target) && event.key !== "Escape") return;
    if (event.key === "Escape") {
      var inPopup = popup.contains(document.activeElement);
      closePopup();
      if (inPopup && current >= 0) markers[current].focus();
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "+" || event.key === "=") {
      zoomBy(1.8);
    } else if (event.key === "-" || event.key === "_") {
      zoomBy(1 / 1.8);
    } else if (event.key === "0") {
      glideTo({ k: 1, cx: W / 2, cy: H / 2 });
    }
  });

  earlier.setAttribute("aria-disabled", "true");
  render();
  layoutTimeline();
  window.addEventListener("resize", layoutTimeline);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutTimeline);
})();
