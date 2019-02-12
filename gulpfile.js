const gulp = require("gulp")
const gulpSass = require("gulp-sass")
const concat = require("gulp-concat")
// const livereload = require("gulp-livereload")
const cleanCSS = require("gulp-clean-css")
const gulpClean = require("gulp-clean")
const pm2 = require("pm2")
const browserSync = require("browser-sync").has("hammad") ? require("browser-sync").get("hammad") : require("browser-sync").create("hammad")
const ts = require("gulp-typescript")
const tsProject = ts.createProject("tsconfig.json")
const pckg = require("./package.json")
const noop = require("lodash/noop")
const path = require("path")
const fs = require("fs")
const chance = require("chance")()
const fileReader = require("util").promisify(fs.readFile)
const pathOfConf = path.join(__dirname, ".env")
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

gulpSass.compiler = require("node-sass")

gulp.task("clean", function clean() {
  return gulp.src("./public/css", { read: false, allowEmpty: true }).pipe(gulpClean())
})

gulp.task("sass", function sass() {
  return (
    gulp
      .src("./scss/main.scss")
      .pipe(gulpSass().on("error", gulpSass.logError))
      .pipe(concat("style.css"))
      .pipe(cleanCSS())
      .pipe(gulp.dest("./public/css"))
      // .pipe(livereload())
      .pipe(browserSync.stream())
  )
})

gulp.task("tsc", function tsc(done) {
  tsProject
    .src()
    .pipe(tsProject())
    .js.pipe(gulp.dest("./dist"))
    .on("end", function() {
      pm2.restart(pckg.name, async function() {
        browserSync.notify("RELOADING JS Files")
        await sleep(500)
        browserSync.reload()
        done()
      })
    })
})

gulp.task("watchSass", function() {
  return gulp.watch("./scss/**/*.scss", gulp.parallel("sass"))
})

gulp.task("watchHbs", function() {
  gulp.watch("./views/**/*.hbs", function(done) {
    pm2.restart(pckg.name, async function() {
      browserSync.notify("RELOADING Hbs")
      await sleep(100)
      browserSync.reload()
      done()
    })
  })
})

gulp.task("watchTsc", function() {
  return gulp.watch("./src/**/*.ts", gulp.parallel("tsc"))
})

async function startBrowserSync() {
  if (browserSync.active) return
  await sleep(1000)
  browserSync.init(
    {
      port: 3000,
      proxy: "https://localhost:42010"
    },
    noop
  )
}

gulp.task("server", function() {
  startBrowserSync()
  pm2.connect(true, function() {
    pm2.start(
      {
        name: pckg.name,
        script: "dist/index.js",
        env: require("dotenv").parse("./.env")
      },
      function(err) {
        if (err != null) console.error(err)
        pm2.streamLogs("all", 0)
      }
    )
  })
})

gulp.task("renew-salt", function(done) {
  fileReader(pathOfConf).then(file => {
    let completeFile = file.toString().split("\n")
    completeFile[completeFile.findIndex(line => line.startsWith("SECRET"))] = `SECRET="${chance.guid()}#@${chance.hash()}"`
    fs.writeFileSync(pathOfConf, completeFile.join("\n"))
    done()
  })
})

gulp.task("dev", gulp.series("clean", "sass", "tsc", gulp.parallel("server", "watchSass", "watchTsc")))
// TODO: build task
// TODO: client js task
