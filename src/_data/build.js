// Values computed when the site is built.
export default {
  year: new Date().getFullYear(),
  // Added to the CSS/JS links so browsers fetch fresh copies after each update.
  version: Date.now().toString(36),
};
