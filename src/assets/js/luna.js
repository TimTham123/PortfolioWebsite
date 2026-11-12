/*
  Luna, at the bottom of the Cat page (src/_includes/partials/luna.njk).

  She blinks now and then and flicks her tail (in the CSS). When the mouse
  comes near, her eyes go wide and follow it; if it comes too close, she
  swats at it with the paw on that side, and keeps batting at it while it
  stays. On a phone, tapping her makes her swat. For people who've asked
  their device to reduce motion, she just sits still.
*/
(function () {
  "use strict";

  var luna = document.querySelector(".luna");
  if (!luna || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  luna.classList.add("is-awake");

  var svg = luna.querySelector("svg");
  var pupils = luna.querySelector(".luna__pupils");
  var arms = {
    right: { el: luna.querySelector(".luna__arm--right"), shoulder: [84, 118], rest: 150, natural: -49, flip: 1 },
    left: { el: luna.querySelector(".luna__arm--left"), shoulder: [49, 118], rest: -150, natural: -131, flip: -1 },
  };
  var VIEW_WIDTH = 130;  // her drawing's width, in its own units
  var NOTICE = 170;      // px from her: she watches the mouse
  var REACH = 55;        // px from her: she swats at it
  var COOLDOWN = 650;    // ms between swats
  var lastSwat = -Infinity;
  var pointer = null;    // where the mouse last was
  var calmTimer = null;
  var againTimer = null;

  // A point in her drawing -> where it is on screen.
  function onScreen(x, y) {
    var box = svg.getBoundingClientRect();
    var scale = box.width / VIEW_WIDTH;
    return [box.left + x * scale, box.top + y * scale];
  }

  // How far a point on screen is from her (0 if it's on her).
  function distanceFrom(x, y) {
    var box = svg.getBoundingClientRect();
    var dx = Math.max(box.left - x, 0, x - box.right);
    var dy = Math.max(box.top - y, 0, y - box.bottom);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function look(x, y) {
    var eyes = onScreen(67, 64);
    var dx = x - eyes[0];
    var dy = y - eyes[1];
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var r = Math.min(3, d / 30);
    pupils.setAttribute("transform", "translate(" + (dx / d * r).toFixed(2) + " " + (dy / d * r).toFixed(2) + ")");
  }

  function alert(x, y) {
    luna.classList.add("is-alert");
    look(x, y);
    clearTimeout(calmTimer);
    calmTimer = setTimeout(calm, 1400);
  }

  function calm() {
    luna.classList.remove("is-alert");
    pupils.removeAttribute("transform");
  }

  // Swat towards (x, y) with the paw on that side.
  function swat(x, y) {
    var now = performance.now();
    if (now - lastSwat < COOLDOWN || !svg.animate) return;
    lastSwat = now;
    var box = svg.getBoundingClientRect();
    var arm = arms[x < box.left + box.width / 2 ? "left" : "right"];
    var shoulder = onScreen(arm.shoulder[0], arm.shoulder[1]);
    var angle = Math.atan2(y - shoulder[1], x - shoulder[0]) * 180 / Math.PI;
    var aim = ((angle - arm.natural + 540) % 360) - 180;
    aim = arm.flip > 0 ? Math.max(-45, Math.min(55, aim)) : Math.max(-55, Math.min(45, aim));
    var f = arm.flip;
    arm.el.animate([
      { transform: "rotate(" + arm.rest + "deg)" },
      { transform: "rotate(" + (aim - 14 * f) + "deg)", offset: 0.3 },
      { transform: "rotate(" + (aim + 16 * f) + "deg)", offset: 0.48 },
      { transform: "rotate(" + (aim - 6 * f) + "deg)", offset: 0.66 },
      { transform: "rotate(" + arm.rest + "deg)" },
    ], { duration: 560, easing: "cubic-bezier(.3, .7, .4, 1)" });

    // Still there? Have another go.
    clearTimeout(againTimer);
    againTimer = setTimeout(function () {
      if (pointer && distanceFrom(pointer[0], pointer[1]) < REACH) {
        alert(pointer[0], pointer[1]);
        swat(pointer[0], pointer[1]);
      }
    }, COOLDOWN + 250);
  }

  var frame = null;
  document.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") return;
    pointer = [event.clientX, event.clientY];
    if (frame) return;
    frame = requestAnimationFrame(function () {
      frame = null;
      var d = distanceFrom(pointer[0], pointer[1]);
      if (d < NOTICE) alert(pointer[0], pointer[1]);
      if (d < REACH) swat(pointer[0], pointer[1]);
    });
  }, { passive: true });

  // The mouse left the window.
  document.documentElement.addEventListener("mouseleave", function () { pointer = null; });

  // Phones: tap her.
  document.addEventListener("pointerdown", function (event) {
    if (event.pointerType !== "touch" || distanceFrom(event.clientX, event.clientY) > 20) return;
    alert(event.clientX, event.clientY);
    lastSwat = -Infinity;
    swat(event.clientX, event.clientY - 30);
  }, { passive: true });

  // Blink now and then.
  (function blink() {
    setTimeout(function () {
      luna.classList.add("is-blinking");
      setTimeout(function () {
        luna.classList.remove("is-blinking");
        blink();
      }, 130);
    }, 2500 + Math.random() * 4500);
  })();
})();
