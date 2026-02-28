// gulpfile.js (CommonJS)
// Node 24 + gulp 5: текстовые (html/scss/js) через gulp-stream,
// бинарные ассеты (fonts/images) — нативно через fs.cpSync (байт-в-байт)

const { src, dest, series, parallel, watch } = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const browserSync = require("browser-sync").create();

const fs = require("fs");
const path = require("path");

/* ---------- Paths ---------- */
const paths = {
  html: { src: "src/index.html", watch: "src/**/*.html", dest: "dist/" },
  styles: { entry: "src/styles/style.scss", watch: "src/**/*.scss", dest: "dist/css/" },
  scripts: { src: "src/scripts/**/*.js", watch: "src/scripts/**/*.js", dest: "dist/js/" },

  // ассеты кроме fonts/images
  assets: {
    src: ["src/assets/**/*", "!src/assets/fonts/**", "!src/assets/images/**"],
    watch: "src/assets/**/*",
    dest: "dist/assets/",
  },

  // бинарные ассеты
  fonts: { watch: "src/assets/fonts/**/*", srcDir: "src/assets/fonts", destDir: "dist/assets/fonts" },
  images: { watch: "src/assets/images/**/*", srcDir: "src/assets/images", destDir: "dist/assets/images" },
};

/* ---------- Helpers ---------- */
async function clean() {
  const { deleteAsync } = await import("del"); // del@8 is ESM-only
  return deleteAsync(["dist"]);
}

function dirCopy(fromDir, toDir) {
  const from = path.resolve(fromDir);
  const to = path.resolve(toDir);
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true, force: true }); // байт-в-байт
}

function reload(done) {
  browserSync.reload();
  done();
}

/* ---------- BUILD tasks (без BrowserSync) ---------- */
function htmlBuild() {
  return src(paths.html.src).pipe(dest(paths.html.dest));
}

// В build — пусть падает с ошибкой (так и должно быть)
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
  dirCopy(paths.fonts.srcDir, paths.fonts.destDir);
  done();
}

function imagesBuild(done) {
  dirCopy(paths.images.srcDir, paths.images.destDir);
  done();
}

/* ---------- DEV tasks (с BrowserSync) ---------- */
function htmlDev(done) {
  src(paths.html.src).pipe(dest(paths.html.dest));
  reload(done);
}

// В dev — НЕ роняем watch при ошибке sass
function stylesDev() {
  return src(paths.styles.entry)
    .pipe(
      sass({ outputStyle: "expanded" }).on("error", function (err) {
        console.error(err.messageFormatted || err.message || err);
        this.emit("end"); // <— ключ: не убиваем gulp/watch
      })
    )
    .pipe(dest(paths.styles.dest))
    .pipe(browserSync.stream());
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
  dirCopy(paths.fonts.srcDir, paths.fonts.destDir);
  reload(done);
}

function imagesDev(done) {
  dirCopy(paths.images.srcDir, paths.images.destDir);
  reload(done);
}

function serve() {
  browserSync.init({
    server: { baseDir: "dist" },
    notify: false,
    open: true,
    // browser: "chrome",
  });

  watch(paths.html.watch, htmlDev);
  watch(paths.styles.watch, stylesDev);
  watch(paths.scripts.watch, scriptsDev);

  // небинарные ассеты
  watch(paths.assets.watch, assetsDev);

  // бинарные ассеты
  watch(paths.fonts.watch, fontsDev);
  watch(paths.images.watch, imagesDev);
}

/* ---------- Exports ---------- */
const build = series(
  clean,
  parallel(htmlBuild, stylesBuild, scriptsBuild, assetsBuild),
  parallel(fontsBuild, imagesBuild)
);

const dev = series(build, serve);

exports.clean = clean;
exports.build = build;
exports.default = dev;