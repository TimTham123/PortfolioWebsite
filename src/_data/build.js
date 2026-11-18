// Values computed when the site is built.
export default {
  // Added to the CSS/JS links so browsers fetch fresh copies after each update.
  version: Date.now().toString(36),
  // For the copyright line in the footer.
  year: new Date().getFullYear(),
  // Where the site lives, when the deploy says (see .github/workflows/
  // deploy.yml); otherwise site.json's "origin" is used.
  origin: process.env.SITE_ORIGIN || "",
};
