// Values computed when the site is built.
export default {
  // Added to the CSS/JS links so browsers fetch fresh copies after each update.
  version: Date.now().toString(36),
  // For the copyright line in the footer.
  year: new Date().getFullYear(),
};
