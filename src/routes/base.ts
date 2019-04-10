import * as express from "express"
import * as cors from "cors"

export default class BaseRouter {
  private App: express.Application

  constructor(App: express.Application) {
    this.App = App
  }

  public initApp = (): express.Application => {
    const App: express.Application = this.App
    const MyRouter: express.Router = express.Router()

    MyRouter.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.locals.errors = req.session.errors
      delete req.session.errors

      res.locals.messages = req.session.messages
      delete req.session.messages

      next()
    })

    MyRouter.use("/", new (require("../controllers/common-controller")).Controller().getRouter())

    // use cors for api requests
    // MyRouter.use("/api", cors(), new (require("../controllers/admin-controller")).Controller().getRouter())

    App.use("/", MyRouter)
    return App
  }
}
