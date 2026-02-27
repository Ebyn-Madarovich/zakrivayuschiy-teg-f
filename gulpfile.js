// gulpfile.js (CommonJS)

const { src, dest, series, parallel, watch } = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const browserSync = require("browser-sync").create();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* ---------- Paths ---------- */
const paths = {
  html: { src: "src/index.html", watch: "src/**/*.html", dest: "dist/" },
  styles: { entry: "src/styles/style.scss", watch: "src/**/*.scss", dest: "dist/css/" },
  scripts: { src: "src/scripts/**/*.js", watch: "src/scripts/**/*.js", dest: "dist/js/" },

  // assets без fonts, fonts копируем отдельно через fs.cpSync
  assets: { src: ["src/assets/**/*", "!src/assets/fonts/**"], watch: "src/assets/**/*", dest: "dist/assets/" },
  fonts: { watch: "src/assets/fonts/**/*", srcDir: "src/assets/fonts", destDir: "dist/assets/fonts" },
};

/* ---------- Helpers ---------- */
async function clean() {
  // del@8 is ESM-only
  const { deleteAsync } = await import("del");
  return deleteAsync(["dist"]);
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fontsCopy() {
  const from = path.resolve(paths.fonts.srcDir);
  const to = path.resolve(paths.fonts.destDir);
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true, force: true });
}

function reload(done) {
  browserSync.reload();
  done();
}

/* ---------- BUILD tasks (без BrowserSync) ---------- */
function htmlBuild() {
  return src(paths.html.src).pipe(dest(paths.html.dest));
}

function stylesBuild() {
  return src(paths.styles.entry)
    .pipe(sass({ outputStyle: "expanded" }).on("error", sass.logError))
    .pipe(dest(paths.styles.dest));
}

function scriptsBuild() {
  return src(paths.scripts.src).pipe(dest(paths.scripts.dest));
}

function assetsBuild() {
  return src(paths.assets.src).pipe(dest(paths.assets.dest));
}

function fontsBuild(done) {
  fontsCopy();
  done();
}

function verifyFonts(done) {
  const pairs = [
    ["src/assets/fonts/Inter-Variable.woff2", "dist/assets/fonts/Inter-Variable.woff2"],
    ["src/assets/fonts/PressStart2P-Regular.woff", "dist/assets/fonts/PressStart2P-Regular.woff"],
  ];

  for (const [a, b] of pairs) {
    const ha = sha256(a);
    const hb = sha256(b);
    if (ha !== hb) return done(new Error(`Font mismatch: ${b}\n  src : ${ha}\n  dist: ${hb}`));
  }
  console.log("✅ Fonts verified: dist === src");
  done();
}

/* ---------- DEV tasks (с BrowserSync) ---------- */
function htmlDev(done) {
  src(paths.html.src).pipe(dest(paths.html.dest));
  reload(done);
}

function stylesDev() {
  return src(paths.styles.entry)
    .pipe(sass({ outputStyle: "expanded" }).on("error", sass.logError))
    .pipe(dest(paths.styles.dest))
    .pipe(browserSync.stream()); // CSS можно стримить без full reload
}

function scriptsDev(done) {
  src(paths.scripts.src).pipe(dest(paths.scripts.dest));
  reload(done);
}

function assetsDev(done) {
  src(paths.assets.src).pipe(dest(paths.assets.dest));
  reload(done);
}

function fontsDev(done) {
  fontsCopy();
  reload(done);
}

function serve() {
  browserSync.init({
    server: { baseDir: "dist" },
    notify: false,
    open: true,
    // browser: "chrome", // оставь если нужно именно Chrome
  });

  watch(paths.html.watch, htmlDev);
  watch(paths.styles.watch, stylesDev);
  watch(paths.scripts.watch, scriptsDev);
  watch(paths.assets.watch, assetsDev);
  watch(paths.fonts.watch, fontsDev);
}

/* ---------- Exports ---------- */
const build = series(clean, parallel(htmlBuild, stylesBuild, scriptsBuild, assetsBuild), fontsBuild, verifyFonts);
const dev = series(build, serve);

exports.clean = clean;
exports.build = build;
exports.default = dev;