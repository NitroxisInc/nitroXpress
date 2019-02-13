import * as express from "express"
import * as mongoose from "mongoose"
import { IModels } from "../models/models"
import { GenerateResp, Reason } from "../core/common-errors"

export default class BaseRouter {
  private Models: IModels
  private App: express.Application

  constructor(App: express.Application, Models: IModels) {
    this.App = App
    this.Models = Models
  }

  public initApp = (): express.Application => {
    const App: express.Application = this.App
    const MyRouter: express.Router = express.Router()

    MyRouter.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      // res.header("Access-Control-Allow-Origin", "*")
      // res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE")
      // res.header("Access-Control-Allow-Headers", "content-type,authorization,accept")
      res.header("Content-type", "text/html")
      if ("OPTIONS" === req.method) {
        return res.sendStatus(200)
      } else {
        next()
      }
      // next()
    })

    MyRouter.get("", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.render("page", {
        title: "Welcome to NitroXpress"
      })
    })

    MyRouter.use(
      "/user",
      new (require("../controllers/user-controller")).Controller(this.Models).getRouter()
    )
    MyRouter.use(
      "/",
      new (require("../controllers/common-controller")).Controller(this.Models).getRouter()
    )

    App.use("/", MyRouter)
    return App
  }
}
