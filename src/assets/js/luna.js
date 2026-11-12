/*
  Luna, at the bottom of the Cat page (src/_includes/partials/luna.njk).

  Her eyes follow the cursor around the page: the black of each eye drifts
  towards it (smoothly), inside an eye that always stays the same size. When
  the mouse leaves the window, she looks straight ahead again. On a phone she
  looks towards wherever you tap. Her tail flick is in the CSS. For people
  who've asked their device to reduce motion, she just sits still.
*/
(function () {
  "use strict";

  var luna = document.querySelector(".luna");
  if (!luna || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  luna.classList.add("is-awake");

  var svg = luna.querySelector("svg");
  var pupils = luna.querySelector(".luna__pupils");
  var VIEW_WIDTH = 130;   // her drawing's width, in its own units
  var EYES = [67, 64];    // between her eyes, in the drawing
  var MOST = 2.2;         // how far the black can drift (drawing units)
  var target = [0, 0];
  var now = [0, 0];
  var frame = null;
  var backTimer = null;

  // Aim the black of her eyes at a point on screen.
  function lookAt(x, y) {
    var box = svg.getBoundingClientRect();
    var scale = box.width / VIEW_WIDTH;
    var dx = x - (box.left + EYES[0] * scale);
    var dy = y - (box.top + EYES[1] * scale);
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var r = Math.min(MOST, d / 25);
    target = [dx / d * r, dy / d * r];
    move();
  }

  function lookAhead() {
    target = [0, 0];
    move();
  }

  // Ease towards the target, a frame at a time.
  function move() {
    if (frame) return;
    frame = requestAnimationFrame(function step() {
      now[0] += (target[0] - now[0]) * 0.3;
      now[1] += (target[1] - now[1]) * 0.3;
      var done = Math.abs(target[0] - now[0]) < 0.02 && Math.abs(target[1] - now[1]) < 0.02;
      if (done) now = target.slice();
      pupils.setAttribute("transform", "translate(" + now[0].toFixed(2) + " " + now[1].toFixed(2) + ")");
      frame = done ? null : requestAnimationFrame(step);
    });
  }

  document.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") return;
    clearTimeout(backTimer);
    lookAt(event.clientX, event.clientY);
  }, { passive: true });

  // The mouse left the window: look ahead again.
  document.documentElement.addEventListener("mouseleave", lookAhead);

  // Phones: look towards a tap, then back after a moment.
  document.addEventListener("pointerdown", function (event) {
    if (event.pointerType !== "touch") return;
    lookAt(event.clientX, event.clientY);
    clearTimeout(backTimer);
    backTimer = setTimeout(lookAhead, 2500);
  }, { passive: true });
})();
