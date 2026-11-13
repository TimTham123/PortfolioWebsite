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

  Markers never touch: whenever the map's scale changes (a smaller screen,
  or zooming), dots that would be too close are spread apart, and the route
  is redrawn to meet them (see "Spacing the markers").
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
  var faintSegments = $$(".sm__route-faint path");
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

  /* Spacing the markers -------------------------------------------------- */

  // Markers stay the same size on screen at every zoom, so on a small map (a
  // phone, or zoomed right out) dots in places near each other would touch.
  // Whenever the scale changes they're spread out, just enough that no two
  // dots are closer than SPACE, centre to centre, each staying as near its
  // real spot as it can; zooming in brings them back. Stops in the same place
  // are a short line of dots, SPACE apart, each up and to the right of the
  // one before. The route's legs are redrawn to meet the dots where they end
  // up (the roads between stay put).
  var SPACE = 18; // px: an 11px dot and its outline, a clear gap, and room for the chosen one's ring
  var STEP = SPACE / Math.SQRT2; // across and up, from one dot in a line to the next
  root.style.setProperty("--pile-step", STEP + "px"); // so the place's name clears its line (style.css)

  var scale = 0; // screen px per map unit, at the map's current size and zoom
  var places = [];
  var spots = episodes.map(function (ep) {
    var p = places.filter(function (q) { return Math.abs(q.tx - ep.tx) < 0.5 && Math.abs(q.ty - ep.ty) < 0.5; })[0];
    if (!p) places.push((p = { tx: ep.tx, ty: ep.ty, size: 0, x: 0, y: 0 }));
    return { place: p, k: p.size++ };
  });

  // How far along its place's line dot `k` is, from the line's middle.
  function along(p, k) {
    return (k - (p.size - 1) / 2) * STEP;
  }

  // Every place starts at its real spot (in px, at the current scale); then
  // any two dots that are too close are pushed apart (the place with more
  // dots moving less), over and over until none are.
  function spreadMarkers() {
    places.forEach(function (p) {
      p.x = p.tx * scale;
      p.y = p.ty * scale;
    });
    for (var pass = 0; pass < 200; pass++) {
      var worst = 0;
      for (var i = 0; i < places.length; i++) {
        for (var j = i + 1; j < places.length; j++) {
          var p = places[i];
          var q = places[j];
          var reach = ((p.size + q.size) / 2) * SPACE;
          if (Math.abs(q.x - p.x) > reach || Math.abs(q.y - p.y) > reach) continue;
          for (var a = 0; a < p.size; a++) {
            for (var b = 0; b < q.size; b++) {
              var ta = along(p, a);
              var tb = along(q, b);
              var dx = q.x + tb - (p.x + ta);
              var dy = q.y - tb - (p.y - ta);
              var d = Math.sqrt(dx * dx + dy * dy);
              if (d >= SPACE) continue;
              if (d < 0.001) { dx = d = 0.001; dy = 0; } // right on top of each other: push sideways
              var push = SPACE - d;
              var share = q.size / (p.size + q.size);
              p.x -= (dx / d) * push * share;
              p.y -= (dy / d) * push * share;
              q.x += (dx / d) * push * (1 - share);
              q.y += (dy / d) * push * (1 - share);
              worst = Math.max(worst, push);
            }
          }
        }
      }
      if (worst < 0.05) break;
    }
  }

  // Where stop `i`'s dot is, in map units (until the map has a size, where
  // the page put its marker).
  function dotOf(i) {
    if (!scale) return { x: episodes[i].x, y: episodes[i].y };
    var spot = spots[i];
    var t = along(spot.place, spot.k);
    return { x: (spot.place.x + t) / scale, y: (spot.place.y - t) / scale };
  }

  // The middle of stop `i`'s line of dots, in map units.
  function lineOf(i) {
    if (!scale) return { x: episodes[i].x, y: episodes[i].y };
    var p = spots[i].place;
    return { x: p.x / scale, y: p.y / scale };
  }

  // The drive home ends at the first stop in the same place, where the trip
  // began (with its full stop hidden under that stop's marker).
  var homeAt = homeDot ? { x: Number(homeDot.getAttribute("cx")), y: Number(homeDot.getAttribute("cy")) } : null;
  var homeStop = -1;
  for (var n = 0; homeAt && n <= last && homeStop < 0; n++) {
    if (Math.abs(episodes[n].tx - homeAt.x) < 0.5 && Math.abs(episodes[n].ty - homeAt.y) < 0.5) homeStop = n;
  }

  // One end of a leg: a stop's dot, or home (-1).
  function endOf(ref) {
    if (ref >= 0) return dotOf(ref);
    return homeStop >= 0 ? dotOf(homeStop) : homeAt;
  }

  // Each leg of the route, so its ends can follow the dots. A road (a line
  // through many points) keeps everything but its ends; a leg drawn as a
  // curve keeps its bend.
  var NUMBER = /-?\d+(?:\.\d+)?/g;
  var legs = segments.map(function (path, i) {
    var d = path.getAttribute("d");
    var n = (d.match(NUMBER) || []).map(Number);
    var leg = { ink: path, faint: faintSegments[i], from: i, to: i < last ? i + 1 : -1, length: 0, dash: 0 };
    if (d.indexOf("Q") !== -1) {
      leg.curve = { ax: n[0], ay: n[1], qx: n[2], qy: n[3], bx: n[4], by: n[5] };
      return leg;
    }
    leg.road = [];
    for (var k = 2; k < n.length - 2; k += 2) leg.road.push([n[k], n[k + 1]]);
    leg.roadPath = leg.road.map(function (pt) { return "L" + pt[0] + " " + pt[1]; }).join("");
    leg.roadLength = 0;
    for (k = 1; k < leg.road.length; k++) {
      leg.roadLength += Math.hypot(leg.road[k][0] - leg.road[k - 1][0], leg.road[k][1] - leg.road[k - 1][1]);
    }
    return leg;
  });

  function curveLength(a, qx, qy, b) {
    var length = 0;
    var x0 = a.x;
    var y0 = a.y;
    for (var k = 1; k <= 16; k++) {
      var t = k / 16;
      var u = 1 - t;
      var x = u * u * a.x + 2 * u * t * qx + t * t * b.x;
      var y = u * u * a.y + 2 * u * t * qy + t * t * b.y;
      length += Math.hypot(x - x0, y - y0);
      x0 = x;
      y0 = y;
    }
    return length;
  }

  function num(value) {
    return Math.round(value * 100) / 100;
  }

  // A leg is drawn as one dash as long as itself, followed by a gap longer
  // than any leg (see inkTo).
  function setDash(leg) {
    leg.dash = leg.length;
    leg.ink.style.strokeDasharray = leg.dash + " 100000";
  }

  function redrawRoute() {
    legs.forEach(function (leg) {
      var a = endOf(leg.from);
      var b = endOf(leg.to);
      var d;
      var length;
      if (leg.curve) {
        var c = leg.curve;
        var qx = c.qx + (a.x - c.ax + b.x - c.bx) / 2;
        var qy = c.qy + (a.y - c.ay + b.y - c.by) / 2;
        d = "M" + num(a.x) + " " + num(a.y) + "Q" + num(qx) + " " + num(qy) + " " + num(b.x) + " " + num(b.y);
        length = curveLength(a, qx, qy, b);
      } else if (leg.road.length) {
        var first = leg.road[0];
        var end = leg.road[leg.road.length - 1];
        d = "M" + num(a.x) + " " + num(a.y) + leg.roadPath + "L" + num(b.x) + " " + num(b.y);
        length = Math.hypot(first[0] - a.x, first[1] - a.y) + leg.roadLength + Math.hypot(b.x - end[0], b.y - end[1]);
      } else {
        d = "M" + num(a.x) + " " + num(a.y) + "L" + num(b.x) + " " + num(b.y);
        length = Math.hypot(b.x - a.x, b.y - a.y);
      }
      leg.faint.setAttribute("d", d);
      leg.ink.setAttribute("d", d);
      leg.length = length * 1.01 + 1; // a hair long, so a drawn leg reaches its dot
      if (leg.ink.classList.contains("is-inked")) {
        setDash(leg);
      } else {
        // A hidden leg goes behind its new dash at once.
        leg.ink.style.transitionDuration = "0s";
        leg.ink.style.transitionDelay = "0s";
        setDash(leg);
        leg.ink.style.strokeDashoffset = leg.dash;
      }
    });
    if (homeDot) {
      var home = endOf(-1);
      homeDot.setAttribute("cx", num(home.x));
      homeDot.setAttribute("cy", num(home.y));
    }
  }

  // The handwritten name of the place you're at goes on whichever side of
  // its line of dots covers fewer markers, and stays on the map (on the
  // right if it's all the same, unless that's near the right-hand edge).
  function nameGoesLeft(spot) {
    var width = stage.clientWidth;
    var height = stage.clientHeight;
    var x = (spot.left / 100) * width;
    var y = (spot.top / 100) * height;
    var gap = 14 + ((spots[current].place.size - 1) / 2) * STEP; // as in style.css
    var w = place.offsetWidth;
    var h = place.offsetHeight;
    function covered(left) {
      var x0 = left ? x - gap - w : x + gap;
      var y0 = y - 0.55 * h;
      var count = x0 < 0 || x0 + w > width ? 100 : 0;
      markers.forEach(function (marker, i) {
        if (spots[i].place === spots[current].place) return;
        var dot = dotOf(i);
        var at = toStage(dot.x, dot.y);
        var mx = (at.left / 100) * width;
        var my = (at.top / 100) * height;
        if (mx > x0 - 7 && mx < x0 + w + 7 && my > y0 - 7 && my < y0 + h + 7) count++;
      });
      return count;
    }
    var right = covered(false);
    var left = covered(true);
    return left < right || (left === right && spot.left > 62);
  }

  function render() {
    var w = W / view.k;
    var h = H / view.k;
    svg.setAttribute("viewBox", [view.cx - w / 2, view.cy - h / 2, w, h].join(" "));
    stage.style.setProperty("--zoom", view.k);
    displacement.setAttribute("scale", (PEN_WOBBLE / view.k).toFixed(3));

    // A new size or zoom: space the markers out again.
    var size = (stage.clientWidth * view.k) / W;
    if (size > 0 && Math.abs(size - scale) > 1e-6) {
      scale = size;
      spreadMarkers();
      redrawRoute();
    }

    markers.forEach(function (marker, i) {
      var dot = dotOf(i);
      var at = toStage(dot.x, dot.y);
      marker.style.left = at.left + "%";
      marker.style.top = at.top + "%";
      // Off-screen markers can't be tabbed to.
      marker.style.visibility = at.left < -2 || at.left > 102 || at.top < -2 || at.top > 102 ? "hidden" : "";
    });
    if (current >= 0) {
      var line = lineOf(current);
      var spot = toStage(line.x, line.y);
      place.style.left = spot.left + "%";
      place.style.top = spot.top + "%";
      place.classList.toggle("is-left", nameGoesLeft(spot));
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

  // Each leg starts hidden: its dash is slid back off its start, leaving just
  // the gap. Sliding the dash forward again draws the line. (Spacing the
  // markers out works out every leg's length, and hides it.)
  render();
  legs.forEach(function (leg) {
    if (leg.dash) return;
    leg.length = leg.ink.getTotalLength() + 1; // (the map has no size yet)
    setDash(leg);
    leg.ink.style.strokeDashoffset = leg.dash;
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
      var leg = legs[forward ? inked + k : inked - 1 - k];
      leg.ink.style.transitionDuration = each + "ms";
      leg.ink.style.transitionDelay = k * each + "ms";
      if (forward) setDash(leg);
      leg.ink.style.strokeDashoffset = forward ? 0 : leg.dash;
      // (the class, not the dash, says whether a leg is drawn: redrawRoute
      // keeps drawn legs drawn, and the tests count them)
      leg.ink.classList.toggle("is-inked", forward);
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
    // Past the end of its line of dots (--pile-step apart, across and up).
    place.style.setProperty("--reach", (spots[index].place.size - 1) / 2);
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
  // The markers are spaced for the map's size, so again whenever it changes.
  if (window.ResizeObserver) new ResizeObserver(function () { render(); }).observe(stage);
  else window.addEventListener("resize", render);
  window.addEventListener("resize", layoutTimeline);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutTimeline);
})();
