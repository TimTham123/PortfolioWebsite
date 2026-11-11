/*
  site.js: the only script on the site. Everything works without it; it just
  makes two things nicer.
*/
(function () {
  "use strict";

  var each = function (selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  };

  /*
    1. Dropdowns for "Interests" and "Sound Design" (any nav item with sub-pages).

    The [+] / [-] button opens and closes the list of sub-pages underneath it.
    It's a plain click/tap toggle (no hover) so it behaves the same with a
    mouse, a finger or a keyboard. Without JavaScript the sub-pages are simply
    always shown.
  */
  each(".nav-group", function (group) {
    var button = group.querySelector(".nav-toggle");
    if (!button) return;

    function setOpen(open) {
      group.setAttribute("data-open", open ? "true" : "false");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    }

    button.addEventListener("click", function () {
      setOpen(button.getAttribute("aria-expanded") !== "true");
    });

    // Escape closes the dropdown and puts focus back on its button.
    group.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        button.focus();
      }
    });
  });

  /*
    2. Wide tables scroll sideways on small screens. While one does, make its
    scroll box reachable with the keyboard (Tab to it, then use the arrow keys).
  */
  function updateScrollBoxes() {
    each(".table-scroll", function (box) {
      if (box.scrollWidth > box.clientWidth + 1) {
        var caption = box.querySelector("caption");
        box.setAttribute("tabindex", "0");
        box.setAttribute("role", "region");
        box.setAttribute("aria-label", (caption ? caption.textContent + ", " : "") + "table, scrolls sideways");
      } else {
        box.removeAttribute("tabindex");
        box.removeAttribute("role");
        box.removeAttribute("aria-label");
      }
    });
  }

  updateScrollBoxes();
  window.addEventListener("resize", updateScrollBoxes);
})();
