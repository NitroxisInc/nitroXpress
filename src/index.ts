import * as _ from "lodash"
import * as express from "express"
import * as bodyParser from "body-parser"
import * as morgan from "morgan"
import * as mongoose from "mongoose"
import * as jwt from "jsonwebtoken"
import * as methodOverride from "method-override"

import BaseRouter from "./routes/base"
import { GenerateResp, Reason } from "./core/common-errors"
import * as fs from "fs"
import * as https from "https"
import * as http from "http"
import log from "./log"
import * as uniqueValidator from "mongoose-unique-validator"
import * as path from "path"
import * as mime from "mime"
import * as exphbs from "express-handlebars"
import ntxErrorHandler from "./core/error-handler"
import * as cookieParser from "cookie-parser"
import * as expressSession from "express-session"
const MongoDBStore = require("connect-mongodb-session")(expressSession)

// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// import
require("source-map-support").install()

export class Server {
  public app: express.Application

  constructor() {
    this.app = express()
    this.loadConfig()

    this.load3rdPartyMiddlewares()
    this.loadDb()

    this.loadRoutes(this.app)
    this.setUpErrorHandler(this.app)
  }

  loadConfig() {
    // support for .env files
    require("dotenv").config()
    this.app.set("superSecret", process.env.SECRET)
    this.app.set("views", path.join(__dirname, "../views"))

    this.app.engine(
      "hbs",
      exphbs({
        defaultLayout: "main",
        layoutsDir: path.join(__dirname, "../views/layouts"),
        extname: ".hbs",
        helpers: {
          equal(lvalue, rvalue, options) {
            if (arguments.length < 3) throw new Error("Handlebars Helper equal needs 2 parameters")
            if (lvalue != rvalue) {
              return options.inverse(this)
            } else {
              return options.fn(this)
            }
          },
          if_even(conditional, options) {
            if (conditional % 2 == 0) {
              return options.inverse(this)
            } else {
              return options.fn(this)
            }
          }
        }
      })
    )
    this.app.set("view engine", "hbs")
    this.app.set("json spaces", 2)
    this.app.set("trust proxy", true)
    this.app.set("trust proxy", "loopback")
  }

  load3rdPartyMiddlewares() {
    // allow for X-HTTP-METHOD-OVERRIDE header
    this.app.use(methodOverride())
    // express flash setup
    this.app.use(cookieParser(process.env.SECRET))
    const store = new MongoDBStore({
      uri: process.env.DB_CONNECTION_STRING,
      databaseName: process.env.DB_NAME || "nitrodb",
      collection: "sessions"
    })
    this.app.use(
      expressSession({
        cookie: { maxAge: 60000 },
        saveUninitialized: true,
        store,
        resave: true,
        secret: process.env.SECRET
      })
    )

    // use body parser so we can get info from POST and/or URL parameters
    this.app.use(bodyParser.urlencoded({ extended: false }))
    this.app.use(
      bodyParser.json({
        limit: "10MB",
        verify(req, res, buf) {
          // hack for github to convert all json body in json
          if (req.url.toLowerCase().includes("webhook")) {
            (req as any).rawBody = buf.toString()
          }
        }
      })
    )
    this.app.use(bodyParser.text())
    // requested by stripe
    // this.app.use(bodyParser.raw({type: "*/*"}))
    this.app.use(this.setOwnHeader)
  }

  setUpErrorHandler(app: express.Application) {
    if (process.env.NODE_ENV === "dev") {
      // error Handler
      app.use(morgan("dev"))
    }
    app.use(ntxErrorHandler)
  }

  setOwnHeader(req: express.Request, res: express.Response, next: express.NextFunction) {
    res.header("Server", "NitroNode")
    res.header("X-Powered-By", "NitroNode")
    res.setTimeout(_.parseInt(process.env.TIMEOUT || "20000"), () => {
      res.status(504).send(GenerateResp("Timeout -> nothing to show", Reason.timeout))
    })
    // let type = mime.lookup(path)
    // if (!res.getHeader('content-type')) {
    // let charset = mime.charsets.lookup(type)
    // }
    next()
  }

  loadDb() {
    mongoose.plugin(uniqueValidator)
    mongoose.set("useNewUrlParser", true)
    mongoose.set("useFindAndModify", false)
    mongoose.set("useCreateIndex", true)
    mongoose.connect(
      process.env.DB_CONNECTION_STRING,
      {
        // autoIndex: process.env.NODE_ENV === 'dev',
        dbName: process.env.DB_NAME || "nitrodb",
        useNewUrlParser: true,
        autoIndex: true,
        useCreateIndex: true
      },
      err => {
        if (err) {
          log.error(err)
          this.gracefulExit()
          // this.loadDb()
        }
        if (process.env.NODE_ENV == "development") {
          // here we're running bootstrap DB scrips
          require("./core/bootstrap-db").default()
        }
        log.info("connected to the server")
      }
    )
    // If the Node process ends, close the Mongoose connection
    process.on("SIGINT", this.gracefulExit).on("SIGTERM", this.gracefulExit)
  }
  gracefulExit() {
    mongoose.connection.close(function() {
      log.info("Mongoose default connection is disconnected through app termination")
      process.exit(0)
    })
  }

  loadRoutes(app: express.Application) {
    app.use(
      "/public",
      express.static(__dirname + "/../public", {
        setHeaders(res, path) {
          log.info(path)
          res.setHeader("content-type", mime.getType(path))
        }
      })
    )

    app = new BaseRouter(app).initApp()

    app.use("/", (req, res, next) => {
      res.header("Content-type", "text/html")
      res.status(404).render("404", {
        layout: "plain",
        reqUrl: req.originalUrl
      })
    })
  }

  startServer() {
    // kicking off: Server
    if (process.env.NODE_ENV === "development") {
      let httpsPort = process.env.NODE_ENV !== "development" ? 443 : process.env.PORT || 42010
      let httpPort = process.env.NODE_ENV !== "development" ? 80 : 8080
      let httpServer = express()
      httpServer
        .get("*", function(req: express.Request, res: express.Response) {
          res.redirect("https://localhost:" + httpsPort + req.url)
        })
        .listen(httpPort)

      // setting up https server
      const privateKey = fs.readFileSync(path.resolve(__dirname, "../localhost.key")).toString()
      const certificate = fs.readFileSync(path.resolve(__dirname, "../localhost.crt")).toString()
      const credentials: https.ServerOptions = {
        key: privateKey,
        cert: certificate,
        passphrase: "123456",
        rejectUnauthorized: true
      }

      https.createServer(credentials, this.app).listen(httpsPort, async function() {
        log.info(`Server started at https://localhost:${httpsPort}`)
      })
    } else {
      // default port for the server
      this.app.listen(process.env.PORT)
    }
  }
}
try {
  global.log = log
  let server = new Server()
  server.startServer()
} catch (exception) {
  log.error(exception)
}
