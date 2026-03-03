// gulpfile.js (CommonJS)
// Node 24 + gulp 5
// Текстовые (html/scss/js) — через gulp-stream
// Бинарные ассеты (fonts/images) — нативно через fs.cpSync (байт-в-байт)
// + Дополнительно генерим WebP/AVIF, не трогая оригиналы
// DEV: images инкрементально (по filePath) + чистка мусора при unlink

const { src, dest, series, parallel, watch } = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const browserSync = require("browser-sync").create();

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

/* ---------- Build dirs ---------- */
const DIST_DIR = "dist";
const PAGES_DIR = "docs"; // GitHub Pages умеет публиковать /docs из ветки

/* ---------- Paths ---------- */
const paths = {
  html: { src: "src/index.html", watch: "src/**/*.html", dist: `${DIST_DIR}/` },
  styles: { entry: "src/styles/style.scss", watch: "src/**/*.scss", dist: `${DIST_DIR}/css/` },
  scripts: { src: "src/scripts/**/*.js", watch: "src/scripts/**/*.js", dist: `${DIST_DIR}/js/` },

  // ассеты кроме fonts/images (у тебя тут icons и т.п.)
  assets: {
    src: ["src/assets/**/*", "!src/assets/fonts/**", "!src/assets/images/**"],
    watch: ["src/assets/**/*", "!src/assets/fonts/**", "!src/assets/images/**"],
    dist: `${DIST_DIR}/assets/`,
  },

  fonts: {
    watch: "src/assets/fonts/**/*",
    srcDir: "src/assets/fonts",
    distDir: `${DIST_DIR}/assets/fonts`,
  },

  images: {
    watch: "src/assets/images/**/*",
    srcDir: "src/assets/images",
    distDir: `${DIST_DIR}/assets/images`,
  },
};

/* ---------- Helpers ---------- */
async function clean() {
  const { deleteAsync } = await import("del");
  // dist — локальная сборка, docs — публикация Pages
  return deleteAsync([DIST_DIR, PAGES_DIR]);
}

function dirCopy(fromDir, toDir) {
  const from = path.resolve(fromDir);
  const to = path.resolve(toDir);
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true, force: true });
}

async function dirResetAndCopy(fromDir, toDir) {
  await fsp.rm(toDir, { recursive: true, force: true });
  dirCopy(fromDir, toDir);
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function isSrcNewerThanOut(srcPath, outPath) {
  try {
    const [s, o] = await Promise.all([fsp.stat(srcPath), fsp.stat(outPath)]);
    return s.mtimeMs > o.mtimeMs;
  } catch {
    return true;
  }
}

async function generateForOneImage(srcFileAbs, srcRootAbs, destRootAbs) {
  if (!/\.(jpe?g|png)$/i.test(srcFileAbs)) return;

  const rel = path.relative(srcRootAbs, srcFileAbs);
  const relNoExt = rel.replace(/\.(jpe?g|png)$/i, "");

  const outWebp = path.join(destRootAbs, relNoExt + ".webp");
  const outAvif = path.join(destRootAbs, relNoExt + ".avif");

  await ensureDir(path.dirname(outWebp));

  const needWebp = await isSrcNewerThanOut(srcFileAbs, outWebp);
  const needAvif = await isSrcNewerThanOut(srcFileAbs, outAvif);

  const jobs = [];

  if (needWebp) {
    jobs.push(
      sharp(srcFileAbs)
        .webp({ quality: 80 })
        .toBuffer()
        .then((buf) => fsp.writeFile(outWebp, buf))
    );
  }

  if (needAvif) {
    jobs.push(
      sharp(srcFileAbs)
        .avif({ quality: 45 })
        .toBuffer()
        .then((buf) => fsp.writeFile(outAvif, buf))
    );
  }

  await Promise.all(jobs);
}

async function listFilesRecursive(dir) {
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });

  for (const e of entries) {
    const p = path.join(dir, e.name);

    // на всякий: не ходим по симлинкам
    if (e.isSymbolicLink && e.isSymbolicLink()) continue;

    if (e.isDirectory()) out.push(...(await listFilesRecursive(p)));
    else out.push(p);
  }

  return out;
}

async function generateModernImages(srcDir, destDir) {
  const absSrc = path.resolve(srcDir);
  const absDest = path.resolve(destDir);

  const files = await listFilesRecursive(absSrc);
  const raster = files.filter((p) => /\.(jpe?g|png)$/i.test(p));

  for (const inPath of raster) {
    await generateForOneImage(inPath, absSrc, absDest);
  }
}

async function copyOneFileFromImages(srcFileAbs) {
  const srcRootAbs = path.resolve(paths.images.srcDir);
  const destRootAbs = path.resolve(paths.images.distDir);

  const rel = path.relative(srcRootAbs, srcFileAbs);
  const outAbs = path.join(destRootAbs, rel);

  await ensureDir(path.dirname(outAbs));
  await fsp.copyFile(srcFileAbs, outAbs);
}

async function deleteOneFileFromDist(srcFileAbs) {
  const srcRootAbs = path.resolve(paths.images.srcDir);
  const destRootAbs = path.resolve(paths.images.distDir);

  const rel = path.relative(srcRootAbs, srcFileAbs);
  const outOriginal = path.join(destRootAbs, rel);

  await fsp.rm(outOriginal, { force: true });

  if (/\.(jpe?g|png)$/i.test(srcFileAbs)) {
    const relNoExt = rel.replace(/\.(jpe?g|png)$/i, "");
    await fsp.rm(path.join(destRootAbs, relNoExt + ".webp"), { force: true });
    await fsp.rm(path.join(destRootAbs, relNoExt + ".avif"), { force: true });
  }
}

/* ---------- BUILD ---------- */
function htmlBuild() {
  return src(paths.html.src).pipe(dest(paths.html.dist));
}

function stylesBuild() {
  return src(paths.styles.entry)
    .pipe(sass({ outputStyle: "expanded" }).on("error", sass.logError))
    .pipe(dest(paths.styles.dist));
}

function scriptsBuild() {
  return src(paths.scripts.src).pipe(dest(paths.scripts.dist));
}

function assetsBuild() {
  return src(paths.assets.src).pipe(dest(paths.assets.dist));
}

function fontsBuild(done) {
  dirCopy(paths.fonts.srcDir, paths.fonts.distDir);
  done();
}

async function imagesBuild() {
  await dirResetAndCopy(paths.images.srcDir, paths.images.distDir);
  await generateModernImages(paths.images.srcDir, paths.images.distDir);
}

/* ---------- GitHub Pages mirror (dist -> docs) ---------- */
function pagesBuild(done) {
  // полностью зеркалим dist в docs
  dirCopy(DIST_DIR, PAGES_DIR);
  done();
}

/* ---------- DEV ---------- */
function htmlDev() {
  return src(paths.html.src)
    .pipe(dest(paths.html.dist))
    .on("end", () => browserSync.reload());
}

function stylesDev() {
  return src(paths.styles.entry)
    .pipe(
      sass({ outputStyle: "expanded" }).on("error", function (err) {
        console.error(err.messageFormatted || err.message || err);
        this.emit("end");
      })
    )
    .pipe(dest(paths.styles.dist))
    .pipe(browserSync.stream());
}

function scriptsDev() {
  return src(paths.scripts.src)
    .pipe(dest(paths.scripts.dist))
    .on("end", () => browserSync.reload());
}

function assetsDev() {
  return src(paths.assets.src)
    .pipe(dest(paths.assets.dist))
    .on("end", () => browserSync.reload());
}

function fontsDev(done) {
  dirCopy(paths.fonts.srcDir, paths.fonts.distDir);
  browserSync.reload();
  done();
}

async function handleImagesWatch(event, filePath) {
  const srcRootAbs = path.resolve(paths.images.srcDir);
  const destRootAbs = path.resolve(paths.images.distDir);
  const absPath = path.resolve(filePath);

  try {
    if (event === "addDir") {
      const rel = path.relative(srcRootAbs, absPath);
      await ensureDir(path.join(destRootAbs, rel));
      return;
    }

    if (event === "unlinkDir") {
      const rel = path.relative(srcRootAbs, absPath);
      await fsp.rm(path.join(destRootAbs, rel), { recursive: true, force: true });
      return;
    }

    if (event === "unlink") {
      await deleteOneFileFromDist(absPath);
      return;
    }

    if (event === "add" || event === "change") {
      await copyOneFileFromImages(absPath);
      await generateForOneImage(absPath, srcRootAbs, destRootAbs);
      return;
    }
  } catch (e) {
    console.error("[images watch error]", e);
  }
}

function serve() {
  browserSync.init({
    server: { baseDir: DIST_DIR },
    notify: false,
    open: true,
  });

  watch(paths.html.watch, htmlDev);
  watch(paths.styles.watch, stylesDev);
  watch(paths.scripts.watch, scriptsDev);
  watch(paths.assets.watch, assetsDev);
  watch(paths.fonts.watch, fontsDev);

  const w = watch(paths.images.watch);
  w.on("all", async (event, filePath) => {
    await handleImagesWatch(event, filePath);
    browserSync.reload();
  });
}

/* ---------- Exports ---------- */
const build = series(
  clean,
  parallel(htmlBuild, stylesBuild, scriptsBuild, assetsBuild),
  parallel(fontsBuild, imagesBuild),
  pagesBuild // после билда зеркалим в /docs для GitHub Pages
);

const dev = series(build, serve);

exports.clean = clean;
exports.build = build;
exports.default = dev;