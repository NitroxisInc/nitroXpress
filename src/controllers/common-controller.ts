import * as express from "express"
import * as _ from "lodash"
import * as mongoose from "mongoose"
import { Roles } from "../models/user"
import { IModels } from "../models/models"
import { authorizeByRole } from "../core/authorization"
import { GenerateResp, Reason } from "../core/common-errors"
import * as asyncHandler from "express-async-handler"
import sendMail from "../core/mail"
import axios from "axios"

require("dotenv").config()
// import * as mongoose from 'mongoose'

export class Controller {
  private models: IModels
  private Platform: mongoose.Model<any>
  private Geo: mongoose.Model<any>

  constructor(Models: IModels) {
    // do nothing
    this.models = Models
    this.Platform = this.models.PlatformModel
  }

  getRouter(): express.Router {
    const router: express.Router = express.Router()

    router.get("/platform", this.getPlatformSettings) // get plaform settings

    router.put("/platform", authorizeByRole(Roles.admin), this.updatePlatformSettings) // update the platform settings from admin panel
    router.post("/contact-us", this.contactUs)

    return router
  }

  //#region Controller Functions
  contactUs = asyncHandler(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // contact-us
    const validateToken = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_KEY || "NOKEY"}&response=${req.body.captchatoken}`)

    log.info(req.body)
    log.info(validateToken.data)

    if (validateToken.data.success) {
      sendMail(
        "test@nitroxis.com",
        `Contact Submission from ${req.body.name}`,
        `
        <h1>Contact Us Form Submission From</h1>
        <br><br>
        Email: ${req.body.email}<br>
        Name: ${req.body.name}<br>
        Message:<br>${req.body.message}
      `
      )
      res.send("OK")
    } else {
      res.sendStatus(403)
    }
  })

  getPlatformSettings = asyncHandler(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let platform = await this.Platform.findOne({}, "-_id -id")
    res.json(GenerateResp(platform, Reason.success))
  })

  updatePlatformSettings = asyncHandler(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let objToUpdate: any = {}

    if (req.body["privacy-policy-link"]) objToUpdate["privacy-policy-link"] = req.body["privacy-policy-link"]
    if (req.body["terms-link"]) objToUpdate["terms-link"] = req.body["terms-link"]
    if (req.body.slides) objToUpdate.slides = req.body.slides

    this.Platform.findOneAndUpdate({}, objToUpdate, {
      new: true,
      upsert: true
    })
      .then(resp => {
        if (resp) {
          return res.send(GenerateResp(resp, Reason.updated))
        }
        return res.status(400).send(GenerateResp("Can't get the Platform Record", Reason.dbError))
      })
      .catch(err => {
        log.error(err)
        return res.status(400).send(GenerateResp(err, Reason.dbError))
      })
  })

  //#endregion
}
