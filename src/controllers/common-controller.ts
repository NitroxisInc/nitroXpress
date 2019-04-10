import * as express from "express"
import * as _ from "lodash"
import * as asyncHandler from "express-async-handler"
import { hashPassword, encrypt } from "../core/common"
import myLanguage from "../language"
import * as csurf from "csurf"
import UserModel, { Roles } from "../models/user"
import { body, validationResult } from "express-validator/check"
import { authorizeByRoleElseRedirect, signJwt, ifLoggedInThenRedirect } from "../core/authorization"

require("dotenv").config()
// import * as mongoose from 'mongoose'

export class Controller {
  getRouter(): express.Router {
    const router: express.Router = express.Router()
    const csrfProtection = csurf({ cookie: true })

    router.get("/", ifLoggedInThenRedirect("/dashboard"), csrfProtection, this.login)
    router.post("/do-login", csrfProtection, ...this.doLogin)
    router.get("/dashboard", csrfProtection, authorizeByRoleElseRedirect("/", Roles.admin), (req, res) => {
      res.send(req.session)
    })

    return router
  }

  login = asyncHandler(async function(req: express.Request, res: express.Response) {
    res.render("login", {
      layout: "plain",
      // _session: JSON.stringify({ ...req.session }),
      csrfToken: req.csrfToken()
    })
  })

  //#region Controller Functions

  doLogin = [
    [body("email", myLanguage.invalidEmail).isEmail(), body("password", myLanguage.invalidPassword)],
    asyncHandler(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // POST do-login
      try {
        const userObj = await UserModel.findOne({
          mobile: req.body.mobile,
          password: hashPassword(req.body.password)
        }).select("-password")

        if (!userObj) throw myLanguage.wrongUserCredentials

        req.session.user = { ...userObj.toJSON() }
        console.log(req.session.user)

        req.session.messages = [...(req.session.messages || []), myLanguage.successfullyLoggedin]
        req.session.token = signJwt({
          _b: userObj._id,
          _a: encrypt(hashPassword(req.body.password))
        })
        req.session.save(() => {
          res.redirect("/dashboard")
        })
      } catch (e) {
        req.session.errors = [...(req.session.errors || []), myLanguage.wrongUserCredentials]
        req.session.save(() => {
          res.redirect("/")
        })
      }
    })
  ]

  //#endregion
}
