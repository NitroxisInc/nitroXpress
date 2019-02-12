import * as express from "express"
import * as _ from "lodash"
import * as mongoose from "mongoose"
import { Roles, RolesAll } from "../models/user"
import { IModels } from "../models/models"
import { encrypt, decrypt, hashPassword, randPassword, convertEnumToStringArray, generateToken } from "../core/common"
import { signJwt, authorizeByRole } from "../core/authorization"
import { IResponseError } from "../interfaces"
import { GenerateResp, Reason, StatusCode } from "../core/common-errors"
import sendMail from "../core/mail"
import * as jwt from "jsonwebtoken"
import Validator from "../core/validator"
import { uploadSingle } from "../core/uploader"
import * as asyncHandler from "express-async-handler"

require("dotenv").config()
// import * as mongoose from 'mongoose'

export class Controller {

  private models: IModels
  private User
  private router: express.Router

  constructor(Models: IModels) {
    // do nothing
    this.models = Models
    this.User = this.models.UserModel
  }

  // ROOT /user to login any type of user
  getRouter = (): express.Router => {
    // reset router before sending if already contains some routes (in case)
    this.router = express.Router()

    ///  CALLS
    this.router.post("/login", this.loginFunction)
    this.router.post("/forgot-password", this.forgotPassword)
    this.router.post("/confirm-forgot-password", this.changePasswordAfterForgot)
    this.router.post("/", this.registerUser)

    // LOGGEDIN CALLS
    this.router.get("/profile", authorizeByRole(...RolesAll), this.getProfile) // Get profile of the logged in customer
    this.router.get("/profile/:id", authorizeByRole(...RolesAll), this.getPartnerProfile) // Get profile of the logged in customer
    this.router.put("/profile", authorizeByRole(...RolesAll), this.updateProfile) // update profile of loggedin user, return new token
    this.router.put("/password", authorizeByRole(...RolesAll), this.changePassword) // Update password of loggedin user, return new token
    

    /// ADMIN CALLS
    this.router.get("/", authorizeByRole(...RolesAll), this.getAllUsers) // Get All Users
    this.router.delete("/:id", authorizeByRole(Roles.admin), this.deleteUserByAdmin) // remove specific user from DB

    return this.router
  }

  //#region Controller Functions
  loginFunction = asyncHandler( async (req: express.Request, res: express.Response) => {
    if (!req.body.email) {
      throw `'email' is required to login @${Reason.missingFields} #${StatusCode.auth}`
    }
    if (!req.body.password) {
      throw `'password' is required to login @${Reason.missingFields} #${StatusCode.auth}`
    }

    let userObj = await this.User.findOne({email: req.body.email || ""})
      if (userObj) {
      const hashedPassword = hashPassword(req.body.password)

      if (hashedPassword !== userObj.password) { // password matched the DB record 
        throw `You have entered a wrong username and password combination. Please, try again @${Reason.authFailed} #${StatusCode.auth}`
      }

      const toSignObj = {
        _a: encrypt(userObj.password),
        _b: userObj._id,
        type: userObj.type
      }
      
      let signedJwtToken = signJwt(toSignObj)
      return res.json(GenerateResp({token: signedJwtToken}, Reason.loggedIn))
    }
    else {
      throw `No user is found for the given parameters @${Reason.noData} #${StatusCode.auth}`
    }
    
  })

  forgotPassword = (req: express.Request, res: express.Response) => {
    if (!req.body.email) {
      return res.status(400).send(GenerateResp("required fields are missing for this request", Reason.missingFields))
    }
    
    // find the email for any given user in the email password
    this.User.findOne({email: req.body.email}).exec()
    .then(user => {
      if (user) {
        // generate the reset token and then send the email to the given user
        const resetToken = randPassword(8)
        // hash the resetToken and then save the document back in db
        this.User.findByIdAndUpdate(user._id, {resetToken: hashPassword(resetToken)}).exec()
        .then(resp => {
          // send mail with reset token to the user
          log.info(resetToken)
          const currentDate = (new Date()).toLocaleString()
          sendMail(user.email, "Request Forgot Password", `
            <p>Dear ${user.profile.name},</p>
            <p>You have requested to reset your password</p>
            <p>Below is the code, which you can use to reset the password for the user</p>
            <h2>${resetToken}</h2>
            <p>Please, ignore this message if you have recieved this message by mistake</p>
            <p>This message is sent to you on ${currentDate}</p>
          `)

          return res.send(GenerateResp("Mail is sent to the registered email address", Reason.success))

        })
        .catch(err => {
          log.error(err)
          return res.status(400).send(GenerateResp(err, Reason.dbError))
        })
      }
      else {
        return res.status(400).send(GenerateResp("No user found with the given data", Reason.noData))  
      }
    })
    .catch(err => {
      log.error(err)
      return res.status(400).send(GenerateResp(err, Reason.dbError))
    })

  }

  changePasswordAfterForgot = asyncHandler( async(req: express.Request, res: express.Response) => {
    if (!req.body.email && !req.body.resetToken) {
      throw `required fields are missing for this request #${StatusCode.badRequest} @${Reason.missingFields}`
    }
    if (!req.body.password) {
      throw `required fields are missing for this request #${StatusCode.badRequest} @${Reason.missingFields}`
    }
    
    // find the email for any given user in the email password
    let checkUserWithEmail = await this.User.findOne({email: req.body.email}, "resetToken email name")
    if (checkUserWithEmail) {

      // hash the resetToken
      const resetTokenToVerify = hashPassword(req.body.resetToken)
      // log.info(resetTokenToVerify)
      // verify if the resetToken is valid
      if (resetTokenToVerify === checkUserWithEmail.resetToken) {
        // generate the hashedPasword from the password provided in the bod
        let user = await this.User.findByIdAndUpdate(checkUserWithEmail._id, {password: hashPassword(req.body.password), resetToken: undefined})
        const currentDate = (new Date()).toLocaleString()
        sendMail(user.email, "Password Reset Success", `
          <p>Dear ${user.profile.name},</p><br>
          <p>Your password is changed successfully, after verification</p>
          <p>If this is the mistake then you have to contact support@isvmarket.com</p>
          <p>This message is sent to you on ${currentDate}</p>
        `)

        return res.send(GenerateResp("Your password is changed successfully, after verification", Reason.success))

      }
      else {
        throw `Invalid Reset Token to Reset the password #${StatusCode.badRequest} @${Reason.requiredOrInvalid}`
      }
    }
    else {
      throw `No user found with the given data #${StatusCode.badRequest} @${Reason.noData}`
    }

  })

  getAllUsers = asyncHandler(async (req: express.Request, res: express.Response) => {

    // never return admin type users
    const restrictedTypes = [Roles.admin]

    const query: any = {
      type: {
        $nin: restrictedTypes
      },
      _id: {
        $ne: req.user._id
      }
    }

    if (req.user.type !== Roles.admin) {
      query["profile.name"] = {
        $exists: true
      }
      query["profile.company"] = {
        $exists: true
      }
    }

    let users = await this.User.find(query, "email type profile")
    return res.json(GenerateResp(users, Reason.success))
  })

  getProfile =  asyncHandler(async (req: express.Request, res: express.Response) => {
      let user = await this.User.findOne({_id: req.user._id}, "email type profile")
      return res.json(GenerateResp(user, Reason.success))
  })
  
  getPartnerProfile =  asyncHandler(async (req: express.Request, res: express.Response) => {
    let user = await this.User.findOne({_id: req.params.id}, "type profile")
    return res.json(GenerateResp(user, Reason.success))
  })

  registerUser = asyncHandler( async (req: express.Request, res: express.Response) => {
    
    let newUser = new this.User()
    if (
      _.hasIn(req.body, "email") &&
      _.hasIn(req.body, "password")
    ) {

    if (req.body.email) {

      if (!Validator.email(req.body.email)) {
        return res.status(400).json(GenerateResp("Invalid email provided", Reason.requiredOrInvalid, "email"))
      }
      newUser.email = req.body.email

    }
    if (req.body.password) {

      if (!Validator.password(req.body.password)) {
        return res.status(400).json(GenerateResp("Password is invalid. Password may only contain alpha numeric, '-' and '.' characters", Reason.requiredOrInvalid, "password"))
      }
      newUser.password = req.body.password

    }
    if (req.body.profile)
      newUser.profile = req.body.profile

    
    newUser.type = Roles[Roles.normalUser] // by default, the user should be normal

    // hash the password before saving
    newUser.password = hashPassword(newUser.password)

    newUser.save()
      .then(resp => {

        const toSignObj = {
          _a: encrypt(hashPassword(req.body.password)),
          _b: resp._id,
          type: resp.type,
          profile: resp.profile
        }
        let signedJwtToken = signJwt(toSignObj)

        return res.json(GenerateResp({token: signedJwtToken}, Reason.inserted))
      })
      .catch(err => {
        if (err.name === "ValidationError") {
          let errors: Array<IResponseError> = []
          _.each(err.errors, err => {
            errors.push(GenerateResp(err.message, Reason.requiredOrInvalid, err.path))
          })
          return res.status(400).json(GenerateResp(errors, Reason.dbValidationError))
        }
        else {
          return res.status(400).json(GenerateResp(err, Reason.dbError))
        }
      })
    }
    else {
      // all of the fields are not given
      return res.status(400).json(GenerateResp("Email & password is required for this request", Reason.missingFields))
    }
  })

  updateProfile = asyncHandler(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    
    uploadSingle("thumbnail")(req, res, async () => {
      try {
        let userObjToUpdate = await this.User.findOne({_id: req.user._id})
        userObjToUpdate.profile.set(req.body)
        if (req.file) {
          userObjToUpdate.profile.profilePicture = `/uploads/${req.file.filename}`
        }

      let resp = await userObjToUpdate.save()

        if (!!userObjToUpdate) {
          const toSignObj = {
            _a: encrypt(userObjToUpdate.password),
            _b: req.user._id,
            type: userObjToUpdate.type,
            profile: userObjToUpdate.profile
          } as any
          
          let signedJwtToken = signJwt(toSignObj)
          return res.json(GenerateResp({...resp, token: signedJwtToken}, Reason.success))
        }
        else {
          throw `'Auth' is missing`
        }
      }
      catch (e) {
        res.status(400).json(GenerateResp(e, Reason.dbError))
      }
    })
  })

  changePassword = (req: express.Request, res: express.Response) => {
    if (!!req.body.password) {
      // Randomly generate the password and update the DB
      const rp = hashPassword(req.body.password)
      this.User.findByIdAndUpdate(req.user._id, {password: rp}).then(resp => {
        if (resp) {
          // updated the password
          log.info("Password is changed")
          const toSignObj = {
            _a: encrypt(rp),
            _b: req.user._id,
            type: resp.type,
            profile: resp.profile
          }
          
          let signedJwtToken = signJwt(toSignObj)
          return res.json(GenerateResp({token: signedJwtToken}, Reason.success))
        }
        else {
          return res.status(400).json(GenerateResp(resp, Reason.dbError))
        }
        // TODO: email the user as well the new password
      })
      .catch(err => {
        return res.status(400).json(GenerateResp(err, Reason.requiredOrInvalid))
      })
    }
    else {
      return res.status(400).json(GenerateResp("Password is required for this request", Reason.missingFields))
    }
  }

  deleteUserByAdmin = (req: express.Request, res: express.Response) => {
    if (req.params.id) {
      this.User.findByIdAndRemove({
        _id: req.params.id,
        type: { $ne: Roles[Roles.admin] }
      })
        .then(resp => {
          if (resp) {
            res.status(200)
            res.json(GenerateResp("Successfuly Deleted", Reason.deleted))
          }
          else {
            res.status(400)
            res.json(GenerateResp("Unable to delete the user", Reason.operationFailed))
          }
        })
        .catch(err => {
          // log error to the log
          log.error(err)
          res.status(400)
          res.json(GenerateResp(err, Reason.dbError))
        })
    }
    else {
      res.status(400).json(GenerateResp("id field is required for this request", Reason.missingFields))
    }
  }

  //#endregion

}
