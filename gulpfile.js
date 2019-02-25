const gulp = require("gulp")
const gulpSass = require("gulp-sass")
const concat = require("gulp-concat")
const cleanCSS = require("gulp-clean-css")
const gulpClean = require("gulp-clean")
const pm2 = require("pm2")
const browserSync = require("browser-sync").has("hammad")
  ? require("browser-sync").get("hammad")
  : require("browser-sync").create("hammad")
const ts = require("gulp-typescript")
const tsProject = ts.createProject("tsconfig.json")
const pckg = require("./package.json")
const noop = require("lodash/noop")
const path = require("path")
const fs = require("fs")
const webpack = require("webpack")
const chance = require("chance")()
const pathOfConf = path.join(__dirname, ".env")
let { parsed } = require("dotenv").config()
const flatMap = require("lodash/flatMap")
// utils functions
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const isProduction = () => process.env.NODE_ENV === "production"
const serializeEnv = obj =>
  flatMap(obj, (v, k) => `${k.toString()}="${v.toString()}"`)
// const replaceEnv = (obj, name, val) => {}

let isServerRunning = false

gulpSass.compiler = require("node-sass")

gulp.task("clean", function clean() {
  return gulp
    .src(["./public/css", "./public/js", "./dist"], {
      read: false,
      allowEmpty: true
    })
    .pipe(gulpClean())
})
const webpackConfig = {
  entry: "./client/client.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "public/js/")
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        loader: ["style-loader", "css-loader"]
      }
    ]
  }
}
gulp.task("clientjs", function(done) {
  if (!isProduction()) {
    webpackConfig.devtool = "eval-source-map"
    webpackConfig.mode = "development"
  }
  browserSync.notify("Reloading JS")
  webpack(webpackConfig, function() {
    browserSync.reload("*.js")
    done()
  })
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
      done()
      if (isServerRunning) {
        require("dotenv").config()
        pm2.reload(pckg.name, async function() {
          browserSync.notify("RELOADING JS Files")
          await sleep(500)
          browserSync.reload()
        })
      }
    })
})

gulp.task("watchSass", function() {
  return gulp.watch("./scss/**/*.scss", gulp.parallel("sass"))
})
gulp.task("watchClient", function() {
  return gulp.watch("./client/**/*.js").on("change", gulp.parallel("clientjs"))
})

gulp.task("watchHbs", function() {
  gulp.watch("./views/**/*.hbs").on("change", function() {
    pm2.reload(pckg.name, async function() {
      browserSync.notify("RELOADING Hbs")
      await sleep(500)
      browserSync.reload()
      // done()
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
      ui: false,
      port: 3000,
      proxy: `https://localhost:${parsed.PORT || 8080}`
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
        env: parsed
      },
      function(err) {
        if (err != null) console.error(err)
        isServerRunning = true
        pm2.streamLogs("all", 0)
      }
    )
  })
})

gulp.task("renew-salt", function(done) {
  parsed.SECRET = `${chance.guid()}#@${chance.hash()}`
  fs.writeFileSync(pathOfConf, serializeEnv(parsed).join("\n"))
  done()
})

gulp.task(
  "dev",
  gulp.series(
    "clean",
    gulp.parallel("sass", "tsc", "clientjs"),
    gulp.parallel("server", "watchSass", "watchTsc", "watchClient", "watchHbs")
  )
)

gulp.task(
  "build",
  gulp.series(
    d => {
      process.env.NODE_ENV = "production"
      d()
    },
    "clean",
    "tsc",
    "sass",
    "clientjs"
  )
)

process.once("SIGINT", function() {
  console.log("Exitting Gulp...")
  pm2.stop(pckg.name, function(err) {
    if (err) return console.error(err)
    console.log("closed pm2")
    process.exit("SIGTERM")
  })
})

process.once("SIGTERM", function() {
  pm2.stop(pckg.name, function(err) {
    if (err) return console.error(err)
    console.log("closed pm2")
  })
})
